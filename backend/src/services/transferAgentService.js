const mongoose = require("mongoose");
const Asset = require("../models/Asset");

/**
 * Transfer Agent Service
 * 
 * Simulated integration with an SEC-registered Transfer Agent (e.g., Securitize).
 * Regulated assets require a 'golden source' ownership ledger maintained by
 * a licensed entity. This service syncs on-chain movements to the TA's off-chain DB.
 */
class TransferAgentService {
  constructor() {
    this.syncDelayMs = process.env.NODE_ENV === "development" ? 10 : 1500;
    this.queue = [];
    this.isProcessing = false;
  }

  async syncTransfer(assetId, fromWallet, toWallet, amount, timestamp = new Date()) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          console.log(`[TransferAgent] Syncing transfer for Asset ${assetId}: ${amount} shares from ${fromWallet} to ${toWallet}...`);

          const asset = await Asset.findById(assetId);
          if (!asset) {
            throw new Error(`Asset ${assetId} not found`);
          }

          await new Promise(r => setTimeout(r, this.syncDelayMs));

          const transferReceipt = {
            transferAgentId: "TA-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
            assetId: assetId.toString(),
            assetSymbol: asset.symbol,
            fromHolder: fromWallet,
            toHolder: toWallet,
            amount: amount,
            notionalValueUsd: amount * (asset.navPrice || asset.pricePerToken),
            status: "SETTLED",
            timestamp: timestamp.toISOString(),
          };

          console.log(`[TransferAgent] Transfer synced successfully. Receipt: ${transferReceipt.transferAgentId}`);
          resolve(transferReceipt);

        } catch (error) {
          console.error("[TransferAgent] Sync failed:", error);
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      try {
        await task();
      } catch (e) {
        // Task failure caught in its own promise wrapper
      }
    }
    
    this.isProcessing = false;
  }
}

module.exports = new TransferAgentService();
