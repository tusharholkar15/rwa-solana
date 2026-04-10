/**
 * FX / Multi-Currency Routes
 */
const express = require("express");
const router = express.Router();
const fxService = require("../services/fxService");

/**
 * GET /api/fx/rates
 * Get all live FX rates (USD base)
 */
router.get("/rates", async (req, res) => {
  try {
    const rates = await fxService.getRates();
    res.json(rates);
  } catch (error) {
    console.error("FX rates error:", error);
    res.status(500).json({ error: "Failed to fetch FX rates" });
  }
});

/**
 * GET /api/fx/convert?from=USD&to=INR&amount=1000
 * Convert between currencies
 */
router.get("/convert", async (req, res) => {
  try {
    const { from = "USD", to = "INR", amount = 1 } = req.query;
    const result = await fxService.convert(Number(amount), from.toUpperCase(), to.toUpperCase());
    res.json(result);
  } catch (error) {
    console.error("FX conversion error:", error);
    res.status(500).json({ error: "Failed to convert currency" });
  }
});

/**
 * GET /api/fx/currencies
 * List supported currencies
 */
router.get("/currencies", (req, res) => {
  res.json(fxService.getSupportedCurrencies());
});

module.exports = router;
