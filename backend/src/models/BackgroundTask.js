const mongoose = require("mongoose");

const backgroundTaskSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["TRANSFER_AGENT_SYNC", "REGULATORY_REPORT", "NOTIFICATION", "LEDGER_RECONCILE"],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: String,
    processAfter: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedAt: Date,
    relatedObjectId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
  },
  { timestamps: true }
);

// Index for efficient worker polling
backgroundTaskSchema.index({ status: 1, processAfter: 1 });

module.exports = mongoose.model("BackgroundTask", backgroundTaskSchema);
