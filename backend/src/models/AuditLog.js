const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        "identity_created",
        "tier_upgraded",
        "wallet_frozen",
        "wallet_unfrozen",
        "transfer_validated",
        "transfer_blocked",
        "jurisdiction_changed",
        "aml_screened",
      ],
      index: true,
    },
    walletAddress: {
      type: String,
      required: true,
      index: true,
    },
    targetWallet: {
      type: String, // For transfers
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed, // JSON object for event-specific data
    },
    performedBy: {
      type: String, // Admin wallet or 'system'
      required: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt, which acts as timestamp
    strict: false, // In case we need flexibility, though not strictly required
  }
);

// Explicit index on createdAt for chronological queries
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
