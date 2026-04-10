const mongoose = require("mongoose");

const otcOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    walletAddress: {
      type: String, // Wallet address of the order maker
      required: true,
    },
    side: {
      type: String,
      enum: ["bid", "ask"], // "bid" = buy, "ask" = sell
      required: true,
    },
    shares: {
      type: Number,
      required: true,
      min: 0,
    },
    pricePerShare: {
      type: Number, // In SOL
      required: true,
      min: 0,
    },
    totalValue: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "filled", "cancelled", "expired"],
      default: "open",
    },
    filledShares: {
      type: Number,
      default: 0,
    },
    isDark: {
      type: Boolean,
      default: false,
    },
    minimumFill: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

otcOrderSchema.index({ assetId: 1, status: 1 });
otcOrderSchema.index({ walletAddress: 1 });
otcOrderSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("OTCOrder", otcOrderSchema);
