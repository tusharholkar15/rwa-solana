/**
 * Multi-Oracle Aggregation Service
 * Simulates institutional-grade multi-oracle feeds (Pyth + Switchboard + TWAP fallback).
 */

const OracleFeed = require("../models/OracleFeed");
const Asset = require("../models/Asset");
const priceService = require("./priceService");
const auditService = require("./auditService");

class OracleService {
  constructor() {
    this.heartbeatInterval = null;
    this.TWAP_PERIOD_MS = 60 * 60 * 1000; // 1 hour for TWAP window
  }

  /**
   * Start the multi-oracle heartbeat
   */
  startHeartbeat(intervalMs = 15 * 60 * 1000) {
    if (this.heartbeatInterval) return;
    
    console.log("[OracleService] Starting multi-oracle aggregator...");
    
    this.heartbeatInterval = setInterval(async () => {
      try {
        const solPriceData = await priceService.getSolPrice();
        const liveSolPrice = solPriceData.price;
        
        const assets = await Asset.find({ isActive: true });
        for (const asset of assets) {
          const baseNav = asset.navPrice || asset.pricePerToken;
          
          // Use real SOL price to influence the asset's NAV based on its baseline
          // In a complex system, we'd have unique feed IDs per asset.
          // For the demo, we use SOL/USD as the reference market driver.
          const marketSentiment = liveSolPrice / 145.0; // Assume 145 is baseline
          
          // Pyth (Live Anchor)
          const pythPrice = baseNav * marketSentiment;
          // Simulate Switchboard with a small randomized noise around Pyth (Demo limitation)
          const sbPrice = pythPrice * (1 + (Math.random() * 0.002 - 0.001));

          // 1. Check spread threshold (Prevent manipulation)
          const spread = Math.abs(pythPrice - sbPrice) / baseNav;
          const MAX_ALLOWED_SPREAD = 0.05; // 5% spread triggers TWAP fallback
          
          let finalPrice = baseNav;
          let activeProviders = [];

          if (spread > MAX_ALLOWED_SPREAD) {
            // Circuit Breaker: Spread too high, use TWAP fallback
            console.warn(`[OracleService] High spread detected for ${asset._id} (${(spread * 100).toFixed(2)}%). Falling back to TWAP.`);
            
            await auditService.logEvent({
              eventType: "oracle_circuit_breaker",
              walletAddress: "system",
              details: {
                assetId: asset._id,
                reason: "HIGH_SPREAD",
                spread: (spread * 100).toFixed(4) + "%",
                pythPrice,
                sbPrice
              },
              performedBy: "oracle_aggregator"
            });

            finalPrice = await this.calculateTWAP(asset._id);
            activeProviders = ["TWAP_FALLBACK"];
          } else {
            // Normal Aggregation (Median of Pyth and Switchboard)
            const twapPrice = await this.calculateTWAP(asset._id);
            const prices = [pythPrice, sbPrice, twapPrice].filter(Boolean);
            
            // 2. Z-Score Anomaly Detection
            const mean = prices.reduce((a, b) => a + b) / prices.length;
            const variance = prices.reduce((a, b) => a + (b - mean) ** 2, 0) / prices.length;
            const stddev = Math.sqrt(variance);

            // Filter prices that are within 2 std devs
            const valid = prices.filter(p => Math.abs(p - mean) <= 2 * stddev);
            
            if (valid.length < 2) {
               console.warn(`[OracleService] Z-Score Anomaly: Rejecting divergent prices for ${asset._id}. Circuit breaker triggered.`);
               
               await auditService.logEvent({
                 eventType: "oracle_circuit_breaker",
                 walletAddress: "system",
                 details: {
                   assetId: asset._id,
                   reason: "Z_SCORE_ANOMALY",
                   prices: [pythPrice, sbPrice, twapPrice],
                   mean,
                   stddev
                 },
                 performedBy: "oracle_aggregator"
               });

               finalPrice = twapPrice; // Fallback
               activeProviders = ["TWAP_FALLBACK", "CIRCUIT_BREAKER"];
            } else {
               finalPrice = valid.reduce((a, b) => a + b) / valid.length;
               activeProviders = ["Pyth", "Switchboard", "Z_SCORE_VALIDATED"];
            }
          }

          // Publish aggregated update
          const feed = await this.publishNavUpdate({
            assetId: asset._id,
            provider: "MULTI_AGGREGATOR",
            navPrice: finalPrice,
            confidenceInterval: spread > MAX_ALLOWED_SPREAD ? 0.05 : 0.01,
            sourceTags: activeProviders,
          });
          
          // Broadcast via realtime service
          const realtimeService = require('./realtimeService');
          if (realtimeService) {
             realtimeService.publish(`asset:${asset._id}`, {
                type: 'PRICE_UPDATE',
                assetId: asset._id,
                data: feed
             });
          }
        }
      } catch (error) {
        console.error("[OracleService] Aggregator error:", error);
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
   * Computes Time-Weighted Average Price (TWAP) for the last hour
   */
  async calculateTWAP(assetId) {
    const cutoffTime = new Date(Date.now() - this.TWAP_PERIOD_MS);
    const history = await OracleFeed.find({
      assetId,
      timestamp: { $gte: cutoffTime }
    }).sort({ timestamp: 1 });

    if (history.length === 0) {
      const asset = await Asset.findById(assetId);
      return asset.navPrice || asset.pricePerToken;
    }

    if (history.length === 1) return history[0].navPrice;

    // Numerical Integration (Trapezoidal Rule for time-weighting)
    let cumulativeValue = 0;
    let totalTime = 0;

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      const timeDiff = curr.timestamp.getTime() - prev.timestamp.getTime();
      const avgPrice = (prev.navPrice + curr.navPrice) / 2;
      
      cumulativeValue += avgPrice * timeDiff;
      totalTime += timeDiff;
    }
    
    return totalTime > 0 ? cumulativeValue / totalTime : history[history.length - 1].navPrice;
  }

  /**
   * Manually publish a NAV valuation
   */
  async publishNavUpdate({ assetId, provider, navPrice, confidenceInterval = 0.02, sourceTags = [] }) {
    const feed = new OracleFeed({
      assetId,
      provider,
      navPrice: Number(navPrice.toFixed(2)),
      confidenceInterval,
      sourceTags,
    });
    await feed.save();

    const asset = await Asset.findById(assetId);
    if (asset) {
      asset.navPrice = Number(navPrice.toFixed(2));
      asset.lastOracleUpdate = feed.timestamp;
      
      // Update historical array for fast UI charts
      if (!asset.priceHistory) asset.priceHistory = [];
      asset.priceHistory.push({
        price: asset.navPrice,
        timestamp: feed.timestamp
      });
      // Keep last 100 points
      if (asset.priceHistory.length > 100) {
        asset.priceHistory = asset.priceHistory.slice(-100);
      }
      
      await asset.save();
    }
    return feed;
  }

  async getNavHistory(assetId, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return OracleFeed.find({ 
      assetId,
      timestamp: { $gte: cutoffDate }
    })
    .sort({ timestamp: 1 })
    .select("navPrice timestamp provider sourceTags");
  }
}

module.exports = new OracleService();
