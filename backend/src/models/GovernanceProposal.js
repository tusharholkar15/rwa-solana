const mongoose = require("mongoose");

const governanceProposalSchema = new mongoose.Schema(
  {
    // On-chain reference
    onChainAddress: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    proposer: {
      type: String, // wallet address
      required: true,
    },
    proposalType: {
      type: String,
      enum: ["sell_property", "renovation", "rent_change", "general_vote", "emergency_action", "oracle_reset"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 64,
    },
    description: {
      type: String, // Full description (off-chain, IPFS hash stored on-chain)
      required: true,
      maxlength: 5000,
    },
    descriptionHash: {
      type: String, // SHA-256 hash matching on-chain
    },

    // Voting configuration
    voteStart: {
      type: Date,
      required: true,
    },
    voteEnd: {
      type: Date,
      required: true,
    },
    quorumBps: {
      type: Number,
      default: 5100, // 51%
    },

    // Vote tallies (mirrored from chain via indexer)
    votesFor: { type: Number, default: 0 },
    votesAgainst: { type: Number, default: 0 },
    votesAbstain: { type: Number, default: 0 },
    voterCount: { type: Number, default: 0 },

    // Individual votes (off-chain mirror for UI)
    votes: [
      {
        voter: String,
        choice: { type: String, enum: ["for", "against", "abstain"] },
        weight: Number,
        votedAt: Date,
        txSignature: String,
      },
    ],

    // Status
    status: {
      type: String,
      enum: ["active", "passed", "failed", "executed", "cancelled"],
      default: "active",
    },
    executedAt: Date,
    executedBy: String,
    executionTxSignature: String,

    // Stake
    stakeAmount: { type: Number, default: 100000000 }, // 0.1 SOL in lamports

    // Discussion
    discussionUrl: String, // Link to forum/Discord thread
    attachments: [
      {
        name: String,
        url: String,
        hash: String,
      },
    ],
  },
  { timestamps: true }
);

governanceProposalSchema.index({ assetId: 1, status: 1 });
governanceProposalSchema.index({ voteEnd: 1, status: 1 });

module.exports = mongoose.model("GovernanceProposal", governanceProposalSchema);
