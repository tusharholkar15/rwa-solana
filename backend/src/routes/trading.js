const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Portfolio = require("../models/Portfolio");
const TaxLot = require("../models/TaxLot");
const { validateTradeRequest } = require("../middleware/validation");
const { requireWalletSignature } = require("../middleware/authMiddleware");
const { v4: uuidv4 } = require("uuid");
const transferAgentService = require("../services/transferAgentService");
const auditService = require("../services/auditService");

const mongoose = require("mongoose");
const redis = require("../config/redis");

/**
 * POST /api/buy
 * Execute a buy order for fractional shares
 * Wrapped in MongoDB session for ACID compliance
 */
router.post("/buy", requireWalletSignature, validateTradeRequest, async (req, res) => {
  const MAX_RETRIES = 3;
  let attempt = 1;
  while (attempt <= MAX_RETRIES) {
    let session = null;
    if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      const { assetId, shares, walletAddress } = req.body;
      const cacheKey = `portfolio:${walletAddress}`;

      // 1. Validate asset (with session)
      const asset = await Asset.findById(assetId).session(session);
      if (!asset) {
        if (session) await session.abortTransaction();
        return res.status(404).json({ error: "Asset not found" });
      }
      
      if (!asset.isActive || asset.status !== "active") {
        if (session) await session.abortTransaction();
        return res.status(400).json({ error: "Asset is not available for trading" });
      }

      if (asset.availableSupply < shares) {
        if (session) await session.abortTransaction();
        return res.status(400).json({
          error: "Insufficient supply",
          available: asset.availableSupply,
        });
      }

      // 2. Validate/Create user (with session)
      let user = await User.findOne({ walletAddress }).session(session);
      
      // Auto-approve in development for testing
      if (process.env.NODE_ENV === "development" && user && user.kycStatus !== "approved") {
        user.kycStatus = "approved";
        user.isWhitelisted = true;
        await user.save({ session });
      }

      if (!user || user.kycStatus !== "approved") {
        if (session) await session.abortTransaction();
        return res.status(403).json({ error: "KYC verification required" });
      }
      
      if (process.env.NODE_ENV === "development") {
        if (!user) {
          user = new User({
            walletAddress,
            name: "Dev User",
            email: "dev@example.com",
            kycStatus: "approved",
            isWhitelisted: true,
          });
          await user.save({ session });
        } else if (user.kycStatus !== "approved") {
          user.kycStatus = "approved";
          user.isWhitelisted = true;
          await user.save({ session });
        }
      }

      if (!user || user.kycStatus !== "approved") {
        if (session) await session.abortTransaction();
        return res.status(403).json({ error: "KYC verification required" });
      }

      // 3. Update Financials
      const totalCost = shares * asset.pricePerToken;
      const fee = Math.floor(totalCost * 0.001);

      asset.availableSupply -= shares;
      await asset.save({ session });

      // 4. Update Portfolio
      let portfolio = await Portfolio.findOne({ walletAddress }).session(session);
      if (!portfolio) {
        portfolio = new Portfolio({
          walletAddress,
          holdings: [],
          totalValue: 0,
          totalInvested: 0,
        });
      }

      const existingHolding = portfolio.holdings.find(
        (h) => h.assetId.toString() === assetId
      );

      if (existingHolding) {
        const existingValue = existingHolding.shares * existingHolding.avgBuyPrice;
        const newValue = shares * asset.pricePerToken;
        const totalShares = existingHolding.shares + shares;
        existingHolding.avgBuyPrice = (existingValue + newValue) / totalShares;
        existingHolding.shares = totalShares;
        existingHolding.totalInvested += totalCost;
        existingHolding.lastTransactionAt = new Date();
      } else {
        portfolio.holdings.push({
          assetId: asset._id,
          shares,
          avgBuyPrice: asset.pricePerToken,
          totalInvested: totalCost,
          firstPurchaseAt: new Date(),
          lastTransactionAt: new Date(),
        });
      }

      portfolio.totalInvested += totalCost;
      portfolio.totalValue = portfolio.holdings.reduce((total, h) => {
        return total + h.shares * h.avgBuyPrice;
      }, 0);

      await portfolio.save({ session });

      // 5. Record Transaction & TaxLot
      const transaction = new Transaction({
        txHash: `sim_${uuidv4()}`,
        walletAddress,
        assetId: asset._id,
        assetName: asset.name,
        type: "buy",
        shares,
        pricePerToken: asset.pricePerToken,
        totalAmount: totalCost,
        fee,
        status: "confirmed",
      });
      await transaction.save({ session });

      const taxLot = new TaxLot({
        walletAddress,
        assetId,
        sharesTotal: shares,
        sharesRemaining: shares,
        purchasePrice: asset.pricePerToken,
        transactionId: transaction._id,
        purchaseDate: transaction.createdAt,
      });
      await taxLot.save({ session });

      user.totalTransactions += 1;
      user.totalInvested += totalCost;
      await user.save({ session });

      // Institutional Audit Log (Atomic with Transaction)
      await auditService.logEvent({
        eventType: "trade_executed",
        walletAddress,
        details: {
          assetId,
          shares,
          type: "buy",
          totalCost,
          txHash: transaction.txHash
        },
        performedBy: walletAddress
      }, session);

      // COMMIT ALL DB CHANGES
      if (session) {
        await session.commitTransaction();
      }

      // Invalidate Cache after Commit
      await redis.del(cacheKey);
      const keys = await redis.keys("assets:list:*");
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      // Backend background sync (non-transactional)
      transferAgentService.syncTransfer(
        asset._id,
        "ISSUER_TREASURY",
        walletAddress,
        shares
      ).catch(err => console.error("[Background] TA Sync Failed:", err.message));

      return res.json({
        message: "Purchase successful",
        transaction: { id: transaction._id, shares, totalCost },
      });
    } catch (error) {
      if (session) {
        await session.abortTransaction();
      }
      
      if (error.hasLabels && error.hasLabels('TransientTransactionError') && attempt < MAX_RETRIES) {
        console.warn(`[MongoDB] TransientTransactionError on /buy. Retrying attempt ${attempt}...`);
        attempt++;
        await new Promise(r => setTimeout(r, attempt * 150));
        continue;
      }

      console.error("Buy Transaction Rolled Back:", error);
      return res.status(500).json({ 
        error: "Transaction failed. Please try again.",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }
});

/**
 * POST /api/sell
 * Execute a sell order for fractional shares
 */
router.post("/sell", requireWalletSignature, validateTradeRequest, async (req, res) => {
  const MAX_RETRIES = 3;
  let attempt = 1;
  while (attempt <= MAX_RETRIES) {
    let session = null;
    if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      const { assetId, shares, walletAddress } = req.body;
      const cacheKey = `portfolio:${walletAddress}`;

      // 1. Validate asset (with session)
      const asset = await Asset.findById(assetId).session(session);
      if (!asset) {
        if (session) await session.abortTransaction();
        return res.status(404).json({ error: "Asset not found" });
      }

      // 2. Validate user (with session)
      let user = await User.findOne({ walletAddress }).session(session);
      if (process.env.NODE_ENV === "development" && user && user.kycStatus !== "approved") {
        user.kycStatus = "approved";
        user.isWhitelisted = true;
        await user.save({ session });
      }

      if (!user || user.kycStatus !== "approved") {
        if (session) await session.abortTransaction();
        return res.status(403).json({ error: "KYC verification required" });
      }

      // 3. Validate Portfolio & Holding (with session)
      const portfolio = await Portfolio.findOne({ walletAddress }).session(session);
      if (!portfolio) {
        if (session) await session.abortTransaction();
        return res.status(400).json({ error: "No portfolio found" });
      }

      const holding = portfolio.holdings.find(
        (h) => h.assetId.toString() === assetId
      );

      if (!holding || holding.shares < shares) {
        if (session) await session.abortTransaction();
        return res.status(400).json({
          error: "Insufficient shares",
          owned: holding ? holding.shares : 0,
        });
      }

      // 4. Calculate P&L using FIFO Tax Lots (with session)
      const activeLots = await TaxLot.find({
        walletAddress,
        assetId,
        status: "active",
        sharesRemaining: { $gt: 0 },
      }).sort({ purchaseDate: 1 }).session(session); 

      let remainingToSell = shares;
      let totalCostBasisOfSoldShares = 0;

      for (const lot of activeLots) {
        if (remainingToSell <= 0) break;

        const sharesToConsumeInLot = Math.min(lot.sharesRemaining, remainingToSell);
        totalCostBasisOfSoldShares += sharesToConsumeInLot * lot.purchasePrice;
        
        lot.sharesRemaining -= sharesToConsumeInLot;
        remainingToSell -= sharesToConsumeInLot;

        if (lot.sharesRemaining === 0) {
          lot.status = "sold";
        }
        await lot.save({ session });
      }

      if (remainingToSell > 0) {
        // Fallback if lots are somehow out of sync with portfolio (should not happen)
        totalCostBasisOfSoldShares += remainingToSell * holding.avgBuyPrice;
      }

      const totalProceeds = shares * asset.pricePerToken;
      const fee = Math.floor(totalProceeds * 0.001); 
      const realizedPnl = totalProceeds - totalCostBasisOfSoldShares;

      // 5. Update asset supply (with session)
      asset.availableSupply += shares;
      await asset.save({ session });

      // Update portfolio
      holding.shares -= shares;
      holding.lastTransactionAt = new Date();

      // Remove holding if zero shares
      if (holding.shares === 0) {
        portfolio.holdings = portfolio.holdings.filter(
          (h) => h.assetId.toString() !== assetId
        );
      }

      portfolio.totalValue = portfolio.holdings.reduce((total, h) => {
        return total + h.shares * h.avgBuyPrice;
      }, 0);
      portfolio.totalRealizedPnl = (portfolio.totalRealizedPnl || 0) + realizedPnl;

      await portfolio.save({ session });

      // 6. Record Transaction & Invalidate Cache
      const transaction = new Transaction({
        txHash: `sim_${uuidv4()}`,
        walletAddress,
        assetId: asset._id,
        assetName: asset.name,
        type: "sell",
        shares,
        pricePerToken: asset.pricePerToken,
        totalAmount: totalProceeds,
        fee,
        status: "confirmed",
      });
      await transaction.save({ session });

      // Update user stats (with session)
      user.totalTransactions += 1;
      await user.save({ session });

      // Institutional Audit Log (Atomic with Transaction)
      await auditService.logEvent({
        eventType: "trade_executed",
        walletAddress,
        details: {
          assetId,
          shares,
          type: "sell",
          totalProceeds,
          realizedPnl,
          txHash: transaction.txHash
        },
        performedBy: walletAddress
      }, session);

      // 7. Commit Transaction & Post-Commit Actions
      if (session) {
        await session.commitTransaction();
      }

      // Invalidate Cache after Commit
      await redis.del(cacheKey);
      const keys = await redis.keys("assets:list:*");
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      // Trigger async Transfer Agent integration (Non-blocking)
      transferAgentService.syncTransfer(
        asset._id,
        walletAddress,
        "REdemption_TREASURY", // Simulated secondary redemption
        shares
      ).catch(err => console.error("[Background] TA Sync Failed:", err.message));

      return res.json({
        message: "Sale successful",
        transaction: { id: transaction._id, shares, totalProceeds, realizedPnl },
      });
    } catch (error) {
      if (session) {
        await session.abortTransaction();
      }

      if (error.hasLabels && error.hasLabels('TransientTransactionError') && attempt < MAX_RETRIES) {
        console.warn(`[MongoDB] TransientTransactionError on /sell. Retrying attempt ${attempt}...`);
        attempt++;
        await new Promise(r => setTimeout(r, attempt * 150));
        continue;
      }

      console.error("Sell error:", error);
      return res.status(500).json({ 
        error: "Failed to process sale",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }
});

/**
 * POST /api/amm/swap
 * Execute a secondary market swap using the AMM pool
 */
router.post("/amm/swap", requireWalletSignature, async (req, res) => {
  try {
    const { assetId, walletAddress, swapDirection, amountIn, minAmountOut } = req.body;
    
    // Validate asset
    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    // In a real implementation we would call the smart contract logic here 
    // or verify an on-chain transaction. This is a basic simulation of the backend record.

    // Record the transaction
    const transaction = new Transaction({
      txHash: `swap_${uuidv4()}`,
      walletAddress,
      assetId: asset._id,
      assetName: asset.name,
      type: "swap",
      shares: swapDirection === 'SOL_TO_TOKEN' ? minAmountOut : amountIn,
      pricePerToken: asset.pricePerToken, // Approximate
      totalAmount: swapDirection === 'SOL_TO_TOKEN' ? amountIn : minAmountOut,
      fee: amountIn * 0.003, // 0.3% LP fee 
      status: "confirmed",
    });
    
    await transaction.save();
    await redis.del(`portfolio:${walletAddress}`);
    const keys = await redis.keys("assets:list:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    // Note: Portfolio update would normally happen via Indexer observing the chain
    // but for immediate UI response we might optimistically update it here if necessary.

    res.json({ message: "Swap executed", transaction });
  } catch (error) {
    console.error("Swap error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/escrow/create
 * Create a P2P Over-The-Counter Escrow Trade
 */
router.post("/escrow/create", requireWalletSignature, async (req, res) => {
  try {
    const { assetId, sellerWallet, buyerWallet, shares, solAmount } = req.body;
    
    // In production, this generates a transaction for the seller to sign
    // that locks their tokens into the Escrow PDA.

    res.json({
      message: "Escrow initialization transaction created",
      details: {
        assetId,
        sellerWallet,
        buyerWallet,
        shares,
        solAmount,
        status: "waiting_for_seller_signature"
      }
    });
  } catch (error) {
    console.error("Escrow creation error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
