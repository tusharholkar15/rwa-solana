const mongoose = require("mongoose");

const riskScoreSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },

    // Composite score
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    grade: {
      type: String,
      enum: ["A", "B", "C", "D", "F"],
      required: true,
    },

    // Factor breakdown (each 0–100)
    factors: {
      occupancy: {
        score: { type: Number, default: 50 },
        weight: { type: Number, default: 0.30 },
        details: String,
      },
      jurisdictionRisk: {
        score: { type: Number, default: 50 },
        weight: { type: Number, default: 0.20 },
        details: String,
      },
      priceVolatility: {
        score: { type: Number, default: 50 },
        weight: { type: Number, default: 0.20 },
        details: String,
      },
      yieldStability: {
        score: { type: Number, default: 50 },
        weight: { type: Number, default: 0.15 },
        details: String,
      },
      legalDocFreshness: {
        score: { type: Number, default: 50 },
        weight: { type: Number, default: 0.15 },
        details: String,
      },
    },

    // Historical context
    previousScore: Number,
    scoreDelta: Number,
    trend: {
      type: String,
      enum: ["improving", "stable", "declining"],
      default: "stable",
    },

    // Computation metadata
    computedAt: {
      type: Date,
      default: Date.now,
    },
    computedBy: {
      type: String,
      default: "system",
    },
    dataWindowDays: {
      type: Number,
      default: 90,
    },
  },
  { timestamps: true }
);

riskScoreSchema.index({ assetId: 1, computedAt: -1 });

module.exports = mongoose.model("RiskScore", riskScoreSchema);
