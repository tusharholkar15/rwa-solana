const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Portfolio = require("../models/Portfolio");
const priceService = require("../services/priceService");
const solanaService = require("../services/solanaService");
const { requireAdmin } = require("../middleware/auth");

/**
 * GET /api/admin/stats
 * Platform-wide statistics dashboard
 */
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const [
      totalAssets,
      activeAssets,
      totalUsers,
      kycApproved,
      kycPending,
      totalTransactions,
      recentTransactions,
    ] = await Promise.all([
      Asset.countDocuments(),
      Asset.countDocuments({ isActive: true, status: "active" }),
      User.countDocuments(),
      User.countDocuments({ kycStatus: "approved" }),
      User.countDocuments({ kycStatus: "pending" }),
      Transaction.countDocuments(),
      Transaction.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select("type assetName shares totalAmount walletAddress createdAt"),
    ]);

    // Calculate total value locked
    const assets = await Asset.find({ isActive: true });
    const totalValueLocked = assets.reduce((sum, a) => {
      return sum + (a.totalSupply - a.availableSupply) * a.pricePerToken;
    }, 0);

    // Volume stats
    const volumeAgg = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalVolume: { $sum: "$totalAmount" },
          totalShares: { $sum: "$shares" },
          avgTransactionSize: { $avg: "$totalAmount" },
        },
      },
    ]);

    const volume = volumeAgg[0] || {
      totalVolume: 0,
      totalShares: 0,
      avgTransactionSize: 0
    };

    // Get market data
    const market = await priceService.getMarketOverview();

    // Get Solana cluster info
    const clusterInfo = await solanaService.getClusterInfo();

    res.json({
      platform: {
        totalAssets,
        activeAssets,
        totalUsers,
        kycApproved,
        kycPending,
        totalTransactions,
        totalValueLocked,
        totalVolume: volume.totalVolume,
        avgTransactionSize: volume.avgTransactionSize,
      },
      market,
      cluster: clusterInfo,
      recentTransactions,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

/**
 * GET /api/admin/users
 * List all users with KYC status
 */
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, kycStatus, role } = req.query;

    const filter = {};
    if (kycStatus) filter.kycStatus = kycStatus;
    if (role) filter.role = role;

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select("-kycDocuments");

    res.json({
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Admin users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * PATCH /api/admin/assets/:id/toggle
 * Toggle asset active status
 */
router.patch("/assets/:id/toggle", requireAdmin, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    asset.isActive = !asset.isActive;
    asset.status = asset.isActive ? "active" : "paused";
    await asset.save();

    res.json({
      message: `Asset ${asset.isActive ? "activated" : "paused"}`,
      asset: { id: asset._id, name: asset.name, isActive: asset.isActive },
    });
  } catch (error) {
    console.error("Toggle asset error:", error);
    res.status(500).json({ error: "Failed to toggle asset" });
  }
});

/**
 * GET /api/admin/metrics
 * Auditing & Infrastructure Performance Metrics
 */
router.get("/metrics", requireAdmin, async (req, res) => {
  try {
    const redis = require("../config/redis");
    const mongoStatus = require("../config/database").isDatabaseConnected();
    const redisStats = redis.getStats();

    res.json({
      timestamp: new Date().toISOString(),
      infrastructure: {
        database: {
          provider: "MongoDB",
          status: mongoStatus ? "CONNECTED" : "DISCONNECTED",
        },
        cache: {
          provider: "Redis",
          ...redisStats,
        },
      },
      process: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        node: process.version,
      }
    });
  } catch (error) {
    console.error("Admin metrics error:", error);
    res.status(500).json({ error: "Failed to fetch infrastructure metrics" });
  }
});

module.exports = router;
