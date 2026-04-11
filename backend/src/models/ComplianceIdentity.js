const mongoose = require("mongoose");

const complianceIdentitySchema = new mongoose.Schema(
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
    },
    complianceTier: {
      type: Number,
      enum: [0, 1, 2, 3, 4], // 0: Anon, 1: Basic, 2: Accredited, 3: Inst, 4: Sovereign
      default: 0,
    },
    jurisdiction: {
      type: String, // ISO 3166-1 alpha-2 e.g., 'US', 'SG', 'GLOBAL' for Reg S
      uppercase: true,
      minlength: 2,
      maxlength: 6,
      default: "GLOBAL",
    },
    accreditationType: {
      type: String,
      enum: ["none", "reg_d_506c", "reg_s", "mifid_ii", "mas_sfa", "sebi_sandbox"],
      default: "none",
    },
    restrictions: {
      type: Number,
      default: 0, // Bitfield for granular flags
    },
    kycProviderHash: {
      type: String, // Reference to Onfido/Sumsub
    },
    expiryTimestamp: {
      type: Date,
    },
    isFrozen: {
      type: Boolean,
      default: false,
    },
    frozenReason: {
      type: String,
    },
    frozenAt: {
      type: Date,
    },
    frozenBy: {
      type: String, // Admin wallet
    },
    transferAgentId: {
      type: String, // Future Securitize sync reference
    },
    masterWallet: {
      type: String,
      default: null,
      index: true,
    },
    subAccounts: {
      type: [String],
      default: [],
    },
    maxInvestmentLimit: {
      type: Number, // Tier-based cap
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

complianceIdentitySchema.index({ complianceTier: 1 });
complianceIdentitySchema.index({ jurisdiction: 1 });
complianceIdentitySchema.index({ isFrozen: 1 });

module.exports = mongoose.model("ComplianceIdentity", complianceIdentitySchema);
