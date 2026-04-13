const express = require("express");
const router = express.Router();
const regulatoryService = require("../services/regulatoryService");
const logger = require("../config/logger");

/**
 * @route   GET /api/regulatory/overview
 * @desc    Get high-level platform health and compliance stats
 * @access  Private (Regulator Only)
 */
router.get("/overview", async (req, res) => {
  try {
    const stats = await regulatoryService.getGlobalStats();
    res.json(stats);
  } catch (error) {
    logger.error({ err: error }, "[RegulatoryAPI] Failed to fetch overview");
    res.status(500).json({ error: "Aggregation failed" });
  }
});

/**
 * @route   GET /api/regulatory/jurisdictions
 * @desc    Get asset and investor distribution by jurisdiction
 * @access  Private (Regulator Only)
 */
router.get("/jurisdictions", async (req, res) => {
  try {
    const stats = await regulatoryService.getJurisdictionStats();
    res.json(stats);
  } catch (error) {
    logger.error({ err: error }, "[RegulatoryAPI] Failed to fetch jurisdictions");
    res.status(500).json({ error: "Jurisdiction mapping failed" });
  }
});

/**
 * @route   GET /api/regulatory/dark-pool
 * @desc    Get dark pool matching and integrity metrics
 * @access  Private (Regulator Only)
 */
router.get("/dark-pool", async (req, res) => {
  try {
    const stats = await regulatoryService.getDarkPoolMetrics();
    res.json(stats);
  } catch (error) {
    logger.error({ err: error }, "[RegulatoryAPI] Failed to fetch dark pool metrics");
    res.status(500).json({ error: "Dark pool analytics failed" });
  }
});

/**
 * @route   GET /api/regulatory/alerts
 * @desc    Get most recent compliance and security alerts
 * @access  Private (Regulator Only)
 */
router.get("/alerts", async (req, res) => {
  try {
    const alerts = await regulatoryService.getRecentAlerts();
    res.json(alerts);
  } catch (error) {
    logger.error({ err: error }, "[RegulatoryAPI] Failed to fetch alerts");
    res.status(500).json({ error: "Alert retrieval failed" });
  }
});

module.exports = router;
