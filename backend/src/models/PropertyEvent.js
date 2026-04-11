const mongoose = require("mongoose");

const propertyEventSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        "rent_collected",
        "maintenance",
        "occupancy_change",
        "inspection",
        "renovation",
        "sale_pending",
        "insurance_renewal",
        "tax_payment",
        "tenant_change",
        "valuation_update",
      ],
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    period: {
      type: String, // e.g., "Q1 2026", "March 2026"
    },
    description: {
      type: String,
      maxlength: 500,
    },
    evidenceHash: {
      type: String, // IPFS hash of supporting document
    },
    evidenceUrl: {
      type: String, // S3/IPFS URL
    },
    reportedBy: {
      type: String, // wallet address of reporter (issuer or property manager)
      required: true,
    },
    verifiedBy: {
      type: String, // admin wallet that validated
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,

    // Occupancy-specific fields
    occupancyRate: {
      type: Number,
      min: 0,
      max: 100,
    },
    previousOccupancyRate: Number,

    // Maintenance-specific fields
    maintenanceCategory: {
      type: String,
      enum: ["routine", "emergency", "capital_improvement", "cosmetic"],
    },
    vendor: String,
    invoiceNumber: String,
  },
  { timestamps: true }
);

propertyEventSchema.index({ assetId: 1, eventType: 1 });
propertyEventSchema.index({ assetId: 1, createdAt: -1 });
propertyEventSchema.index({ isVerified: 1 });

module.exports = mongoose.model("PropertyEvent", propertyEventSchema);
