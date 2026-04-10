/**
 * Compliance & Legal Routes
 */
const express = require("express");
const router = express.Router();
const complianceService = require("../services/complianceService");
const auditService = require("../services/auditService");
const { requireWalletSignature, requireAdminWallet } = require("../middleware/authMiddleware");

/**
 * POST /api/compliance/verify-document
 * Submit a document for verification
 */
router.post("/verify-document", async (req, res) => {
  try {
    const { documentType, documentData, walletAddress } = req.body;

    if (!documentType || !walletAddress) {
      return res.status(400).json({ error: "documentType and walletAddress are required" });
    }

    const result = await complianceService.verifyDocument({
      documentType,
      documentData: documentData || {},
      walletAddress,
    });

    res.json(result);
  } catch (error) {
    console.error("Document verification error:", error);
    res.status(500).json({ error: error.message || "Verification failed" });
  }
});

/**
 * POST /api/compliance/generate-agreement
 * Generate a digital investment agreement
 */
router.post("/generate-agreement", async (req, res) => {
  try {
    const { walletAddress, assetId, assetName, shares, pricePerToken, totalAmount } = req.body;

    if (!walletAddress || !assetId) {
      return res.status(400).json({ error: "walletAddress and assetId are required" });
    }

    const agreement = await complianceService.generateAgreement({
      walletAddress,
      assetId,
      assetName: assetName || "Unknown Asset",
      shares: shares || 1,
      pricePerToken: pricePerToken || 0,
      totalAmount: totalAmount || 0,
    });

    res.json(agreement);
  } catch (error) {
    console.error("Agreement generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate agreement" });
  }
});

/**
 * POST /api/compliance/sign-agreement
 * Sign a digital agreement
 */
router.post("/sign-agreement", async (req, res) => {
  try {
    const { agreementId, walletAddress, signatureHash } = req.body;

    if (!agreementId || !walletAddress) {
      return res.status(400).json({ error: "agreementId and walletAddress are required" });
    }

    const result = await complianceService.signAgreement({
      agreementId,
      walletAddress,
      signatureHash,
    });

    res.json(result);
  } catch (error) {
    console.error("Agreement signing error:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/compliance/agreements/:wallet
 * Get user's signed/pending agreements
 */
router.get("/agreements/:wallet", (req, res) => {
  try {
    const agreements = complianceService.getAgreementsByWallet(req.params.wallet);
    res.json({ agreements });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch agreements" });
  }
});

/**
 * GET /api/compliance/asset-docs/:assetId
 * Get public legal documents for an asset
 */
router.get("/asset-docs/:assetId", (req, res) => {
  try {
    const documents = complianceService.getAssetDocuments(req.params.assetId);
    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

/**
 * POST /api/compliance/aml-screen
 * Screen a wallet for AML compliance
 */
router.post("/aml-screen", async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress is required" });
    }
    const result = await complianceService.screenWallet(walletAddress);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "AML screening failed" });
  }
});

// --- Institutional Compliance Routes ---

/**
 * POST /api/compliance/identity
 * Create a new compliance identity
 */
router.post("/identity", async (req, res) => {
  try {
    const { walletAddress, tier, jurisdiction, accreditationType } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress is required" });
    }
    const identity = await complianceService.createIdentity({
      walletAddress,
      tier,
      jurisdiction,
      accreditationType,
      adminWallet: "system", // Normally user request
    });
    res.json(identity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/compliance/identity/:wallet
 * Get identity details
 */
router.get("/identity/:wallet", async (req, res) => {
  try {
    const identity = await complianceService.getIdentity(req.params.wallet);
    res.json(identity || { status: "not_found" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/compliance/identity/:wallet/tier
 * Admin: Update identity tier
 */
router.put("/identity/:wallet/tier", requireWalletSignature, requireAdminWallet, async (req, res) => {
  try {
    const { tier } = req.body;
    if (tier === undefined) return res.status(400).json({ error: "tier is required" });
    const identity = await complianceService.updateTier({
      walletAddress: req.params.wallet,
      newTier: tier,
      adminWallet: req.walletAddress,
    });
    res.json(identity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/compliance/identity/:wallet/freeze
 * Admin: Freeze wallet
 */
router.post("/identity/:wallet/freeze", requireWalletSignature, requireAdminWallet, async (req, res) => {
  try {
    const { reason } = req.body;
    const identity = await complianceService.freezeWallet({
      walletAddress: req.params.wallet,
      reason: reason || "Admin action",
      adminWallet: req.walletAddress,
    });
    res.json({ success: true, identity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/compliance/identity/:wallet/unfreeze
 * Admin: Unfreeze wallet
 */
router.post("/identity/:wallet/unfreeze", requireWalletSignature, requireAdminWallet, async (req, res) => {
  try {
    const identity = await complianceService.unfreezeWallet({
      walletAddress: req.params.wallet,
      adminWallet: req.walletAddress,
    });
    res.json({ success: true, identity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/compliance/identities
 * Admin: List all identities
 */
router.get("/identities", requireWalletSignature, requireAdminWallet, async (req, res) => {
  try {
    const { tier, jurisdiction, isFrozen, skip, limit } = req.query;
    const filters = {};
    if (tier) filters.complianceTier = Number(tier);
    if (jurisdiction) filters.jurisdiction = jurisdiction;
    if (isFrozen) filters.isFrozen = isFrozen === "true";

    const result = await complianceService.listIdentities(filters, {
      skip: Number(skip) || 0,
      limit: Number(limit) || 50,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/compliance/validate-transfer
 * Validate if a transfer is compliant
 */
router.post("/validate-transfer", async (req, res) => {
  try {
    const { fromWallet, toWallet, assetId, amount } = req.body;
    if (!fromWallet || !toWallet) {
      return res.status(400).json({ error: "fromWallet and toWallet are required" });
    }
    const result = await complianceService.validateTransfer({
      fromWallet,
      toWallet,
      assetId,
      amount,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/compliance/audit-trail
 * Admin: Query audit events
 */
router.get("/audit-trail", requireWalletSignature, requireAdminWallet, async (req, res) => {
  try {
    const { walletAddress, eventType, startDate, endDate, skip, limit } = req.query;
    const filters = {};
    if (walletAddress) filters.walletAddress = walletAddress;
    if (eventType) filters.eventType = eventType;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await auditService.queryEvents(filters, {
      skip: Number(skip) || 0,
      limit: Number(limit) || 50,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/compliance/link-subaccount
 * Link a child wallet to the master wallet
 */
router.post("/link-subaccount", requireWalletSignature, async (req, res) => {
  try {
    const { childWallet } = req.body;
    const masterWallet = req.walletAddress;

    if (!childWallet) {
      return res.status(400).json({ error: "childWallet is required" });
    }

    const result = await complianceService.linkSubAccount({
      masterWallet,
      childWallet,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/compliance/unlink-subaccount
 * Unlink a child wallet from the master wallet
 */
router.post("/unlink-subaccount", requireWalletSignature, async (req, res) => {
  try {
    const { childWallet } = req.body;
    const masterWallet = req.walletAddress;

    if (!childWallet) {
      return res.status(400).json({ error: "childWallet is required" });
    }

    const result = await complianceService.unlinkSubAccount({
      masterWallet,
      childWallet,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/compliance/jurisdictions
 * Get supported jurisdictions
 */
router.get("/jurisdictions", (req, res) => {
  res.json({
    jurisdictions: [
      { code: "US", name: "United States", requiresAccredited: true },
      { code: "GLOBAL", name: "Global (Reg S)", requiresAccredited: false },
    ],
  });
});

module.exports = router;
