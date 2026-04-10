const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    // On-chain data
    txHash: {
      type: String,
      sparse: true,
      index: true,
    },
    blockTime: Number,

    // User
    walletAddress: {
      type: String,
      required: true,
      index: true,
    },

    // Asset
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    assetName: String,

    // Transaction type
    type: {
      type: String,
      enum: ["buy", "sell", "transfer_in", "transfer_out", "yield"],
      required: true,
    },

    // Amounts
    shares: {
      type: Number,
      required: true,
      min: 0,
    },
    pricePerToken: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // For transfers
    counterpartyWallet: String,

    // Status
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed"],
      default: "confirmed",
    },

    // Fee
    fee: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ walletAddress: 1, createdAt: -1 });
transactionSchema.index({ assetId: 1, type: 1 });
transactionSchema.index({ status: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
