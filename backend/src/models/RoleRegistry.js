const mongoose = require("mongoose");

const roleRegistrySchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["investor", "issuer", "admin", "auditor"],
      default: "investor",
      required: true,
    },
    grantedBy: {
      type: String,
      required: true,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
    permissions: {
      type: [String],
      default: [],
      // Granular permissions: 'assets:create', 'assets:approve', 'kyc:manage',
      // 'governance:execute', 'escrow:arbitrate', 'oracle:override', 'admin:config'
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    revokedAt: Date,
    revokedBy: String,
    revokeReason: String,

    // Audit trail
    roleHistory: [
      {
        previousRole: String,
        newRole: String,
        changedBy: String,
        changedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
  },
  { timestamps: true }
);

roleRegistrySchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model("RoleRegistry", roleRegistrySchema);
