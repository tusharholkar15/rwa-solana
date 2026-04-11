const express = require("express");
const router = express.Router();
const rentService = require("../services/rentService");
const auditService = require("../services/auditService");

/**
 * POST /api/rent/collect
 * Property manager submits a USDC rent payment
 */
router.post("/collect", async (req, res) => {
  try {
    const { assetId, amountUsdc, memo, propertyManagerWallet, txSignature } = req.body;

    if (!assetId || !amountUsdc || !propertyManagerWallet) {
      return res.status(400).json({ error: "assetId, amountUsdc, and propertyManagerWallet are required" });
    }

    const result = await rentService.collectRent({
      assetId,
      amountUsdc,
      memo: memo || "",
      propertyManagerWallet,
      txSignature: txSignature || "pending",
    });

    res.json(result);
  } catch (error) {
    console.error("[Rent] Collection error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rent/:assetId/history
 * Rent collection history for an asset
 */
router.get("/:assetId/history", async (req, res) => {
  try {
    const PropertyEvent = require("../models/PropertyEvent");
    const events = await PropertyEvent.find({
      assetId: req.params.assetId,
      eventType: "rent_collected",
    })
      .sort({ createdAt: -1 })
      .limit(24); // Last 2 years of monthly rent

    const Asset = require("../models/Asset");
    const asset = await Asset.findById(req.params.assetId);

    res.json({
      assetId: req.params.assetId,
      rentStats: asset?.rentStats || { totalCollected: 0, pendingDistribution: 0 },
      history: events,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/rent/distribute/:assetId
 * Trigger USDC yield distribution for an asset
 */
router.post("/distribute/:assetId", async (req, res) => {
  try {
    const { holderWallet, sharesOwned, totalShares, txSignature } = req.body;
    
    if (!holderWallet || !sharesOwned || !totalShares) {
      return res.status(400).json({ error: "holderWallet, sharesOwned, totalShares required" });
    }

    const result = await rentService.distributeYieldToHolder({
      assetId: req.params.assetId,
      holderWallet,
      sharesOwned,
      totalShares,
      txSignature: txSignature || "pending",
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rent/yield-summary/:assetId
 * Get yield distribution summary for dashboard
 */
router.get("/yield-summary/:assetId", async (req, res) => {
  try {
    const Asset = require("../models/Asset");
    const asset = await Asset.findById(req.params.assetId);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    const PropertyEvent = require("../models/PropertyEvent");
    const rentEvents = await PropertyEvent.find({
      assetId: req.params.assetId,
      eventType: "rent_collected",
    }).sort({ createdAt: -1 }).limit(12);

    // Calculate metrics
    const totalCollected = asset.rentStats?.totalCollected || 0;
    const pendingDistribution = asset.rentStats?.pendingDistribution || 0;
    const annualizedYield = asset.pricePerToken && asset.totalSupply
      ? ((totalCollected / (asset.pricePerToken * asset.totalSupply)) * 100).toFixed(2)
      : "0.00";

    res.json({
      assetId: req.params.assetId,
      assetName: asset.name,
      totalCollectedUsdc: totalCollected,
      pendingDistributionUsdc: pendingDistribution,
      annualizedYieldPercent: parseFloat(annualizedYield),
      lastCollectionAt: asset.rentStats?.lastCollectionAt,
      monthlyHistory: rentEvents.map(e => ({
        period: e.period,
        amount: e.amount,
        date: e.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
