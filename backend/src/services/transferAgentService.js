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
    // In a real system, you'd store API keys for the TA provider here.
    this.syncDelayMs = 1500; // Simulate network call to TA API
  }

  /**
   * Sync a token transfer with the Transfer Agent's ledger
   */
  async syncTransfer(assetId, fromWallet, toWallet, amount, timestamp = new Date()) {
    try {
      console.log(`[TransferAgent] Syncing transfer for Asset ${assetId}: ${amount} shares from ${fromWallet} to ${toWallet}...`);

      // 1. Validate the asset exists
      const asset = await Asset.findById(assetId);
      if (!asset) {
        throw new Error(`Asset ${assetId} not found`);
      }

      // 2. Simulate API call to Securitize / tZERO
      await new Promise(resolve => setTimeout(resolve, this.syncDelayMs));

      // 3. Simulated response
      const transferReceipt = {
        transferAgentId: "TA-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
        assetId: assetId.toString(),
        assetSymbol: asset.symbol,
        fromHolder: fromWallet,
        toHolder: toWallet,
        amount: amount,
        notionalValueUsd: amount * asset.navPrice || amount * asset.pricePerToken,
        status: "SETTLED",
        timestamp: timestamp.toISOString(),
      };

      console.log(`[TransferAgent] Transfer synced successfully. Receipt: ${transferReceipt.transferAgentId}`);

      // In production we would save this receipt to an immutable AuditLog collection.
      
      return transferReceipt;

    } catch (error) {
      console.error("[TransferAgent] Sync failed:", error);
      // Depending on strictness, a sync failure might need to queue for retry
      // or trigger a compliance alert, but we usually won't reverse the on-chain trade.
      throw error;
    }
  }
}

module.exports = new TransferAgentService();
