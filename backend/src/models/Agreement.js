const mongoose = require("mongoose");

const agreementSchema = new mongoose.Schema(
  {
    agreementId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    version: { type: String, required: true },
    walletAddress: { type: String, required: true, index: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
    assetName: { type: String },
    terms: { type: mongoose.Schema.Types.Mixed },
    riskDisclosures: [String],
    status: { 
      type: String, 
      enum: ["pending_signature", "signed", "expired", "revoked"], 
      default: "pending_signature" 
    },
    generatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    signedAt: { type: Date },
    signatureHash: { type: String },
    signatureMethod: { type: String }
  },
  { timestamps: true }
);

agreementSchema.index({ walletAddress: 1, status: 1 });

module.exports = mongoose.model("Agreement", agreementSchema);
