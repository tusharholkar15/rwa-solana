const mongoose = require("mongoose");

const liquidityPoolSchema = new mongoose.Schema(
  {
    poolId: {
      type: String,
      required: true,
      unique: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    assetSymbol: {
      type: String,
      required: true,
    },
    tokenReserve: {
      type: Number,
      required: true,
      min: 0,
    },
    solReserve: {
      type: Number,
      required: true,
      min: 0,
    },
    k: {
      type: Number,
      required: true,
    },
    totalLpTokens: {
      type: Number,
      required: true,
    },
    feeRate: {
      type: Number,
      default: 0.003,
    },
    volume24h: {
      type: Number,
      default: 0,
    },
    fees24h: {
      type: Number,
      default: 0,
    },
    tvl: {
      type: Number,
      default: 0,
    },
    pricePerToken: {
      type: Number,
      default: 0,
    },
    creator: {
      type: String, // Wallet address
      required: true,
    },
    trades: [
      {
        tradeId: String,
        direction: String,
        amountIn: Number,
        tokensOut: Number,
        solOut: Number,
        fee: Number,
        priceImpact: Number,
        effectivePrice: Number,
        walletAddress: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

liquidityPoolSchema.index({ assetId: 1 });
liquidityPoolSchema.index({ poolId: 1 });

module.exports = mongoose.model("LiquidityPool", liquidityPoolSchema);
