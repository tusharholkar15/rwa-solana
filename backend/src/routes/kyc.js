const express = require("express");
const router = express.Router();
const kycService = require("../services/kycService");
const { validateKycSubmission } = require("../middleware/validation");

/**
 * POST /api/kyc/verify
 * Submit KYC documents for verification
 */
router.post("/verify", validateKycSubmission, async (req, res) => {
  try {
    const { walletAddress, documentType, documentId, name, email } = req.body;

    const result = await kycService.submitVerification(
      walletAddress,
      documentType,
      documentId,
      name,
      email
    );

    res.json(result);
  } catch (error) {
    console.error("KYC submission error:", error);
    res.status(500).json({ error: "Failed to submit KYC verification" });
  }
});

/**
 * GET /api/kyc/status/:wallet
 * Check KYC verification status
 */
router.get("/status/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;
    const status = await kycService.getStatus(wallet);
    res.json(status);
  } catch (error) {
    console.error("KYC status error:", error);
    res.status(500).json({ error: "Failed to fetch KYC status" });
  }
});

/**
 * POST /api/kyc/approve
 * Admin: Approve KYC verification
 */
router.post("/approve", async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address required" });
    }

    const result = await kycService.approveVerification(walletAddress);
    res.json(result);
  } catch (error) {
    console.error("KYC approval error:", error);
    res.status(500).json({ error: error.message || "Failed to approve KYC" });
  }
});

/**
 * POST /api/kyc/reject
 * Admin: Reject KYC verification
 */
router.post("/reject", async (req, res) => {
  try {
    const { walletAddress, reason } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address required" });
    }

    const result = await kycService.rejectVerification(walletAddress, reason);
    res.json(result);
  } catch (error) {
    console.error("KYC rejection error:", error);
    res.status(500).json({ error: error.message || "Failed to reject KYC" });
  }
});

/**
 * GET /api/kyc/pending
 * Admin: Get all pending KYC applications
 */
router.get("/pending", async (req, res) => {
  try {
    const applications = await kycService.getPendingApplications();
    res.json({ applications, count: applications.length });
  } catch (error) {
    console.error("Pending KYC error:", error);
    res.status(500).json({ error: "Failed to fetch pending applications" });
  }
});

module.exports = router;
