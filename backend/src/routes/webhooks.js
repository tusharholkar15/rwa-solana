const express = require("express");
const crypto  = require("crypto");
const router  = express.Router();
const indexerService = require("../services/indexerService");
const logger         = require("../config/logger");

/**
 * Helius Webhook Endpoint (Production-Hardened)
 *
 * Security layers:
 *  1. HMAC-SHA256 signature verification (if HELIUS_WEBHOOK_SECRET is set)
 *  2. Payload structure validation
 *  3. Non-blocking async processing (HTTP 200 returned immediately)
 *  4. Idempotent downstream (indexerService deduplicates via Redis + DB)
 */
router.post(
  "/helius",
  // Capture raw body for HMAC before JSON parsing (express.json already ran,
  // so we verify against the stringified payload. For byte-exact HMAC in
  // production, use express.raw() on this route exclusively.)
  async (req, res) => {
    try {
      const payload = req.body;

      // ── 1. Authenticate webhook source ───────────────────────────────────
      const secret = process.env.HELIUS_WEBHOOK_SECRET;
      if (secret) {
        const sigHeader = req.headers["x-helius-signature"]
          || req.headers["authorization"];

        if (!sigHeader) {
          logger.warn("[Webhook] Missing auth header — rejecting");
          return res.status(401).json({ error: "Unauthorized: missing signature" });
        }

        // Support both HMAC-SHA256 (preferred) and simple PSK fallback
        if (sigHeader.startsWith("sha256=")) {
          const receivedHmac = sigHeader.slice(7);
          const expectedHmac = crypto
            .createHmac("sha256", secret)
            .update(JSON.stringify(payload))
            .digest("hex");

          if (!crypto.timingSafeEqual(
            Buffer.from(receivedHmac, "hex"),
            Buffer.from(expectedHmac, "hex")
          )) {
            logger.warn("[Webhook] HMAC-SHA256 mismatch — rejecting");
            return res.status(401).json({ error: "Unauthorized: invalid HMAC" });
          }
        } else if (sigHeader !== secret) {
          // Simple PSK fallback for dev / initial setup
          logger.warn("[Webhook] PSK mismatch — rejecting");
          return res.status(401).json({ error: "Unauthorized: invalid token" });
        }
      }

      // ── 2. Validate payload format ───────────────────────────────────────
      if (!Array.isArray(payload)) {
        return res.status(400).json({ error: "Payload must be a JSON array" });
      }

      if (payload.length === 0) {
        return res.status(200).json({ status: "accepted", count: 0 });
      }

      // ── 3. Accept & process async (release Helius connection fast) ───────
      indexerService.processWebhookPayload(payload).catch((err) => {
        logger.error({ err }, "[Webhook] Deferred processing failure");
      });

      res.status(200).json({ status: "accepted", count: payload.length });
    } catch (err) {
      logger.error({ err }, "[Webhook] Critical endpoint failure");
      res.status(500).json({ error: "Internal processing error" });
    }
  }
);

module.exports = router;
