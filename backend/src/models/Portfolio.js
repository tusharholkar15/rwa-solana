const mongoose = require("mongoose");

const holdingSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    shares: {
      type: Number,
      required: true,
      min: 0,
    },
    avgBuyPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalInvested: {
      type: Number,
      default: 0,
    },
    totalYieldReceived: {
      type: Number,
      default: 0,
    },
    autoCompoundEnabled: {
      type: Boolean,
      default: false,
    },
    reinvestmentThreshold: {
      type: Number,
      default: 100_000_000, // 0.1 SOL in lamports
    },
    firstPurchaseAt: Date,
    lastTransactionAt: Date,
  },
  { _id: false }
);

const portfolioSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Holdings
    holdings: [holdingSchema],

    // Aggregated stats
    totalValue: {
      type: Number,
      default: 0,
    },
    totalInvested: {
      type: Number,
      default: 0,
    },
    totalYieldEarned: {
      type: Number,
      default: 0,
    },
    totalRealizedPnl: {
      type: Number,
      default: 0,
    },

    // Portfolio history for charts
    valueHistory: [
      {
        value: Number,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Portfolio", portfolioSchema);
