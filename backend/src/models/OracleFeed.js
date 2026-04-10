const mongoose = require("mongoose");

const oracleFeedSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    provider: {
      type: String, // e.g., 'CBRE_GLOBAL', 'JLL_VALUATION', 'ADMIN_MANUAL', 'SYSTEM_SIMULATOR'
      required: true,
    },
    navPrice: {
      type: Number,
      required: true,
    },
    confidenceInterval: {
      type: Number, // e.g., 0.05 representing +/- 5% confidence
      default: 0.02,
    },
    sourceTags: {
      type: [String], // e.g., ['SIMULATED'], ['ADMIN'], ['ON_CHAIN']
      default: [],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("OracleFeed", oracleFeedSchema);
