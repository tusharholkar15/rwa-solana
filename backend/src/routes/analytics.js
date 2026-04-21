/**
 * Analytics Routes
 */
const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");
const AuditLog = require("../models/AuditLog");
const GovernanceProposal = require("../models/GovernanceProposal");
const analyticsService = require("../services/analyticsService");
const { isDatabaseConnected } = require("../config/database");
const { getMockAssets } = require("../utils/mockAssets");

/**
 * GET /api/analytics/market
 * Global market overview
 */
router.get("/market", async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.json({
        totalValueUSD: 1240000000,
        totalAssets: 20,
        activeInvestors: 4500,
        avgYieldBps: 580,
        topGainer: { name: "Rajasthan Solar Farm", change: 12.4 },
        marketVolume24h: 14200000,
        isMock: true
      });
    }
    const overview = await analyticsService.getMarketOverview();
    res.json(overview);
  } catch (error) {
    console.error("Market analytics error:", error);
    res.status(500).json({ error: "Failed to fetch market analytics" });
  }
});

/**
 * GET /api/analytics/assets/compare?ids=id1,id2,id3
 * Side-by-side asset comparison
 */
router.get("/assets/compare", async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ error: "ids query param required (comma-separated)" });

    const assetIds = ids.split(",").map((id) => id.trim());
    const comparison = await analyticsService.compareAssets(assetIds);
    res.json({ comparison });
  } catch (error) {
    console.error("Asset comparison error:", error);
    res.status(500).json({ error: "Failed to compare assets" });
  }
});

/**
 * GET /api/analytics/portfolio/:wallet
 * Deep portfolio analytics
 */
router.get("/portfolio/:wallet", async (req, res) => {
  try {
    const analytics = await analyticsService.getPortfolioAnalytics(req.params.wallet);
    res.json(analytics);
  } catch (error) {
    console.error("Portfolio analytics error:", error);
    res.status(500).json({ error: "Failed to fetch portfolio analytics" });
  }
});

/**
 * GET /api/analytics/heat-map
 * Asset performance heat map
 */
router.get("/heat-map", async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      const mockAssets = getMockAssets();
      return res.json({
        assets: mockAssets.map(a => ({
          _id: a._id,
          name: a.name,
          symbol: a.symbol,
          valuation: a.propertyValue,
          yield: a.annualYieldBps,
          change: (Math.random() * 5).toFixed(2)
        })),
        isMock: true
      });
    }
    const heatMap = await analyticsService.getHeatMap();
    res.json({ assets: heatMap });
  } catch (error) {
    console.error("Heat map error:", error);
    res.status(500).json({ error: "Failed to generate heat map" });
  }
});

/**
 * GET /api/analytics/top-movers
 * Top gainers and losers
 */
router.get("/top-movers", async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.json({
        gainers: [
          { name: "Austin Tech Hub", symbol: "ATXTEC", change: 8.42 },
          { name: "Miami Wynwood Lofts", symbol: "WYNLFT", change: 5.12 }
        ],
        losers: [
          { name: "The Shard Suite", symbol: "SHARD42", change: -1.24 }
        ],
        isMock: true
      });
    }
    const movers = await analyticsService.getTopMovers();
    res.json(movers);
  } catch (error) {
    console.error("Top movers error:", error);
    res.status(500).json({ error: "Failed to fetch top movers" });
  }
});

/**
 * GET /api/analytics/network-integrity
 * Public health data for the Oracle Transparency HUD
 */
router.get("/network-integrity", async (req, res) => {
  try {
    const assets = await Asset.find({});
    const recentLogs = await AuditLog.find({ 
      severity: { $in: ["warn", "error", "critical"] },
      eventType: { $in: ["oracle_breach", "circuit_breaker_trip", "guardian_reset"] }
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("assetId", "name symbol onChainAddress");

    const trippedCount = assets.filter(a => a.circuitBreaker?.isTripped).length;
    const stats = {
      totalAssets: assets.length,
      trippedAssets: trippedCount,
      healthyAssets: assets.length - trippedCount,
      systemStatus: trippedCount > 0 ? "degraded" : "operational",
      lastHeartbeat: assets.reduce((max, a) => {
        const update = a.circuitBreaker?.lastSyncAt || a.updatedAt;
        return update > max ? update : max;
      }, new Date(0)),
      consensusQuality: assets.length > 0 ? 98.4 : 100 // Performance metric placeholder
    };

    const activeSecurityProposals = await GovernanceProposal.find({
      proposalType: "oracle_reset",
      status: "active"
    }).limit(5).populate("assetId", "name symbol");

    res.json({
      stats,
      logs: recentLogs,
      assets: assets.map(a => ({
        id: a._id,
        name: a.name,
        symbol: a.symbol,
        isTripped: a.circuitBreaker?.isTripped || false,
        tripReason: a.circuitBreaker?.tripReason || "none",
        lastPrice: a.navPrice || a.pricePerToken,
        legalAttestations: a.verificationData?.documentHashes || []
      })),
      activeSecurityProposals
    });
  } catch (error) {
    console.error("Network integrity error:", error);
    res.status(500).json({ error: "Failed to fetch network integrity data" });
  }
});

module.exports = router;
