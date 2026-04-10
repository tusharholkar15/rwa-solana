/**
 * Credit Scoring & Lending Routes
 */
const express = require("express");
const router = express.Router();
const creditService = require("../services/creditService");

/**
 * GET /api/credit/score/:wallet
 * Compute and return credit score for a wallet
 */
router.get("/score/:wallet", async (req, res) => {
  try {
    const score = await creditService.computeScore(req.params.wallet);
    res.json(score);
  } catch (error) {
    console.error("Credit score error:", error);
    res.status(500).json({ error: "Failed to compute credit score" });
  }
});

/**
 * POST /api/credit/loan/apply
 * Apply for an asset-backed loan
 */
router.post("/loan/apply", async (req, res) => {
  try {
    const { walletAddress, collateralAssetId, collateralShares, requestedAmount } = req.body;

    if (!walletAddress || !collateralAssetId || !requestedAmount) {
      return res.status(400).json({ error: "walletAddress, collateralAssetId, requestedAmount required" });
    }

    const result = await creditService.applyForLoan({
      walletAddress,
      collateralAssetId,
      collateralShares: Number(collateralShares) || 0,
      requestedAmount: Number(requestedAmount),
    });

    res.json(result);
  } catch (error) {
    console.error("Loan application error:", error);
    res.status(500).json({ error: "Failed to process loan application" });
  }
});

module.exports = router;
