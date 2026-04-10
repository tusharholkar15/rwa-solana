/**
 * Oracle Routes
 * API endpoints for fetching and managing NAV valuations
 */

const express = require("express");
const router = express.Router();
const oracleService = require("../services/oracleService");
const { requireWalletSignature, requireAdminWallet } = require("../middleware/authMiddleware");

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

module.exports = router;
