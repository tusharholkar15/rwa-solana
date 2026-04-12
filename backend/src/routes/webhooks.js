const express = require("express");
const router = express.Router();
const indexerService = require("../services/indexerService");
const pino = require("../config/logger");

/**
 * Public Helius Webhook Endpoint
 * 
 * This endpoint is the entry point for real-time blockchain telemetry.
 * It expects a Helius "Enhanced Transaction" array.
 */
router.post("/helius", async (req, res) => {
  try {
    const payload = req.body;
    
    // Authorization Check: Optional PSK validation
    const webhookSecret = process.env.HELIUS_WEBHOOK_SECRET;
    if (webhookSecret && req.headers['authorization'] !== webhookSecret) {
      return res.status(401).json({ error: "Unauthorized webhook source" });
    }

    if (!Array.isArray(payload)) {
      return res.status(400).json({ error: "Invalid webhook payload format" });
    }

    // Process asynchronously to release the Helius connection quickly
    // (indexerService handles idempotency and error isolation)
    indexerService.processWebhookPayload(payload).catch(err => {
      pino.error({ err }, "[Webhooks] Deferred processing failure");
    });

    res.status(200).json({ status: "accepted", count: payload.length });
  } catch (err) {
    pino.error({ err }, "[Webhooks] Critical endpoint failure");
    res.status(500).json({ error: "Internal processing error" });
  }
});

module.exports = router;
