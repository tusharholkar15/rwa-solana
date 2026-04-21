const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        "oracle_breach", 
        "circuit_breaker_trip", 
        "guardian_reset", 
        "large_trade", 
        "system_pause", 
        "config_update",
        "yield_harvest"
      ],
      index: true,
    },
    severity: {
      type: String,
      enum: ["info", "warn", "error", "critical"],
      default: "info",
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    walletAddress: {
      type: String,
      index: true,
    },
    targetWallet: {
      type: String,
      index: true,
    },
    signature: String, // Solana transaction signature if applicable
    performedBy: {
      type: String,
      default: "system",
    },
    // Compliance Fields
    ipAddress: String,
    jurisdiction: String,
    amlScore: Number,
    regulatorFlag: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

// Index for chronological reporting
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
