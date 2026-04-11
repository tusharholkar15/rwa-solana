/**
 * Governance Routes
 * Handles proposal creation, voting, execution, and vote breakdown.
 */

const express = require("express");
const router = express.Router();
const governanceService = require("../services/governanceService");

// POST /api/governance/proposals — Create a new governance proposal
router.post("/proposals", async (req, res) => {
  try {
    const {
      assetId, proposer, proposalType, title, description,
      votingPeriodDays, quorumBps, attachments,
    } = req.body;

    if (!assetId || !proposer || !title || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const proposal = await governanceService.createProposal({
      assetId, proposer, proposalType, title, description,
      votingPeriodDays, quorumBps, attachments,
    });

    res.status(201).json({ message: "Proposal created", proposal });
  } catch (error) {
    console.error("Create proposal error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/governance/proposals/:assetId — List proposals for an asset
router.get("/proposals/:assetId", async (req, res) => {
  try {
    const { status, limit } = req.query;
    const proposals = await governanceService.getProposals(
      req.params.assetId,
      status || null,
      parseInt(limit) || 20
    );
    res.json({ count: proposals.length, proposals });
  } catch (error) {
    console.error("List proposals error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/governance/proposal/:id — Get proposal details
router.get("/proposal/:id", async (req, res) => {
  try {
    const proposal = await governanceService.getProposalDetails(req.params.id);
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });
    res.json(proposal);
  } catch (error) {
    console.error("Get proposal error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/governance/vote — Cast a vote
router.post("/vote", async (req, res) => {
  try {
    const { proposalId, voter, choice, weight, txSignature } = req.body;

    if (!proposalId || !voter || !choice) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const proposal = await governanceService.recordVote(proposalId, {
      voter, choice, weight: weight || 1, txSignature,
    });

    res.json({ message: "Vote recorded", proposalId, choice, weight });
  } catch (error) {
    console.error("Vote error:", error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/governance/votes/:proposalId — Vote breakdown
router.get("/votes/:proposalId", async (req, res) => {
  try {
    const breakdown = await governanceService.getVoteBreakdown(req.params.proposalId);
    res.json(breakdown);
  } catch (error) {
    console.error("Vote breakdown error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/governance/finalize/:id — Finalize a proposal
router.post("/finalize/:id", async (req, res) => {
  try {
    const proposal = await governanceService.finalizeProposal(req.params.id);
    res.json({ message: `Proposal ${proposal.status}`, proposal });
  } catch (error) {
    console.error("Finalize error:", error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/governance/execute/:id — Admin executes a passed proposal
router.post("/execute/:id", async (req, res) => {
  try {
    const { executedBy, txSignature } = req.body;
    const proposal = await governanceService.markExecuted(
      req.params.id, executedBy, txSignature
    );
    res.json({ message: "Proposal executed", proposal });
  } catch (error) {
    console.error("Execute error:", error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
