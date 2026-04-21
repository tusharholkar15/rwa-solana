const express = require("express");
const router = express.Router();
const Portfolio = require("../models/Portfolio");
const Transaction = require("../models/Transaction");
const Asset = require("../models/Asset");
const TaxLot = require("../models/TaxLot");
const priceService = require("../services/priceService");
const { requireWalletSignature: validateWallet } = require("../middleware/security");
const { paginationMeta } = require("../utils/helpers");
const solanaService = require("../services/solanaService");
const auditService = require("../services/auditService");

/**
 * GET /api/portfolio/:wallet/tax-lots
 * Get user's detailed tax lots for FIFO analysis
 */
router.get("/:wallet/tax-lots", validateWallet, async (req, res) => {
  try {
    const { wallet } = req.params;
    
    const lots = await TaxLot.find({ 
      walletAddress: wallet,
      sharesRemaining: { $gt: 0 }
    })
    .sort({ purchaseDate: 1 })
    .populate("assetId", "name symbol pricePerToken navPrice assetType");

    const solPrice = await priceService.getSolPrice();

    const enrichedLots = lots.map(lot => {
      const asset = lot.assetId;
      const currentPrice = asset?.pricePerToken || 0;
      const unrealizedPnl = lot.sharesRemaining * (currentPrice - lot.purchasePrice);
      const unrealizedPnlUsd = (unrealizedPnl / 1e9) * solPrice.price;
      
      return {
        ...lot.toObject(),
        currentPrice,
        unrealizedPnl,
        unrealizedPnlUsd,
        holdingPeriodDays: Math.floor((new Date() - new Date(lot.purchaseDate)) / (1000 * 60 * 60 * 24))
      };
    });

    res.json({
      lots: enrichedLots,
      solPrice: solPrice.price
    });
  } catch (error) {
    console.error("Tax lots error:", error);
    res.status(500).json({ error: "Failed to fetch tax lots" });
  }
});

const cacheService = require("../services/cacheService");

/**
 * GET /api/portfolio/:wallet
 * Get user's complete portfolio with holdings and stats
 */
router.get("/:wallet", validateWallet, async (req, res) => {
  const { wallet } = req.params;
  const cacheKey = `portfolio:${wallet}`;

  try {
    const fetchPortfolio = async () => {
      const portfolio = await Portfolio.findOne({ walletAddress: wallet });

      if (!portfolio) {
        return {
          portfolio: {
            walletAddress: wallet,
            holdings: [],
            totalValue: 0,
            totalInvested: 0,
            totalYieldEarned: 0,
            totalRealizedPnl: 0,
            unrealizedPnl: 0,
          },
        };
      }

      // Populate holdings with asset details
      const enrichedHoldings = await Promise.all(
        portfolio.holdings.map(async (holding) => {
          const asset = await Asset.findById(holding.assetId).select(
            "name symbol images pricePerToken navPrice lastOracleUpdate assetType location status"
          );

          if (!asset) return null;

          const currentValue = holding.shares * asset.pricePerToken;
          const navValue = holding.shares * (asset.navPrice || asset.pricePerToken);
          const costBasis = Math.round(holding.shares * (holding.avgBuyPrice || 0));
          const unrealizedPnl = currentValue - costBasis;
          const pnlPercentage = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

          return {
            ...holding.toObject(),
            asset: {
              name: asset.name,
              symbol: asset.symbol,
              image: asset.images?.[0] || null,
              currentPrice: asset.pricePerToken,
              navPrice: asset.navPrice || asset.pricePerToken,
              lastOracleUpdate: asset.lastOracleUpdate,
              assetType: asset.assetType,
              location: asset.location,
              status: asset.status,
            },
            currentValue,
            navValue,
            unrealizedPnl,
            pnlPercentage: Math.round(pnlPercentage * 100) / 100,
            totalYieldReceived: holding.totalYieldReceived || 0,
            autoCompoundEnabled: holding.autoCompoundEnabled || false,
            reinvestmentThreshold: holding.reinvestmentThreshold || 100_000_000,
            lastTransactionAt: holding.lastTransactionAt || null,
            ownershipPercentage: 0,
          };
        })
      );

      const validHoldings = enrichedHoldings.filter((h) => h !== null);
      const totalCurrentValue = validHoldings.reduce((sum, h) => sum + h.currentValue, 0);
      const totalNavValue = validHoldings.reduce((sum, h) => sum + h.navValue, 0);
      const totalUnrealizedPnl = validHoldings.reduce((sum, h) => sum + h.unrealizedPnl, 0);

      const solPrice = await priceService.getSolPrice();

      return {
        portfolio: {
          walletAddress: wallet,
          holdings: validHoldings,
          totalValue: totalCurrentValue,
          totalValueUsd: (totalCurrentValue / 1e9) * solPrice.price,
          totalNavValue: totalNavValue,
          totalNavValueUsd: (totalNavValue / 1e9) * solPrice.price,
          totalInvested: portfolio.totalInvested,
          totalInvestedUsd: (portfolio.totalInvested / 1e9) * solPrice.price,
          totalYieldEarned: portfolio.totalYieldEarned || 0,
          totalRealizedPnl: portfolio.totalRealizedPnl || 0,
          unrealizedPnl: totalUnrealizedPnl,
          assetsCount: validHoldings.length,
          valueHistory: portfolio.valueHistory || [],
        },
        solPrice: solPrice.price,
      };
    };

    const responseData = await cacheService.wrap(cacheKey, 10, fetchPortfolio);
    res.setHeader("Cache-Control", "public, s-maxage=5, stale-while-revalidate=30");
    res.json(responseData);
  } catch (error) {
    console.error("Portfolio error:", error);
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

/**
 * POST /api/portfolio/:wallet/compounding
 * Update auto-compounding preference for an asset
 */
router.post("/:wallet/compounding", validateWallet, async (req, res) => {
  try {
    const { wallet } = req.params;
    const { assetId, enabled, threshold } = req.body;

    if (!assetId) return res.status(400).json({ error: "assetId required" });

    const portfolio = await Portfolio.findOne({ walletAddress: wallet });
    if (!portfolio) return res.status(404).json({ error: "Portfolio not found" });

    const holding = portfolio.holdings.find(h => h.assetId.toString() === assetId);
    if (!holding) return res.status(404).json({ error: "Holding not found" });

    const asset = await Asset.findById(holding.assetId);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    // 1. Update On-Chain (Guardian role or Owner role depending on instruction)
    // Here we use the ownerAddress (wallet) to update the Ownership PDA state.
    const signature = await solanaService.setCompoundingPreference(
      asset.onChainAddress,
      wallet,
      !!enabled,
      threshold || 100_000_000
    );

    // 2. Update DB
    holding.autoCompoundEnabled = !!enabled;
    if (threshold) holding.reinvestmentThreshold = threshold;
    await portfolio.save();

    // 3. Audit Log
    await auditService.logEvent({
      eventType: "config_update",
      severity: "info",
      assetId: asset._id,
      walletAddress: wallet,
      signature,
      details: {
        action: "toggle_auto_compound",
        enabled: !!enabled,
        threshold: threshold || 100_000_000
      },
      performedBy: "user"
    });

    res.json({ 
      success: true, 
      signature,
      autoCompoundEnabled: holding.autoCompoundEnabled 
    });

  } catch (error) {
    console.error("Compounding update error:", error);
    res.status(500).json({ error: error.message || "Failed to update compounding preference" });
  }
});

/**
 * GET /api/portfolio/:wallet/transactions
 * Get user's transaction history
 */
router.get("/:wallet/transactions", validateWallet, async (req, res) => {
  try {
    const { wallet } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    const filter = { walletAddress: wallet };
    if (type) filter.type = type;

    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate("assetId", "name symbol images");

    res.json({
      transactions,
      pagination: paginationMeta(total, Number(page), Number(limit)),
    });
  } catch (error) {
    console.error("Transactions error:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

module.exports = router;
