/**
 * Multi-Oracle Aggregation Service
 * Simulates institutional-grade multi-oracle feeds (Pyth + Switchboard + TWAP fallback).
 */

const OracleFeed = require("../models/OracleFeed");
const Asset = require("../models/Asset");
const priceService = require("./priceService");
const auditService = require("./auditService");

const logger = require("../config/logger");
const anchorClient = require("../config/anchorClient");
const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");

class OracleService {
  constructor() {
    this.heartbeatRun = false;
    this.TWAP_PERIOD_MS = 60 * 60 * 1000;
    this.isSolanaConnected = false;

    // Skip Anchor initialization in test mode
    if (process.env.NODE_ENV !== "test") {
      // Initialize Solana on boot
      anchorClient.initialize()
        .then(() => { this.isSolanaConnected = true; })
        .catch(() => { this.isSolanaConnected = false; });
    }
  }

  async startHeartbeat(intervalMs = 15 * 60 * 1000) {
    if (this.heartbeatRun) return;
    this.heartbeatRun = true;
    logger.info("[OracleService] Starting recursive multi-oracle heartbeat...");

    const run = async () => {
      if (!this.heartbeatRun) return;
      try {
        const solPriceData = await priceService.getSolPrice();
        const liveSolPrice = solPriceData.price;
        const assets = await Asset.find({ isActive: true });

        for (const asset of assets) {
          await this.processAssetOracle(asset, liveSolPrice);
        }
      } catch (error) {
        logger.error({ error: error.message }, "[OracleService] Heartbeat loop error");
      } finally {
        if (this.heartbeatRun) {
          setTimeout(run, intervalMs);
        }
      }
    };

    run();
  }

  async processAssetOracle(asset, liveSolPrice) {
    try {
      const baseNav = asset.navPrice || asset.pricePerToken;
      let pythPrice, sbPrice;

      if (asset.rehearsalMode === "price_divergence") {
        // Case A: High Spread (Pyth vs Switchboard)
        pythPrice = baseNav;
        sbPrice = baseNav * 1.1; // 10% spread anomaly
        logger.info({ assetId: asset._id }, "REHEARSAL: Forcing Price Divergence (10% spread)");
      } else if (asset.rehearsalMode === "spike") {
        // Case B: Z-Score Anomaly (Sudden flash spike)
        pythPrice = baseNav * 1.5; // 50% spike
        sbPrice = pythPrice;
        logger.info({ assetId: asset._id }, "REHEARSAL: Forcing Price Spike (50% change)");
      } else {
        // Normal simulated market behavior
        const marketSentiment = liveSolPrice / 145.0; 
        pythPrice = baseNav * marketSentiment;
        sbPrice = pythPrice * (1 + (Math.random() * 0.002 - 0.001));
      }

      const spread = Math.abs(pythPrice - sbPrice) / baseNav;
      const MAX_ALLOWED_SPREAD = 0.05; 
      
      let finalPrice = baseNav;
      let activeProviders = [];

      if (spread > MAX_ALLOWED_SPREAD) {
        logger.warn({ assetId: asset._id, spread }, "[OracleService] Circuit breaker TRIP: High spread. Pausing asset.");
        
        // Automated Safeguard: Pause the asset on-platform
        asset.status = "paused";
        asset.isActive = false;
        asset.pausalReason = `ORACLE_HIGH_SPREAD: ${(spread * 100).toFixed(2)}%`;
        await asset.save();

        await auditService.logEvent({
          eventType: "oracle_circuit_breaker",
          walletAddress: "system",
          details: { assetId: asset._id, reason: "HIGH_SPREAD", spread, pythPrice, sbPrice, action: "AUTO_PAUSE" },
          performedBy: "oracle_aggregator"
        });

        finalPrice = await this.calculateTWAP(asset._id);
        activeProviders = ["TWAP_FALLBACK", "CIRCUIT_BREAKER_TRIPPED"];
      } else {
        const twapPrice = await this.calculateTWAP(asset._id);
        const prices = [pythPrice, sbPrice, twapPrice].filter(Boolean);
        
        const mean = prices.reduce((a, b) => a + b) / prices.length;
        const variance = prices.reduce((a, b) => a + (b - mean) ** 2, 0) / prices.length;
        const stddev = Math.sqrt(variance);

        const valid = prices.filter(p => Math.abs(p - mean) <= 2 * stddev);
        
        if (valid.length < 2) {
           logger.warn({ assetId: asset._id, prices }, "[OracleService] Circuit breaker TRIP: Z-Score Anomaly. Pausing asset.");
           
           asset.status = "paused";
           asset.isActive = false;
           asset.pausalReason = "ORACLE_Z_SCORE_ANOMALY";
           await asset.save();

           await auditService.logEvent({
             eventType: "oracle_circuit_breaker",
             walletAddress: "system",
             details: { assetId: asset._id, reason: "Z_SCORE_ANOMALY", prices, mean, stddev, action: "AUTO_PAUSE" },
             performedBy: "oracle_aggregator"
           });
           finalPrice = twapPrice;
           activeProviders = ["TWAP_FALLBACK", "CIRCUIT_BREAKER_TRIPPED"];
        } else {
           finalPrice = valid.reduce((a, b) => a + b) / valid.length;
           activeProviders = ["Pyth", "Switchboard", "Z_SCORE_VALIDATED"];
        }
      }

      // ── Solana On-Chain Sync ───────────────────────────────────────────────
      if (this.isSolanaConnected && asset.onChainAddress) {
        try {
          const program = anchorClient.getProgram();
          const assetPubkey = new PublicKey(asset.onChainAddress);
          
          // Derive PDAs
          const [cbAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("circuit_breaker"), assetPubkey.toBuffer()],
            program.programId
          );
          const [historyAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("price_history"), assetPubkey.toBuffer()],
            program.programId
          );

          // Pyth Testnet Price Feed (Default to SOL/USD if not configured per asset)
          // Feed: J83w4P9N k k k k k k k k k k k k k k k k k k 
          // Actually we need the PriceUpdateV2 account. 
          // On Testnet: 7UVim1guvfS7uR9v86KCHiVNm8asH677V6UFDzC2Q8Ym
          const PYTH_PRICE_UPDATE_TESTNET = new PublicKey("7UVim1guvfS7uR9v86KCHiVNm8asH677V6UFDzC2Q8Ym");

          logger.info({ assetId: asset._id, assetPubkey: asset.onChainAddress }, "[OracleService] Syncing price to Solana...");

          const tx = await program.methods
            .updatePrice(
              new anchor.BN(Math.floor(sbPrice * 1e9)), // Switchboard simulation
              new anchor.BN(Math.floor(finalPrice * 1e9)) // Local TWAP reference
            )
            .accounts({
              authority: anchorClient.wallet.publicKey,
              asset: assetPubkey,
              circuitBreaker: cbAddress,
              priceUpdate: asset.rehearsalMode === "oracle_staleness" 
                ? assetPubkey // Pass wrong account type to trigger failure check on-chain
                : PYTH_PRICE_UPDATE_TESTNET,
              switchboardAggregator: asset.switchboardAggregator || PublicKey.default, // New account in UpdatePrice
              priceHistory: historyAddress,
            })
            .rpc();

          logger.info({ tx, assetId: asset._id }, "[OracleService] Solana sync SUCCESS");
          activeProviders.push("SOLANA_SYNCED");

          // ── Step 2: Post-Sync Reconciliation ───────────────────────────────
          // Fetch the on-chain circuit breaker state to ensure DB matches reality
          const solanaService = require("./solanaService");
          const cbState = await solanaService.getCircuitBreakerState(asset.onChainAddress);
          if (cbState) {
            asset.circuitBreaker = cbState;
            // Also sync the top-level isActive flag
            asset.isActive = !cbState.isTripped;
            if (cbState.isTripped) {
              asset.status = "paused";
              asset.pausalReason = `CIRCUIT_BREAKER_${cbState.tripReason.toUpperCase()}`;
            }
            await asset.save();
            logger.info({ assetId: asset._id, isTripped: cbState.isTripped }, "[OracleService] On-chain state RECONCILED");
          }
        } catch (solErr) {
          logger.error({ err: solErr.message, assetId: asset._id }, "[OracleService] Solana sync FAILED");
          activeProviders.push("SOLANA_SYNC_ERROR");
        }
      }

      await this.publishNavUpdate({
        assetId: asset._id,
        provider: "MULTI_AGGREGATOR",
        navPrice: finalPrice,
        confidenceInterval: spread > MAX_ALLOWED_SPREAD ? 0.05 : 0.01,
        sourceTags: activeProviders,
      });
    } catch (err) {
      logger.error({ err: err.message, assetId: asset._id }, "[OracleService] Asset processing failed");
    }
  }

  stopHeartbeat() {
    this.heartbeatRun = false;
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

  async getHealth() {
    const stats = {
      isHeartbeatActive: this.heartbeatRun,
      lastSolPrice: await priceService.getSolPrice(),
      activeAssets: await Asset.countDocuments({ isActive: true }),
      pausedAssets: await Asset.countDocuments({ status: "paused" }),
      timestamp: new Date()
    };
    return stats;
  }
}

module.exports = new OracleService();
