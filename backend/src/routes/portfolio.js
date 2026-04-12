const express = require("express");
const router = express.Router();
const Portfolio = require("../models/Portfolio");
const Transaction = require("../models/Transaction");
const Asset = require("../models/Asset");
const TaxLot = require("../models/TaxLot");
const priceService = require("../services/priceService");
const { validateWallet } = require("../middleware/auth");
const { paginationMeta } = require("../utils/helpers");

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

const redis = require("../config/redis");

/**
 * GET /api/portfolio/:wallet
 * Get user's complete portfolio with holdings and stats
 */
router.get("/:wallet", validateWallet, async (req, res) => {
  const { wallet } = req.params;
  const cacheKey = `portfolio:${wallet}`;

  try {
    // 1. Try to serve from Redis cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      // Set HTTP Cache Headers for browser/CDN optimization
    res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=59");

    return res.json(JSON.parse(cachedData));
    }

    const portfolio = await Portfolio.findOne({ walletAddress: wallet });

    if (!portfolio) {
      return res.json({
        portfolio: {
          walletAddress: wallet,
          holdings: [],
          totalValue: 0,
          totalInvested: 0,
          totalYieldEarned: 0,
          totalRealizedPnl: 0,
          unrealizedPnl: 0,
        },
      });
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

    const responseData = {
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
      cached: false,
    };

    // 2. Cache the result for 10 seconds as this is a high-frequency trading platform
    await redis.setex(cacheKey, 10, JSON.stringify({ ...responseData, cached: true }));

    res.json(responseData);
  } catch (error) {
    console.error("Portfolio error:", error);
    res.status(500).json({ error: "Failed to fetch portfolio" });
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
