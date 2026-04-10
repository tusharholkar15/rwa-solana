/**
 * Oracle Service
 * Simulates on-chain real-world asset valuation feeds (NAV Oracles).
 * Handles both controlled simulation heartbeats and manual administrative overrides.
 */

const OracleFeed = require("../models/OracleFeed");
const Asset = require("../models/Asset");

class OracleService {
  constructor() {
    this.heartbeatInterval = null;
  }

  /**
   * Start the controlled heartbeat to simulate live NAV fluctuations
   * Recommend calling this when the backend starts up
   */
  startHeartbeat(intervalMs = 15 * 60 * 1000) { // Default 15 minutes
    if (this.heartbeatInterval) return;
    
    console.log("[OracleService] Starting simulated NAV heartbeat...");
    
    this.heartbeatInterval = setInterval(async () => {
      try {
        const assets = await Asset.find({ isActive: true });
        for (const asset of assets) {
          // Determine current NAV, default to market price if NAV is unset
          const baseNav = asset.navPrice || asset.pricePerToken;
          
          // Random fluctuation between -0.2% and +0.2%
          const variance = baseNav * (Math.random() * 0.004 - 0.002);
          const newNav = Math.max(0.1, baseNav + variance);
          
          await this.publishNavUpdate({
            assetId: asset._id,
            provider: "SYSTEM_SIMULATOR",
            navPrice: newNav,
            confidenceInterval: 0.02,
            sourceTags: ["SIMULATED", "HEARTBEAT"],
          });
        }
      } catch (error) {
        console.error("[OracleService] Heartbeat error:", error);
      }
    }, intervalMs);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Manually publish a new NAV valuation
   */
  async publishNavUpdate({ assetId, provider, navPrice, confidenceInterval = 0.02, sourceTags = [] }) {
    // 1. Log the feed update
    const feed = new OracleFeed({
      assetId,
      provider,
      navPrice: Number(navPrice.toFixed(2)),
      confidenceInterval,
      sourceTags,
    });
    await feed.save();

    // 2. Update the main Asset document
    const asset = await Asset.findById(assetId);
    if (asset) {
      asset.navPrice = Number(navPrice.toFixed(2));
      asset.lastOracleUpdate = feed.timestamp;
      await asset.save();
    }

    return feed;
  }

  /**
   * Get the historical NAV timeline for charting
   */
  async getNavHistory(assetId, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const history = await OracleFeed.find({ 
      assetId,
      timestamp: { $gte: cutoffDate }
    })
    .sort({ timestamp: 1 })
    .select("navPrice timestamp provider sourceTags");

    return history;
  }
}

// Export a singleton
module.exports = new OracleService();
