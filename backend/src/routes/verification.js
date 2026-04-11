/**
 * Verification Routes
 * Handles asset verification workflow: submission, approval, rejection, and lifecycle transitions.
 */

const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");
const auditService = require("../services/auditService");

// POST /api/verification/submit — Issuer submits asset for review
router.post("/submit", async (req, res) => {
  try {
    const {
      assetId,
      documents, // [{ name, hash, ipfsUri }]
      walletAddress,
    } = req.body;

    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    if (!asset.verificationData) asset.verificationData = {};
    asset.verificationData.documentHashes = documents.map((doc) => ({
      name: doc.name,
      hash: doc.hash,
      ipfsUri: doc.ipfsUri,
      verifiedAt: null,
    }));
    asset.lifecycleStatus = "under_review";
    await asset.save();

    await auditService.logEvent({
      eventType: "verification_submitted",
      walletAddress,
      details: { assetId, documentCount: documents.length },
    });

    res.json({
      message: "Verification documents submitted",
      assetId: asset._id,
      status: asset.lifecycleStatus,
      documentCount: documents.length,
    });
  } catch (error) {
    console.error("Verification submit error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/verification/approve/:id — Admin approves asset verification
router.post("/approve/:id", async (req, res) => {
  try {
    const { fraudScore = 0, verifierWallet, legalOpinionHash } = req.body;
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    if (!["under_review", "pending"].includes(asset.lifecycleStatus)) {
      return res.status(400).json({
        error: `Cannot approve asset in '${asset.lifecycleStatus}' status`,
      });
    }

    if (fraudScore > 30) {
      return res.status(400).json({
        error: "Fraud score too high for approval (max 30)",
      });
    }

    if (!asset.verificationData) asset.verificationData = {};
    asset.verificationData.verifier = verifierWallet;
    asset.verificationData.fraudScore = fraudScore;
    asset.verificationData.legalOpinionHash = legalOpinionHash;
    asset.verificationData.approvedAt = new Date();
    asset.verificationData.rejectionReason = null;

    // Mark all documents as verified
    if (asset.verificationData.documentHashes) {
      asset.verificationData.documentHashes.forEach((doc) => {
        doc.verifiedAt = new Date();
      });
    }

    asset.lifecycleStatus = "verified";
    await asset.save();

    await auditService.logEvent({
      eventType: "asset_verified",
      walletAddress: verifierWallet,
      details: { assetId: asset._id, fraudScore },
    });

    res.json({
      message: "Asset verified successfully",
      asset: {
        id: asset._id,
        name: asset.name,
        lifecycleStatus: asset.lifecycleStatus,
        fraudScore,
      },
    });
  } catch (error) {
    console.error("Verification approve error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/verification/reject/:id — Admin rejects asset
router.post("/reject/:id", async (req, res) => {
  try {
    const { reason, verifierWallet } = req.body;
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    if (!asset.verificationData) asset.verificationData = {};
    asset.verificationData.rejectionReason = reason;
    asset.verificationData.verifier = verifierWallet;
    asset.lifecycleStatus = "pending"; // Back to pending
    await asset.save();

    await auditService.logEvent({
      eventType: "asset_rejected",
      walletAddress: verifierWallet,
      details: { assetId: asset._id, reason },
    });

    res.json({ message: "Asset rejected", assetId: asset._id, reason });
  } catch (error) {
    console.error("Verification reject error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/verification/queue — Admin gets pending verifications
router.get("/queue", async (req, res) => {
  try {
    const pending = await Asset.find({
      lifecycleStatus: { $in: ["pending", "under_review"] },
    })
      .sort({ createdAt: -1 })
      .select("name symbol location assetType propertyValue lifecycleStatus createdAt verificationData");

    res.json({ count: pending.length, assets: pending });
  } catch (error) {
    console.error("Verification queue error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/verification/history/:id — Full verification audit trail
router.get("/history/:id", async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id).select(
      "name lifecycleStatus verificationData"
    );
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    const auditTrail = await auditService.getEventsForAsset
      ? await auditService.getEventsForAsset(req.params.id)
      : [];

    res.json({
      asset: {
        name: asset.name,
        lifecycleStatus: asset.lifecycleStatus,
        verificationData: asset.verificationData,
      },
      auditTrail,
    });
  } catch (error) {
    console.error("Verification history error:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/verification/lifecycle/:id — Admin transitions lifecycle state
router.patch("/lifecycle/:id", async (req, res) => {
  try {
    const { newStatus, adminWallet, reason } = req.body;
    const validStatuses = [
      "pending", "under_review", "verified", "tokenized", "active", "paused", "sold",
    ];

    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: `Invalid status: ${newStatus}` });
    }

    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    const previousStatus = asset.lifecycleStatus;
    asset.lifecycleStatus = newStatus;
    asset.isActive = newStatus === "active";
    await asset.save();

    await auditService.logEvent({
      eventType: "lifecycle_transition",
      walletAddress: adminWallet,
      details: { assetId: asset._id, from: previousStatus, to: newStatus, reason },
    });

    res.json({
      message: `Lifecycle transitioned: ${previousStatus} → ${newStatus}`,
      asset: { id: asset._id, lifecycleStatus: newStatus },
    });
  } catch (error) {
    console.error("Lifecycle transition error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
