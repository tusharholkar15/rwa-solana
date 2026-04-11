const express = require("express");
const router = express.Router();
const auditService = require("../services/auditService");

/**
 * GET /api/audit/logs
 * Query audit trail with filters
 */
router.get("/logs", async (req, res) => {
  try {
    const { walletAddress, eventType, startDate, endDate, regulatorFlag, page, limit } = req.query;

    const filters = {};
    if (walletAddress) filters.walletAddress = walletAddress;
    if (eventType) filters.eventType = eventType;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (regulatorFlag !== undefined) filters.regulatorFlag = regulatorFlag === "true";

    const options = {
      limit: parseInt(limit) || 50,
      skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 50),
    };

    const result = await auditService.queryEvents(filters, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/audit/export
 * Export audit logs for regulators (CSV or JSON)
 */
router.get("/export", async (req, res) => {
  try {
    const { format, startDate, endDate } = req.query;
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const exportData = await auditService.exportLogs(filters, format || "csv");

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=audit_export.json");
    } else {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=audit_export.csv");
    }

    res.send(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/audit/stats
 * Audit log summary statistics
 */
router.get("/stats", async (req, res) => {
  try {
    const AuditLog = require("../models/AuditLog");
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [total, last24hCount, last7dCount, flaggedCount, eventTypes] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: last24h } }),
      AuditLog.countDocuments({ createdAt: { $gte: last7d } }),
      AuditLog.countDocuments({ regulatorFlag: true }),
      AuditLog.aggregate([
        { $group: { _id: "$eventType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({
      total,
      last24h: last24hCount,
      last7d: last7dCount,
      flagged: flaggedCount,
      topEventTypes: eventTypes.map((e) => ({ type: e._id, count: e.count })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
