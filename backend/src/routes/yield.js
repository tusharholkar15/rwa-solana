const express = require("express");
const router = express.Router();
const yieldService = require("../services/yieldService");

/**
 * GET /api/yield/pending
 * Calculate real-time pending yield for a user/asset pair
 */
router.get("/pending", async (req, res) => {
  try {
    const { asset, user } = req.query;

    if (!asset || !user) {
      return res.status(400).json({ error: "asset and user addresses are required" });
    }

    const report = await yieldService.getPendingYield(asset, user);
    res.json(report);
  } catch (error) {
    console.error("[Yield] Calc error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
