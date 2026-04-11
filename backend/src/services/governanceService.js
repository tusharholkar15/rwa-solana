/**
 * Governance Service
 * Manages off-chain governance proposal metadata, voting mirrors, and execution tracking.
 */

const GovernanceProposal = require("../models/GovernanceProposal");
const Asset = require("../models/Asset");
const auditService = require("./auditService");
const crypto = require("crypto");

class GovernanceService {
  /**
   * Create a new governance proposal (off-chain metadata)
   */
  async createProposal({
    assetId, proposer, proposalType, title, description,
    votingPeriodDays = 7, quorumBps = 5100, attachments = [],
  }) {
    const asset = await Asset.findById(assetId);
    if (!asset) throw new Error("Asset not found");

    const descriptionHash = crypto
      .createHash("sha256")
      .update(description)
      .digest("hex");

    const now = new Date();
    const voteEnd = new Date(now.getTime() + votingPeriodDays * 24 * 60 * 60 * 1000);

    const proposal = new GovernanceProposal({
      assetId,
      proposer,
      proposalType,
      title,
      description,
      descriptionHash,
      voteStart: now,
      voteEnd,
      quorumBps,
      attachments,
    });

    await proposal.save();

    await auditService.logEvent({
      eventType: "proposal_created",
      walletAddress: proposer,
      details: { assetId, proposalType, title, quorumBps },
    });

    return proposal;
  }

  /**
   * Record a vote (mirror from on-chain event)
   */
  async recordVote(proposalId, { voter, choice, weight, txSignature }) {
    const proposal = await GovernanceProposal.findById(proposalId);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.status !== "active") throw new Error("Proposal is not active");

    // Check for duplicate vote
    const existing = proposal.votes.find((v) => v.voter === voter);
    if (existing) throw new Error("Already voted");

    proposal.votes.push({
      voter,
      choice,
      weight,
      votedAt: new Date(),
      txSignature,
    });

    // Update tallies
    if (choice === "for") proposal.votesFor += weight;
    else if (choice === "against") proposal.votesAgainst += weight;
    else proposal.votesAbstain += weight;

    proposal.voterCount += 1;
    await proposal.save();

    return proposal;
  }

  /**
   * Finalize a proposal (check results after voting period)
   */
  async finalizeProposal(proposalId) {
    const proposal = await GovernanceProposal.findById(proposalId).populate("assetId");
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.status !== "active") throw new Error("Proposal already finalized");
    if (new Date() < proposal.voteEnd) throw new Error("Voting period not yet ended");

    const totalSupply = proposal.assetId?.totalSupply || 0;
    const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
    const quorumThreshold = (totalSupply * proposal.quorumBps) / 10000;

    const quorumMet = totalVotes >= quorumThreshold;
    const passed = quorumMet && proposal.votesFor > proposal.votesAgainst;

    proposal.status = passed ? "passed" : "failed";
    await proposal.save();

    await auditService.logEvent({
      eventType: "proposal_finalized",
      walletAddress: "system",
      details: {
        proposalId,
        status: proposal.status,
        votesFor: proposal.votesFor,
        votesAgainst: proposal.votesAgainst,
        quorumMet,
      },
    });

    return proposal;
  }

  /**
   * Mark a proposal as executed
   */
  async markExecuted(proposalId, executedBy, txSignature) {
    const proposal = await GovernanceProposal.findById(proposalId);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.status !== "passed") throw new Error("Only passed proposals can be executed");

    proposal.status = "executed";
    proposal.executedAt = new Date();
    proposal.executedBy = executedBy;
    proposal.executionTxSignature = txSignature;
    await proposal.save();

    return proposal;
  }

  /**
   * Get proposals for an asset
   */
  async getProposals(assetId, status = null, limit = 20) {
    const query = {};
    if (assetId && assetId !== 'all') query.assetId = assetId;
    if (status) query.status = status;

    return GovernanceProposal.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("-votes"); // Exclude individual votes for list view
  }

  /**
   * Get proposal details with votes
   */
  async getProposalDetails(proposalId) {
    return GovernanceProposal.findById(proposalId).populate("assetId", "name symbol totalSupply");
  }

  /**
   * Get vote breakdown for a proposal
   */
  async getVoteBreakdown(proposalId) {
    const proposal = await GovernanceProposal.findById(proposalId);
    if (!proposal) throw new Error("Proposal not found");

    const totalSupply = (await Asset.findById(proposal.assetId))?.totalSupply || 0;
    const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;

    return {
      votesFor: proposal.votesFor,
      votesAgainst: proposal.votesAgainst,
      votesAbstain: proposal.votesAbstain,
      voterCount: proposal.voterCount,
      totalVotes,
      totalSupply,
      participation: totalSupply > 0 ? ((totalVotes / totalSupply) * 100).toFixed(2) : 0,
      quorumRequired: proposal.quorumBps / 100,
      quorumMet: totalVotes >= (totalSupply * proposal.quorumBps) / 10000,
      voters: proposal.votes,
    };
  }
}

module.exports = new GovernanceService();
