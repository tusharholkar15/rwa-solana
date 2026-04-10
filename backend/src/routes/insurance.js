/**
 * Insurance Routes
 */
const express = require("express");
const router = express.Router();
const insuranceService = require("../services/insuranceService");
const Asset = require("../models/Asset");

/**
 * GET /api/insurance/quote/:assetId
 * Get insurance quote for an asset holding
 */
router.get("/quote/:assetId", async (req, res) => {
  try {
    const { shares = 100, totalSupply } = req.query;
    const asset = await Asset.findById(req.params.assetId);

    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const quote = insuranceService.getQuote({
      assetType: asset.assetType,
      propertyValue: asset.propertyValue,
      country: asset.location?.country || "USA",
      shares: Number(shares),
      totalSupply: totalSupply ? Number(totalSupply) : asset.totalSupply,
    });

    quote.assetName = asset.name;
    quote.assetSymbol = asset.symbol;

    res.json(quote);
  } catch (error) {
    console.error("Insurance quote error:", error);
    res.status(500).json({ error: "Failed to generate quote" });
  }
});

/**
 * POST /api/insurance/activate
 * Activate an insurance policy
 */
router.post("/activate", async (req, res) => {
  try {
    const { walletAddress, assetId, tierId, quoteData } = req.body;

    if (!walletAddress || !assetId || !tierId) {
      return res.status(400).json({ error: "walletAddress, assetId, tierId required" });
    }

    // If no quoteData provided, generate fresh
    let quote = quoteData;
    if (!quote) {
      const asset = await Asset.findById(assetId);
      if (!asset) return res.status(404).json({ error: "Asset not found" });

      quote = insuranceService.getQuote({
        assetType: asset.assetType,
        propertyValue: asset.propertyValue,
        country: asset.location?.country || "USA",
        shares: 100,
        totalSupply: asset.totalSupply,
      });
    }

    const policy = insuranceService.activatePolicy({ walletAddress, assetId, tierId, quoteData: quote });
    res.json(policy);
  } catch (error) {
    console.error("Insurance activation error:", error);
    res.status(400).json({ error: error.message || "Failed to activate policy" });
  }
});

/**
 * POST /api/insurance/claim
 * File an insurance claim
 */
router.post("/claim", (req, res) => {
  try {
    const { policyId, walletAddress, claimType, description, estimatedLoss } = req.body;

    if (!policyId || !walletAddress || !claimType) {
      return res.status(400).json({ error: "policyId, walletAddress, claimType required" });
    }

    const claim = insuranceService.fileClaim({
      policyId,
      walletAddress,
      claimType,
      description: description || "",
      estimatedLoss: Number(estimatedLoss) || 0,
    });

    res.json(claim);
  } catch (error) {
    console.error("Claim filing error:", error);
    res.status(400).json({ error: error.message || "Failed to file claim" });
  }
});

/**
 * GET /api/insurance/policies/:wallet
 * Get user's active insurance policies
 */
router.get("/policies/:wallet", (req, res) => {
  try {
    const policies = insuranceService.getPolicies(req.params.wallet);
    res.json({ policies });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch policies" });
  }
});

/**
 * GET /api/insurance/claims/:wallet
 * Get user's insurance claims
 */
router.get("/claims/:wallet", (req, res) => {
  try {
    const claims = insuranceService.getClaims(req.params.wallet);
    res.json({ claims });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch claims" });
  }
});

module.exports = router;
