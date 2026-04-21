"use strict";

const Asset           = require("../models/Asset");
const solanaService   = require("./solanaService");
const realtimeService = require("./realtimeService");
const logger          = require("../config/logger");

/**
 * OracleMonitoringService
 * 
 * Periodically polls the Solana blockchain for the state of all active
 * OracleCircuitBreaker PDAs. Syncs results to MongoDB to power the 
 * Admin Hardening Dashboard and triggers real-time alerts on breaches.
 */
class OracleMonitoringService {
  constructor() {
    this.intervalId = null;
    this.pollIntervalMs = parseInt(process.env.ORACLE_MONITOR_MS, 10) || 60_000; // 1 minute default
    this.isProcessing = false;
  }

  /**
   * Start the monitoring loop
   */
  start() {
    if (this.intervalId) return;
    logger.info(`[OracleMonitoring] Starting loop (interval: ${this.pollIntervalMs}ms)`);
    this.intervalId = setInterval(() => this.syncAllBreakers(), this.pollIntervalMs);
    
    // Initial sync
    setTimeout(() => this.syncAllBreakers(), 5000);
  }

  /**
   * Stop the monitoring loop
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("[OracleMonitoring] Loop stopped");
    }
  }

  /**
   * Sync all active assets
   */
  async syncAllBreakers() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const activeAssets = await Asset.find({ isActive: true, onChainAddress: { $exists: true } });
      
      if (activeAssets.length === 0) {
        this.isProcessing = false;
        return;
      }

      logger.info(`[OracleMonitoring] Syncing ${activeAssets.length} asset(s)...`);

      for (const asset of activeAssets) {
        await this._syncAssetBreaker(asset);
      }
    } catch (err) {
      logger.error({ err }, "[OracleMonitoring] Global sync error");
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Internal helper to sync a single asset
   */
  async _syncAssetBreaker(asset) {
    try {
      const onChainState = await solanaService.getCircuitBreakerState(asset.onChainAddress);
      
      if (!onChainState) {
        logger.warn({ assetId: asset._id, address: asset.onChainAddress }, "[OracleMonitoring] Failed to fetch on-chain state");
        return;
      }

      const wasTripped = asset.circuitBreaker?.isTripped || false;
      const isTripped  = onChainState.isTripped;

      // Update Database
      await Asset.updateOne(
        { _id: asset._id },
        {
          $set: {
            "circuitBreaker.isTripped":          onChainState.isTripped,
            "circuitBreaker.tripReason":         onChainState.tripReason,
            "circuitBreaker.trippedAt":          onChainState.trippedAt,
            "circuitBreaker.lastValidPrice":     onChainState.lastValidPrice,
            "circuitBreaker.worstSpreadBps":     onChainState.worstSpreadBps,
            "circuitBreaker.consecutiveFailures": onChainState.consecutiveFailures,
            "circuitBreaker.lastUpdateSlot":     onChainState.lastUpdateSlot,
            lastOracleUpdate:                    new Date(),
          }
        }
      );

      // Alert if tripped
      if (!wasTripped && isTripped) {
        logger.error(
            { assetId: asset._id, name: asset.name, reason: onChainState.tripReason },
            "🚨 ORACLE CIRCUIT BREAKER TRIPPED!"
        );

        realtimeService.publish('WARN_ORACLE_BREACH', {
          type: 'ORACLE_TRIP',
          assetId: asset._id,
          name: asset.name,
          reason: onChainState.tripReason,
          timestamp: new Date()
        });
      } else if (wasTripped && !isTripped) {
        logger.info({ assetId: asset._id, name: asset.name }, "✅ Oracle circuit breaker reset for asset.");
      }

    } catch (err) {
      logger.error({ err, assetId: asset._id }, "[OracleMonitoring] Asset sync error");
    }
  }
}

module.exports = new OracleMonitoringService();
