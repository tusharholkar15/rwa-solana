const Asset = require("../models/Asset");
const propertyLifecycleService = require("./propertyLifecycleService");
const realtimeService = require("./realtimeService");
const auditService = require("./auditService");

/**
 * Rent Service
 * Manages the collection and reconciliation of USDC rent payments,
 * and triggers pro-rata yield distributions to token holders.
 */
class RentService {
  /**
   * Collect rent payment from a property manager.
   * This prepares the on-chain collection transaction.
   */
  async collectRent({ assetId, amountUsdc, memo, propertyManagerWallet, txSignature }) {
    if (amountUsdc <= 0) throw new Error("Rent amount must be positive");

    const asset = await Asset.findById(assetId);
    if (!asset) throw new Error("Asset not found");

    // Process rent in the property lifecycle (adds an event and updates YTD)
    const period = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const event = await propertyLifecycleService.recordRentCollection(
      assetId,
      amountUsdc,
      period,
      txSignature,
      propertyManagerWallet
    );

    // Update real-time rent data for the dashboard
    if (!asset.rentStats) asset.rentStats = { totalCollected: 0, pendingDistribution: 0 };
    
    asset.rentStats.totalCollected += amountUsdc;
    // Assume 10% reserve contribution roughly matching smart contract
    const distributable = amountUsdc * 0.9;
    asset.rentStats.pendingDistribution += distributable;
    asset.rentStats.lastCollectionAt = new Date();
    
    await asset.save();

    // Log the institutional audit trail
    await auditService.logEvent({
      eventType: "usdc_rent_collected",
      walletAddress: propertyManagerWallet,
      details: {
        assetId,
        amountUsdc,
        netDistributable: distributable,
        txSignature,
        memo
      },
    });

    // Broadcast the event to all users viewing the asset
    realtimeService.publish(`asset:${assetId}`, {
      type: 'RENT_COLLECTED',
      assetId,
      data: {
        amount: amountUsdc,
        period,
        timestamp: new Date()
      }
    });

    return {
      success: true,
      pendingDistributionTotal: asset.rentStats.pendingDistribution,
      event
    };
  }

  /**
   * Distribute pending USDC yield to an individual holder.
   * (In production, this would be scheduled by BullMQ per-holder).
   */
  async distributeYieldToHolder({ assetId, holderWallet, sharesOwned, totalShares, txSignature }) {
    const asset = await Asset.findById(assetId);
    if (!asset || !asset.rentStats) throw new Error("Asset or rent stats not found");

    // Calculate holder's pro-rata share
    const holderRatio = sharesOwned / totalShares;
    const holderAmount = asset.rentStats.pendingDistribution * holderRatio;

    // Log audit trail
    await auditService.logEvent({
      eventType: "usdc_yield_distributed",
      walletAddress: holderWallet,
      details: {
        assetId,
        sharesOwned,
        holderAmount,
        txSignature
      },
    });

    // Notify the user globally
    realtimeService.publish(`portfolio:${holderWallet}`, {
      type: 'YIELD_RECEIVED',
      assetId,
      data: {
        amount: holderAmount,
        assetName: asset.name,
        timestamp: new Date()
      }
    });

    return {
      success: true,
      amountDistributed: holderAmount,
      txSignature
    };
  }
}

module.exports = new RentService();
