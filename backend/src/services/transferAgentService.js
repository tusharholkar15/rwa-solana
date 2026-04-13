const mongoose = require("mongoose");
const Asset = require("../models/Asset");

/**
 * Transfer Agent Service
 * 
 * Simulated integration with an SEC-registered Transfer Agent (e.g., Securitize).
 * Regulated assets require a 'golden source' ownership ledger maintained by
 * a licensed entity. This service syncs on-chain movements to the TA's off-chain DB.
 */
const BackgroundTask = require("../models/BackgroundTask");
const logger = require("../config/logger");

/**
 * Transfer Agent Service
 * 
 * Integration with an SEC-registered Transfer Agent.
 * This service now supports the Persistent Outbox pattern.
 */
class TransferAgentService {
  constructor() {
    this.syncDelayMs = process.env.NODE_ENV === "development" ? 10 : 1500;
  }

  /**
   * Queue a transfer for background syncing (Institutional Grade)
   * This should ideally be called within a MongoDB session.
   */
  async queueTransfer(assetId, fromWallet, toWallet, amount, session = null) {
    logger.info({ assetId, fromWallet, toWallet, amount }, "[TransferAgent] Recording persistent sync task");
    
    const task = new BackgroundTask({
      type: "TRANSFER_AGENT_SYNC",
      payload: { assetId, fromWallet, toWallet, amount, timestamp: new Date() }
    });

    await task.save({ session });
    return task;
  }

  /**
   * Process a single sync task (called by BackgroundWorker)
   */
  async processSync(payload) {
    const { assetId, fromWallet, toWallet, amount, timestamp } = payload;
    
    logger.info({ assetId, amount }, `[TransferAgent] Syncing transfer to external ledger...`);

    const asset = await Asset.findById(assetId);
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    // Simulate network latency to regulated endpoint
    await new Promise(r => setTimeout(r, this.syncDelayMs));

    // In production, this would be an API call to Securitize/Vertalo/etc.
    const transferReceipt = {
      transferAgentId: "TA-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      assetId: assetId.toString(),
      assetSymbol: asset.symbol,
      fromHolder: fromWallet,
      toHolder: toWallet,
      amount: amount,
      notionalValueUsd: amount * (asset.navPrice || asset.pricePerToken),
      status: "SETTLED",
      timestamp: timestamp || new Date().toISOString(),
    };

    logger.info({ receipt: transferReceipt.transferAgentId }, "[TransferAgent] Sync successful");
    return transferReceipt;
  }

  /**
   * Legacy method for backward compatibility (will map to queueTransfer)
   */
  async syncTransfer(assetId, fromWallet, toWallet, amount) {
    return this.queueTransfer(assetId, fromWallet, toWallet, amount);
  }
}

module.exports = new TransferAgentService();
