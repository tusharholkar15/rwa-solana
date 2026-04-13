/**
 * Oracle Routes
 * API endpoints for fetching and managing NAV valuations
 */

const express = require("express");
const router = express.Router();
const oracleService = require("../services/oracleService");
const { requireWalletSignature, requireRole } = require("../middleware/security");
const requireAdminWallet = requireRole("admin");

/**
 * GET /api/oracle/history/:assetId
 * Fetch historical NAV data points for an asset (e.g. for charting)
 */
router.get("/history/:assetId", async (req, res) => {
  try {
    const { days } = req.query;
    const history = await oracleService.getNavHistory(req.params.assetId, days ? Number(days) : 30);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/oracle/update
 * Admin: Manually publish a new NAV valuation from a verified provider
 */
router.post("/update", requireWalletSignature, requireAdminWallet, async (req, res) => {
  try {
    const { assetId, provider, navPrice, confidenceInterval, sourceTags } = req.body;
    
    if (!assetId || !provider || navPrice === undefined) {
      return res.status(400).json({ error: "assetId, provider, and navPrice are required" });
    }

    const feed = await oracleService.publishNavUpdate({
      assetId,
      provider,
      navPrice: Number(navPrice),
      confidenceInterval: confidenceInterval ? Number(confidenceInterval) : 0.02,
      sourceTags: sourceTags || ["ADMIN", "MANUAL"],
    });

    res.json({ success: true, feed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/oracle/status/:assetId
 * Fetch detailed circuit breaker status for an asset
 */
router.get("/status/:assetId", async (req, res) => {
  try {
    const { assetId } = req.params;
    const Asset = require("../models/Asset");
    const asset = await Asset.findById(assetId);
    
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    res.json({
      assetId: asset._id,
      status: asset.status,
      pausalReason: asset.pausalReason || null,
      lastOracleUpdate: asset.lastOracleUpdate,
      navPrice: asset.navPrice
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/oracle/health
 * Fetch global oracle system health
 */
router.get("/health", async (req, res) => {
  try {
    const health = await oracleService.getHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
