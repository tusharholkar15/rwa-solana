const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    // On-chain identifiers
    onChainAddress: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    mintAddress: String,
    treasuryAddress: String,

    // Property details
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    location: {
      address: String,
      city: String,
      state: String,
      country: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    // Asset type and category
    assetType: {
      type: String,
      enum: [
        "residential",
        "commercial",
        "industrial",
        "land",
        "mixed-use",
        "hospitality",
        "gold",
        "art",
        "bond",
        "stock",
        "vehicle",
        "commodity",
      ],
      default: "residential",
    },

    // Media
    images: [String],
    documents: [
      {
        name: String,
        url: String,
        type: {
          type: String,
          enum: ["deed", "appraisal", "inspection", "insurance", "other"],
        },
      },
    ],

    // Legal & Compliance
    legalOpinion: {
      firm: String,
      documentHash: String, // Simulated IPFS hash
      status: {
        type: String,
        enum: ["pending", "verified", "revoked", "none"],
        default: "none",
      },
      lastValidated: Date,
    },

    // Financial details
    propertyValue: {
      type: Number,
      required: true,
      min: 0,
    },
    totalSupply: {
      type: Number,
      required: true,
      min: 1,
    },
    availableSupply: {
      type: Number,
      required: true,
      min: 0,
    },
    pricePerToken: {
      type: Number,
      required: true,
      min: 0,
    },
    annualYieldBps: {
      type: Number,
      default: 0,
      min: 0,
      max: 10000,
    },
    navPrice: {
      type: Number,
      min: 0,
    },
    lastOracleUpdate: {
      type: Date,
    },

    // Price history for charts
    priceHistory: [
      {
        price: Number,
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // Status
    status: {
      type: String,
      enum: ["draft", "active", "paused", "sold-out", "delisted"],
      default: "active",
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // ═══════════════════════════════════════════════════════
    // V2 Institutional Fields
    // ═══════════════════════════════════════════════════════
    lifecycleStatus: {
      type: String,
      enum: ["pending", "under_review", "verified", "tokenized", "active", "paused", "sold"],
      default: "pending",
    },
    verificationData: {
      verifier: String,
      fraudScore: Number,
      documentHashes: [{
        name: String,
        hash: String,
        ipfsUri: String,
        verifiedAt: Date,
      }],
      legalOpinionHash: String,
      approvedAt: Date,
      rejectionReason: String,
    },
    propertyHealth: {
      occupancyRate: { type: Number, min: 0, max: 100, default: 0 },
      lastInspectionAt: Date,
      rentCollectedYTD: { type: Number, default: 0 },
      maintenanceCostYTD: { type: Number, default: 0 },
    },
    complianceRules: {
      minComplianceTier: { type: Number, default: 1 },
      allowedJurisdictions: { type: [String], default: ["GLOBAL"] },
    },

    // ═══════════════════════════════════════════════════════
    // Oracle & Circuit Breaker State (Institutional Sync)
    // ═══════════════════════════════════════════════════════
    circuitBreaker: {
      isTripped: { type: Boolean, default: false },
      tripReason: { 
        type: String, 
        enum: ["none", "spread", "failure", "zscore", "drift", "manual"],
        default: "none"
      },
      trippedAt: Date,
      lastValidPrice: Number,
      worstSpreadBps: Number,
      consecutiveFailures: { type: Number, default: 0 },
      lastUpdateSlot: Number,
    },

    // Authority
    authority: {
      type: String,
      required: true,
    },

    // Stats
    totalInvestors: {
      type: Number,
      default: 0,
    },
    totalYieldDistributed: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
assetSchema.index({ status: 1, isActive: 1 });
assetSchema.index({ assetType: 1 });
assetSchema.index({ "location.city": 1 });
assetSchema.index({ pricePerToken: 1 });

module.exports = mongoose.model("Asset", assetSchema);
