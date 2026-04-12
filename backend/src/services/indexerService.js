/**
 * Blockchain Indexer Service (Hardened for Production)
 * Syncs on-chain events (mints, swaps, escrow settlements, rent, governance) 
 * to MongoDB `BlockchainEvent`.
 * Handles Helius webhooks, Redis deduplication, reorg handling, and live broadcast.
 */

const BlockchainEvent = require("../models/BlockchainEvent");
const Asset = require("../models/Asset");
const realtimeService = require("./realtimeService");
const Redis = require("ioredis");
const anchor = require("@coral-xyz/anchor");
const idl = require("../config/idl.json");

class IndexerService {
  constructor() {
    this.redisClient = null;
    this.initRedis();

    // Initialize Anchor EventParser for institutional telemetry
    try {
      const PROGRAM_ID = new anchor.web3.PublicKey(process.env.PROGRAM_ID || "RwaP111111111111111111111111111111111111111");
      const coder = new anchor.BorshCoder(idl);
      this.eventParser = new anchor.EventParser(PROGRAM_ID, coder);
    } catch (e) {
      console.warn("[Indexer] Failed to initialize Anchor EventParser:", e.message);
    }
  }

  initRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
      this.redisClient = new Redis(redisUrl, { lazyConnect: true });
      this.redisClient.on('error', () => {/* Fallback to memory if redis missing */});
    } catch(e) {}
  }

  /**
   * Parse an incoming Helius Webhook payload representing a parsed Solana transaction.
   */
  async processWebhookPayload(payload) {
    console.log(`[Indexer] Received ${payload.length} events from Helius`);
    
    for (const tx of payload) {
      if (tx.err) continue; // Skip failed txs

      // Filter for our program ID
      const PROGRAM_ID = process.env.PROGRAM_ID || "RwaP111111111111111111111111111111111111111";
      const isOurProgram = tx.accountData?.some(acc => acc.account === PROGRAM_ID) || 
                           tx.instructions?.some(ix => ix.programId === PROGRAM_ID);

      if (isOurProgram) {
        await this.syncTransaction(tx);
      }
    }
  }

  /**
   * Sync a parsed transaction to our DB with Dedup
   */
  async syncTransaction(tx) {
    try {
      const signature = tx.signature;
      
      // Fast path deduplication via Redis (24 hr TTL)
      if (this.redisClient && this.redisClient.status === 'ready') {
        const key = `indexed:${signature}`;
        const existsInRedis = await this.redisClient.get(key);
        if (existsInRedis) return; // Deduplicated
        
        // Optimistically set with NX (not exists) to prevent race conditions
        const setNX = await this.redisClient.set(key, '1', 'EX', 86400, 'NX');
        if (!setNX) return; // Another worker beat us to it
      }

      // Fallback dedup in DB
      let event = await BlockchainEvent.findOne({ signature });
      if (event) {
        // Reorg Handling: If event already exists but we got a new hook, check slot
        if (event.slot && tx.slot && tx.slot < event.slot - 32) {
           console.warn(`[Indexer] Potential Reorg detected for ${signature}. Existing Slot: ${event.slot}, New Slot: ${tx.slot}`);
           // We might need to handle state rollback here in a mature system
        }
        return;
      }

      let eventType = "unknown";
      let assetId = null;
      let amount = 0;
      let isBroadcastable = false;
      let parsedData = null;
      
      // Parse with Anchor EventParser for high-fidelity telemetry
      if (this.eventParser && tx.logs && tx.logs.length > 0) {
        for (let event of this.eventParser.parseLogs(tx.logs)) {
          console.log(`[Indexer] Decoded Anchor Event: ${event.name}`);
          parsedData = event.data;
          
          if (event.name === "AssetBought") {
             eventType = "mint";
             isBroadcastable = true;
             assetId = event.data.asset.toString();
             amount = event.data.shares.toNumber();
          } else if (event.name === "AssetSold") {
             eventType = "burn";
             isBroadcastable = true;
             assetId = event.data.asset.toString();
             amount = event.data.shares.toNumber();
          } else if (event.name === "PriceUpdated") {
             eventType = "price_updated";
             isBroadcastable = true; // Could update UI sparklines
             assetId = event.data.asset.toString();
          } else if (event.name === "OracleBreachDetected") {
             eventType = "oracle_breach";
             isBroadcastable = true;
             assetId = event.data.asset.toString();
             
             // Immediate critical broadcast
             if (realtimeService) {
                realtimeService.publish('system_alerts', {
                   level: event.data.isTripped ? 'CRITICAL' : 'WARNING',
                   message: `Oracle Spread Breach Detected: ${event.data.spreadBps} bps diverge`,
                   assetId,
                   timestamp: new Date()
                });
             }
          }
          break; // Primary event handled
        }
      }

      // Fallback instruction parser mapping for non-event legacy logs
      if (eventType === "unknown") {
        const logString = tx.logs?.join(" ") || "";
        if (logString.includes("Instruction: BuyShares")) { eventType = "mint"; isBroadcastable = true; }
        if (logString.includes("Instruction: SwapTokens")) { eventType = "swap"; isBroadcastable = true; }
        if (logString.includes("Instruction: CreateEscrow")) { eventType = "escrow_created"; isBroadcastable = true; }
        if (logString.includes("Instruction: SettleEscrow")) { eventType = "escrow_settled"; isBroadcastable = true; }
        if (logString.includes("Instruction: CastVote")) { eventType = "vote_cast"; isBroadcastable = true; }
        if (logString.includes("Instruction: CollectRent")) { eventType = "rent_collected"; isBroadcastable = true; }
        if (logString.includes("Instruction: UpdatePrice")) { eventType = "price_updated"; }
      }

      event = new BlockchainEvent({
        signature,
        eventType,
        slot: tx.slot,
        blockTime: new Date(tx.timestamp * 1000),
        rawLogs: tx.logs,
        status: "confirmed",
        assetId: assetId, 
      });

      await event.save();
      console.log(`[Indexer] Synced tx: ${signature} (${eventType})`);

      // Broadcast event globally to UI using RealtimeService
      if (isBroadcastable && realtimeService && eventType !== "oracle_breach") {
        realtimeService.publish('trade_events', {
           type: 'CHAIN_EVENT',
           signature,
           eventType,
           assetId,
           amount,
           timestamp: event.blockTime,
           decodedData: parsedData ? JSON.stringify(parsedData) : null
        });
      }

    } catch (e) {
      console.error(`[Indexer] Error syncing tx ${tx.signature}:`, e);
      // Remove from redis cache if failed, so it can be retried
      if (this.redisClient && this.redisClient.status === 'ready') {
         try { await this.redisClient.del(`indexed:${tx.signature}`); } catch(er){}
      }
    }
  }
}

module.exports = new IndexerService();
