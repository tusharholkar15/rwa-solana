const mongoose = require("mongoose");

const blockchainEventSchema = new mongoose.Schema(
  {
    // Transaction details
    txSignature: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    slot: {
      type: Number,
      required: true,
      index: true,
    },
    blockTime: {
      type: Date,
      required: true,
    },

    // Event classification
    eventType: {
      type: String,
      enum: [
        "asset_initialized",
        "asset_verified",
        "asset_tokenized",
        "shares_bought",
        "shares_sold",
        "shares_transferred",
        "yield_distributed",
        "price_updated",
        "user_whitelisted",
        "user_removed",
        "role_set",
        "pool_created",
        "swap_executed",
        "escrow_created",
        "escrow_settled",
        "escrow_disputed",
        "escrow_refunded",
        "proposal_created",
        "vote_cast",
        "proposal_executed",
        "config_updated",
      ],
      required: true,
      index: true,
    },

    // Participants
    primaryWallet: {
      type: String, // The main actor (buyer, seller, proposer, etc.)
      index: true,
    },
    secondaryWallet: String, // Counter-party if applicable

    // References
    assetAddress: String,
    assetName: String,

    // Event-specific data (flexible schema)
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Processing status
    isProcessed: {
      type: Boolean,
      default: true,
    },
    processingError: String,
  },
  { timestamps: true }
);

blockchainEventSchema.index({ eventType: 1, blockTime: -1 });
blockchainEventSchema.index({ primaryWallet: 1, eventType: 1 });
blockchainEventSchema.index({ assetAddress: 1, blockTime: -1 });

module.exports = mongoose.model("BlockchainEvent", blockchainEventSchema);
