/**
 * Property Lifecycle Routes
 * Manages real-world property status: rent collection, maintenance, inspections, and health dashboards.
 */

const express = require("express");
const router = express.Router();
const propertyLifecycleService = require("../services/propertyLifecycleService");
const riskScoringService = require("../services/riskScoringService");

// POST /api/lifecycle/rent — Log a rent collection (Issuer role)
router.post("/rent", async (req, res) => {
  try {
    const { assetId, amount, period, paymentProof, reportedBy } = req.body;

    if (!assetId || !amount || !period || !reportedBy) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const event = await propertyLifecycleService.recordRentCollection(
      assetId, amount, period, paymentProof, reportedBy
    );

    res.status(201).json({ message: "Rent collection logged", event });
  } catch (error) {
    console.error("Rent logging error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/lifecycle/maintenance — Log a maintenance cost (Issuer role)
router.post("/maintenance", async (req, res) => {
  try {
    const { assetId, amount, description, invoiceHash, category, vendor, reportedBy } = req.body;

    if (!assetId || !amount || !reportedBy) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const event = await propertyLifecycleService.recordMaintenanceCost({
      assetId, amount, description, invoiceHash, category, vendor, reportedBy,
    });

    res.status(201).json({ message: "Maintenance cost logged", event });
  } catch (error) {
    console.error("Maintenance logging error:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/lifecycle/occupancy — Update occupancy rate
router.patch("/occupancy", async (req, res) => {
  try {
    const { assetId, rate, evidenceUrl, reportedBy } = req.body;

    if (!assetId || rate === undefined || !reportedBy) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const event = await propertyLifecycleService.updateOccupancy(
      assetId, rate, evidenceUrl, reportedBy
    );

    res.json({ message: "Occupancy updated", event });
  } catch (error) {
    console.error("Occupancy update error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/lifecycle/inspection — Record a property inspection
router.post("/inspection", async (req, res) => {
  try {
    const { assetId, summary, reportHash, reportUrl, reportedBy } = req.body;

    if (!assetId || !reportedBy) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const event = await propertyLifecycleService.recordInspection(
      assetId,
      { summary, reportHash, reportUrl },
      reportedBy
    );

    res.status(201).json({ message: "Inspection recorded", event });
  } catch (error) {
    console.error("Inspection recording error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/lifecycle/verify-event/:eventId — Admin verifies a property event
router.post("/verify-event/:eventId", async (req, res) => {
  try {
    const { verifiedBy } = req.body;
    const event = await propertyLifecycleService.verifyEvent(
      req.params.eventId, verifiedBy
    );
    res.json({ message: "Event verified", event });
  } catch (error) {
    console.error("Event verification error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lifecycle/dashboard/:assetId — Full property health dashboard
router.get("/dashboard/:assetId", async (req, res) => {
  try {
    const dashboard = await propertyLifecycleService.getLifecycleDashboard(
      req.params.assetId
    );
    res.json(dashboard);
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lifecycle/events/:assetId — Event history with filters
router.get("/events/:assetId", async (req, res) => {
  try {
    const { eventType, isVerified, startDate, endDate, limit, skip } = req.query;

    const result = await propertyLifecycleService.getEvents(
      req.params.assetId,
      {
        eventType,
        isVerified: isVerified !== undefined ? isVerified === "true" : undefined,
        startDate,
        endDate,
      },
      { limit: parseInt(limit) || 50, skip: parseInt(skip) || 0 }
    );

    res.json(result);
  } catch (error) {
    console.error("Events error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lifecycle/risk/:assetId — Get risk score
router.get("/risk/:assetId", async (req, res) => {
  try {
    let score = await riskScoringService.getLatestScore(req.params.assetId);

    // Compute fresh if none exists or older than 24 hours
    if (!score || Date.now() - score.computedAt.getTime() > 24 * 60 * 60 * 1000) {
      score = await riskScoringService.computePropertyRisk(req.params.assetId);
    }

    res.json(score);
  } catch (error) {
    console.error("Risk score error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lifecycle/risk-history/:assetId — Risk score history
router.get("/risk-history/:assetId", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const history = await riskScoringService.getScoreHistory(req.params.assetId, days);
    res.json(history);
  } catch (error) {
    console.error("Risk history error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
