const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },

    // KYC status
    kycStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected", "expired"],
      default: "none",
    },
    kycSubmittedAt: Date,
    kycApprovedAt: Date,
    kycDocuments: [
      {
        type: {
          type: String,
          enum: ["passport", "drivers_license", "national_id", "utility_bill"],
        },
        documentId: String,
        status: {
          type: String,
          enum: ["pending", "verified", "rejected"],
          default: "pending",
        },
        submittedAt: { type: Date, default: Date.now },
      },
    ],

    // On-chain whitelist
    whitelistAddress: String,
    isWhitelisted: {
      type: Boolean,
      default: false,
    },

    // Role
    role: {
      type: String,
      enum: ["user", "admin", "issuer"],
      default: "user",
    },

    // Profile
    avatar: String,
    bio: {
      type: String,
      maxlength: 500,
    },

    // Activity
    lastLoginAt: Date,
    totalTransactions: {
      type: Number,
      default: 0,
    },
    totalInvested: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ kycStatus: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model("User", userSchema);
