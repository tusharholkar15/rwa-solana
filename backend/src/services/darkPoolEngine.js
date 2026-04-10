/**
 * Secondary Market Dark Pool Engine
 * Handles off-chain order matching and institutional block trade settlement
 */

const OTCOrder = require("../models/OTCOrder");
const complianceService = require("./complianceService");
const auditService = require("./auditService");
const transferAgentService = require("./transferAgentService");
const { v4: uuidv4 } = require("uuid");

class DarkPoolEngine {
  /**
   * Place a dark order with mandatory compliance checks
   */
  async placeDarkOrder({ walletAddress, assetId, side, price, shares, minimumFill = 0, isDark = true }) {
    // 1. Mandatory Compliance Check
    const identity = await complianceService.getIdentity(walletAddress);
    
    if (!identity) {
      throw new Error("Compliance identity required to participate in Dark Pool.");
    }

    if (identity.complianceTier < 3) {
      throw new Error("Institutional Tier (T3+) required for Dark Pool access.");
    }

    if (identity.isFrozen) {
      throw new Error("Account is currently frozen by compliance. Actions restricted.");
    }

    // 2. Create Order
    const orderId = `dark_${uuidv4().substring(0, 8)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const order = new OTCOrder({
      orderId,
      assetId,
      walletAddress,
      side,
      shares,
      pricePerShare: price,
      totalValue: price * shares,
      isDark,
      minimumFill,
      status: "open",
      expiresAt,
    });

    await order.save();

    // 3. Audit Log
    await auditService.logEvent({
      eventType: "identity_created", // Reusing event types or we could add 'order_placed'
      walletAddress,
      details: { orderId, assetId, side, shares, price, isDark },
      performedBy: "system",
    });

    // 4. Trigger Matching Engine (Async)
    this.matchOrders(assetId).catch(console.error);

    return order;
  }

  /**
   * Matching Engine: Find crossing orders for a specific asset
   */
  async matchOrders(assetId) {
    const bids = await OTCOrder.find({ assetId, side: "bid", status: "open" }).sort({ pricePerShare: -1, createdAt: 1 });
    const asks = await OTCOrder.find({ assetId, side: "ask", status: "open" }).sort({ pricePerShare: 1, createdAt: 1 });

    for (const bid of bids) {
      for (const ask of asks) {
        if (ask.status !== "open") continue;

        // Price check: Do the prices cross?
        if (bid.pricePerShare >= ask.pricePerShare) {
          // Found a match!
          await this.executeTrade(bid, ask);
        }
      }
    }
  }

  /**
   * Execute and Settle a trade between a Bid and an Ask
   */
  async executeTrade(bid, ask) {
    const executionPrice = (bid.pricePerShare + ask.pricePerShare) / 2; // Midpoint pricing
    const executionShares = Math.min(bid.shares - bid.filledShares, ask.shares - ask.filledShares);

    if (executionShares <= 0) return;

    // Check minimum fill requirements
    if (executionShares < bid.minimumFill || executionShares < ask.minimumFill) {
      return;
    }

    // Comprehensive Compliance Validation for the specific transfer
    const validation = await complianceService.validateTransfer({
      fromWallet: ask.walletAddress, // Seller
      toWallet: bid.walletAddress,   // Buyer
      assetId: bid.assetId.toString(),
      amount: executionShares
    });

    if (!validation.valid) {
      console.log(`Trade blocked by compliance: ${validation.reason}`);
      return;
    }

    // Atomic updates (Simulated on-chain movement)
    bid.filledShares += executionShares;
    ask.filledShares += executionShares;

    if (bid.filledShares >= bid.shares) bid.status = "filled";
    if (ask.filledShares >= ask.shares) ask.status = "filled";

    await bid.save();
    await ask.save();

    // Audit logs for both parties
    await auditService.logEvent({
      eventType: "transfer_validated",
      walletAddress: ask.walletAddress,
      targetWallet: bid.walletAddress,
      details: { 
        type: "dark_pool_trade",
        price: executionPrice,
        shares: executionShares,
        bidId: bid.orderId,
        askId: ask.orderId
      }
    });

    console.log(`[DarkPool] Executed trade: ${executionShares} shares @ ${executionPrice} SOL`);

    // Async sync with Transfer Agent
    transferAgentService.syncTransfer(
      bid.assetId.toString(),
      ask.walletAddress, // Seller
      bid.walletAddress, // Buyer
      executionShares
    ).catch(err => console.error("[Background] DarkPool TA Sync Failed:", err.message));
  }

  async getActiveDarkOrders(walletAddress) {
    return await OTCOrder.find({ walletAddress, isDark: true, status: "open" }).sort({ createdAt: -1 });
  }

  async getMarketStats(assetId) {
    const totalVolume = await OTCOrder.aggregate([
      { $match: { assetId, status: "filled", isDark: true } },
      { $group: { _id: null, total: { $sum: "$totalValue" } } }
    ]);

    return {
      assetId,
      darkVolume: totalVolume[0]?.total || 0,
      timestamp: new Date()
    };
  }
}

module.exports = new DarkPoolEngine();
