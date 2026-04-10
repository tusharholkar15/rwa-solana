/**
 * Fiat On-Ramp / Off-Ramp Routes
 */
const express = require("express");
const router = express.Router();
const onrampService = require("../services/onrampService");
const fxService = require("../services/fxService");

/**
 * POST /api/onramp/create-order
 * Create a fiat payment order (Razorpay for INR, Stripe for USD)
 */
router.post("/create-order", async (req, res) => {
  try {
    const { currency, amount, walletAddress, assetId, shares } = req.body;

    if (!walletAddress || !amount || !assetId) {
      return res.status(400).json({ error: "walletAddress, amount, assetId are required" });
    }

    let order;
    if (currency === "INR") {
      order = await onrampService.createRazorpayOrder({
        amountINR: Number(amount),
        walletAddress,
        assetId,
        shares: shares || 1,
      });
    } else {
      order = await onrampService.createStripeIntent({
        amountUSD: Number(amount),
        walletAddress,
        assetId,
        shares: shares || 1,
      });
    }

    res.json({ order });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: error.message || "Failed to create payment order" });
  }
});

/**
 * POST /api/onramp/verify
 * Verify a Razorpay payment
 */
router.post("/verify", async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    const result = await onrampService.verifyRazorpayPayment({ orderId, paymentId, signature });
    res.json(result);
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

/**
 * POST /api/onramp/simulate-success
 * DEV ONLY: Simulate a successful payment
 */
router.post("/simulate-success", async (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({ error: "Only available in development mode" });
  }
  try {
    const { orderId } = req.body;
    const result = await onrampService.simulatePaymentSuccess(orderId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/offramp/initiate
 * Initiate a bank withdrawal (off-ramp)
 */
router.post("/offramp/initiate", async (req, res) => {
  try {
    const { walletAddress, amount, currency, bankDetails } = req.body;

    if (!walletAddress || !amount) {
      return res.status(400).json({ error: "walletAddress and amount are required" });
    }

    const result = await onrampService.initiateOfframp({
      walletAddress,
      amount: Number(amount),
      currency: currency || "USD",
      bankDetails: bankDetails || {},
    });

    res.json(result);
  } catch (error) {
    console.error("Off-ramp error:", error);
    res.status(500).json({ error: "Failed to initiate withdrawal" });
  }
});

/**
 * GET /api/onramp/estimate
 * Get a fiat-to-token estimate
 */
router.get("/estimate", async (req, res) => {
  try {
    const { amount, currency = "USD", tokenPriceSOL } = req.query;
    if (!amount || !tokenPriceSOL) {
      return res.status(400).json({ error: "amount and tokenPriceSOL are required" });
    }

    // Convert fiat to USD
    const usdAmount = currency === "USD"
      ? Number(amount)
      : (await fxService.convert(Number(amount), currency, "USD")).to.amount;

    // Get SOL price
    const priceService = require("../services/priceService");
    const solPrice = await priceService.getSolPrice();
    const solAmount = usdAmount / solPrice.price;
    const tokenPrice = Number(tokenPriceSOL) / 1e9; // lamports to SOL
    const estimatedTokens = Math.floor(solAmount / tokenPrice);

    res.json({
      fiatAmount: Number(amount),
      fiatCurrency: currency,
      usdEquivalent: Math.round(usdAmount * 100) / 100,
      solAmount: Math.round(solAmount * 1000000) / 1000000,
      solPrice: solPrice.price,
      estimatedTokens,
      tokenPriceSOL: tokenPrice,
      platformFee: "0.1%",
    });
  } catch (error) {
    console.error("Estimate error:", error);
    res.status(500).json({ error: "Failed to generate estimate" });
  }
});

module.exports = router;
