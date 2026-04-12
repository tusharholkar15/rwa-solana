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

    // Event classification (Legacy)
    eventType: {
      type: String,
      index: true,
    },

    // Strict classification
    type: {
      type: String,
      enum: ["BUY", "SELL", "PRICE", "ORACLE_ALERT", "UNKNOWN"],
      default: "UNKNOWN",
      index: true,
    },

    // Participants
    primaryWallet: {
      type: String, // Legacy support
      index: true,
    },
    wallet: {
      type: String, // Updated explicitly requested schema field
      index: true,
    },
    secondaryWallet: String,

    // References
    assetAddress: String, // Legacy support
    assetId: {
      type: String, // Updated explicitly requested schema field
      index: true,
    },
    assetName: String,

    // Event-specific numeric data
    amount: {
      type: Number,
      default: 0,
    },

    // Event-specific data (flexible schema)
    data: {
      type: mongoose.Schema.Types.Mixed, // Legacy support
      default: {},
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Explicitly requested field
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
