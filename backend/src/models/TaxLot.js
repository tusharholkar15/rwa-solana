const mongoose = require("mongoose");

/**
 * Tax Lot Model
 * Tracks individual purchase "lots" to enable FIFO (First-In-First-Out)
 * capital gains calculations and institutional tax reporting.
 */
const taxLotSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      index: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    sharesTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    sharesRemaining: {
      type: Number,
      required: true,
      min: 0,
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    purchasePriceUsd: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["active", "sold"],
      default: "active",
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for FIFO sorting (oldest first)
taxLotSchema.index({ walletAddress: 1, assetId: 1, purchaseDate: 1 });

module.exports = mongoose.model("TaxLot", taxLotSchema);
