const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Portfolio = require("../models/Portfolio");
const TaxLot = require("../models/TaxLot");
const { validateTradeRequest } = require("../middleware/validation");
const { v4: uuidv4 } = require("uuid");
const transferAgentService = require("../services/transferAgentService");

/**
 * POST /api/buy
 * Execute a buy order for fractional shares
 */
router.post("/buy", validateTradeRequest, async (req, res) => {
  try {
    const { assetId, shares, walletAddress } = req.body;

    // Validate asset
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }
    if (!asset.isActive || asset.status !== "active") {
      return res.status(400).json({ error: "Asset is not available for trading" });
    }
    if (asset.availableSupply < shares) {
      return res.status(400).json({
        error: "Insufficient supply",
        available: asset.availableSupply,
        requested: shares,
      });
    }

    // Validate user KYC
    let user = await User.findOne({ walletAddress });
    
    // Auto-approve in development mode if user doesn't exist or isn't approved
    if (process.env.NODE_ENV === "development") {
      if (!user) {
        user = new User({
          walletAddress,
          name: "Dev User",
          email: "dev@example.com",
          kycStatus: "approved",
          isWhitelisted: true,
        });
        await user.save();
        console.log(`✅ Auto-created & Approved KYC for Dev User: ${walletAddress}`);
      } else if (user.kycStatus !== "approved") {
        user.kycStatus = "approved";
        user.isWhitelisted = true;
        await user.save();
        console.log(`✅ Auto-approved KYC for Existing User: ${walletAddress}`);
      }
    }

    if (!user || user.kycStatus !== "approved") {
      return res.status(403).json({
        error: "KYC verification required",
        message: "Please complete KYC verification before trading",
        kycStatus: user ? user.kycStatus : "none",
      });
    }

    // Calculate costs
    const totalCost = shares * asset.pricePerToken;
    const fee = Math.floor(totalCost * 0.001); // 0.1% platform fee

    // Update asset supply
    asset.availableSupply -= shares;
    asset.totalInvestors = await Portfolio.countDocuments({
      "holdings.assetId": asset._id,
      "holdings.shares": { $gt: 0 },
    });
    await asset.save();

    // Update portfolio
    let portfolio = await Portfolio.findOne({ walletAddress });
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
      // Update weighted average price
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

    await portfolio.save();

    // Record transaction
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
    await transaction.save();

    // Create Tax Lot for specific tracking
    const taxLot = new TaxLot({
      walletAddress,
      assetId,
      sharesTotal: shares,
      sharesRemaining: shares,
      purchasePrice: asset.pricePerToken,
      transactionId: transaction._id,
      purchaseDate: transaction.createdAt,
    });
    await taxLot.save();


    // Update user stats
    user.totalTransactions += 1;
    user.totalInvested += totalCost;
    await user.save();

    // Trigger async Transfer Agent integration (Non-blocking)
    transferAgentService.syncTransfer(
      asset._id,
      "ISSUER_TREASURY", // Simulated primary market seller
      walletAddress,
      shares
    ).catch(err => console.error("[Background] TA Sync Failed:", err.message));

    res.json({
      message: "Purchase successful",
      transaction: {
        id: transaction._id,
        txHash: transaction.txHash,
        shares,
        pricePerToken: asset.pricePerToken,
        totalCost,
        fee,
        asset: {
          name: asset.name,
          symbol: asset.symbol,
          remainingSupply: asset.availableSupply,
        },
      },
    });
  } catch (error) {
    console.error("Buy error:", error);
    res.status(500).json({ error: "Failed to process purchase" });
  }
});

/**
 * POST /api/sell
 * Execute a sell order for fractional shares
 */
router.post("/sell", validateTradeRequest, async (req, res) => {
  try {
    const { assetId, shares, walletAddress } = req.body;

    // Validate asset
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    // Validate user KYC
    let user = await User.findOne({ walletAddress });

    // Auto-approve in development mode (should already be handled by /buy, but for safety)
    if (process.env.NODE_ENV === "development" && user && user.kycStatus !== "approved") {
      user.kycStatus = "approved";
      user.isWhitelisted = true;
      await user.save();
    }

    if (!user || user.kycStatus !== "approved") {
      return res.status(403).json({ error: "KYC verification required" });
    }

    // Validate portfolio holdings
    const portfolio = await Portfolio.findOne({ walletAddress });
    if (!portfolio) {
      return res.status(400).json({ error: "No portfolio found" });
    }

    const holding = portfolio.holdings.find(
      (h) => h.assetId.toString() === assetId
    );

    if (!holding || holding.shares < shares) {
      return res.status(400).json({
        error: "Insufficient shares",
        owned: holding ? holding.shares : 0,
        requested: shares,
      });
    }

    // 4. Calculate P&L using FIFO Tax Lots
    const activeLots = await TaxLot.find({
      walletAddress,
      assetId,
      status: "active",
      sharesRemaining: { $gt: 0 },
    }).sort({ purchaseDate: 1 }); // FIFO: Oldest first

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
      await lot.save();
    }

    if (remainingToSell > 0) {
      // Fallback if lots are somehow out of sync with portfolio (should not happen)
      totalCostBasisOfSoldShares += remainingToSell * holding.avgBuyPrice;
    }

    const realizedPnl = totalProceeds - totalCostBasisOfSoldShares;

    // Update asset supply
    asset.availableSupply += shares;
    await asset.save();

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

    await portfolio.save();

    // Record transaction
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
    await transaction.save();

    // Update user stats
    user.totalTransactions += 1;
    await user.save();

    // Trigger async Transfer Agent integration (Non-blocking)
    transferAgentService.syncTransfer(
      asset._id,
      walletAddress,
      "REdemption_TREASURY", // Simulated secondary redemption
      shares
    ).catch(err => console.error("[Background] TA Sync Failed:", err.message));

    res.json({
      message: "Sale successful",
      transaction: {
        id: transaction._id,
        txHash: transaction.txHash,
        shares,
        pricePerToken: asset.pricePerToken,
        totalProceeds,
        fee,
        realizedPnl,
        asset: {
          name: asset.name,
          symbol: asset.symbol,
        },
      },
    });
  } catch (error) {
    console.error("Sell error:", error);
    res.status(500).json({ error: "Failed to process sale" });
  }
});

module.exports = router;
