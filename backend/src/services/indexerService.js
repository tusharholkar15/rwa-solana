/**
 * Blockchain Indexer Service (Hardened for Production)
 * Syncs on-chain events via Helius webhooks.
 * Implements robust Anchor EventParser decoding, fault-tolerant fallback,
 * Pino structured logging, and idempotent DB persistance.
 */

const BlockchainEvent = require("../models/BlockchainEvent");
const realtimeService = require("./realtimeService");
const Redis = require("ioredis");
const anchor = require("@coral-xyz/anchor");
const idl = require("../config/idl.json");
const logger = require("../config/logger");

class IndexerService {
  constructor() {
    this.redisClient = null;
    this.initRedis();

    // Initialize Anchor EventParser for institutional telemetry
    try {
      const PROGRAM_ID = new anchor.web3.PublicKey(process.env.PROGRAM_ID || "RwaP111111111111111111111111111111111111111");
      const coder = new anchor.BorshCoder(idl);
      this.eventParser = new anchor.EventParser(PROGRAM_ID, coder);
      logger.info("[Indexer] Successfully initialized Anchor EventParser");
    } catch (e) {
      logger.error({ err: e }, "[Indexer] Failed to initialize Anchor EventParser");
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
    logger.info(`[Indexer] Received ${payload.length} events from webhook`);
    
    // We do NOT block event loop, wrap processing in concurrent map if needed.
    const promises = payload.map(async (tx) => {
      if (tx.err) return; // Skip failed txs

      // Filter for our program ID
      const PROGRAM_ID = process.env.PROGRAM_ID || "RwaP111111111111111111111111111111111111111";
      const isOurProgram = tx.accountData?.some(acc => acc.account === PROGRAM_ID) || 
                           tx.instructions?.some(ix => ix.programId === PROGRAM_ID);

      if (isOurProgram) {
        await this.syncTransaction(tx);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Sync a parsed transaction to our DB with Idempotency
   */
  async syncTransaction(tx) {
    const signature = tx.signature;
    try {
      // Fast path deduplication via Redis (24 hr TTL)
      if (this.redisClient && this.redisClient.status === 'ready') {
        const key = `indexed:${signature}`;
        const setNX = await this.redisClient.set(key, '1', 'EX', 86400, 'NX');
        if (!setNX) return; // Another worker beat us to it
      }

      let type = "UNKNOWN";
      let legacyEventType = "unknown";
      let assetId = null;
      let wallet = null;
      let amount = 0;
      let isBroadcastable = false;
      let parsedData = null;
      let broadcastTopic = null;
      
      // Phase 1: Robust Event Parsing
      if (this.eventParser && tx.logs && tx.logs.length > 0) {
        try {
          for (let event of this.eventParser.parseLogs(tx.logs)) {
            logger.info({ eventName: event.name }, `[Indexer] Decoded Anchor Event`);
            parsedData = { ...event.data };
            
            // Transform BN/Pubkeys to strings/numbers for DB & Broadcast
            for (let key in parsedData) {
              if (parsedData[key] && typeof parsedData[key].toString === 'function') {
                if (parsedData[key].toNumber && !parsedData[key].isZero()) {
                   try { parsedData[key] = parsedData[key].toNumber(); } catch(e) { parsedData[key] = parsedData[key].toString(); }
                } else {
                   parsedData[key] = parsedData[key].toString();
                }
              }
            }

            if (event.name === "AssetBought") {
               type = "BUY";
               legacyEventType = "shares_bought";
               isBroadcastable = true;
               broadcastTopic = "trade_events";
               assetId = parsedData.asset;
               wallet = parsedData.buyer;
               amount = parsedData.shares || 0;
            } else if (event.name === "AssetSold") {
               type = "SELL";
               legacyEventType = "shares_sold";
               isBroadcastable = true;
               broadcastTopic = "trade_events";
               assetId = parsedData.asset;
               wallet = parsedData.seller;
               amount = parsedData.shares || 0;
            } else if (event.name === "PriceUpdated") {
               type = "PRICE";
               legacyEventType = "price_updated";
               isBroadcastable = true;
               broadcastTopic = "price_update";
               assetId = parsedData.asset;
               amount = parsedData.price || 0; 
            } else if (event.name === "OracleBreachDetected") {
               type = "ORACLE_ALERT";
               legacyEventType = "oracle_breach";
               isBroadcastable = true;
               broadcastTopic = "WARN_ORACLE_BREACH";
               assetId = parsedData.asset;
               amount = parsedData.spreadBps || 0; 
            }
            break; // Take the primary recognized event for single-record simplicity
          }
        } catch(parseErr) {
          logger.warn({ err: parseErr, signature }, "[Indexer] Anchor EventParser failed. Falling back.");
        }
      }

      // Phase 2: Fallback Instruction Parsing (Backward Compatibility)
      if (type === "UNKNOWN") {
        const logString = tx.logs?.join(" ") || "";
        if (logString.includes("Instruction: BuyShares")) { type = "BUY"; legacyEventType = "shares_bought"; }
        else if (logString.includes("Instruction: SellShares")) { type = "SELL"; legacyEventType = "shares_sold"; }
        else if (logString.includes("Instruction: UpdatePrice")) { type = "PRICE"; legacyEventType = "price_updated"; }
        else if (logString.includes("Instruction: OracleBreachDetected")) { type = "ORACLE_ALERT"; legacyEventType = "oracle_breach"; }
        else if (logString.includes("Instruction: SwapTokens")) { legacyEventType = "swap_executed"; }
      }

      // Phase 3: Idempotent DB Write
      const blockTime = new Date(tx.timestamp * 1000);
      
      const updatePayload = {
        $setOnInsert: {
          txSignature: signature,
          slot: tx.slot,
          blockTime,
          type,
          eventType: legacyEventType,
          assetId,
          assetAddress: assetId,
          wallet,
          primaryWallet: wallet,
          amount,
          metadata: parsedData,
          data: parsedData,
          rawLogs: tx.logs,
          status: "confirmed"
        }
      };

      const result = await BlockchainEvent.updateOne({ txSignature: signature }, updatePayload, { upsert: true });

      if (result.upsertedCount > 0) {
        logger.info({ signature, type, assetId }, `[Indexer] Synced successfully to DB`);

        // Phase 4: Low-Latency Event Broadcast
        if (isBroadcastable && realtimeService && broadcastTopic) {
          const payload = {
            type: type,
            signature,
            assetId,
            wallet,
            amount,
            timestamp: blockTime,
            metadata: parsedData
          };
          
          realtimeService.publish(broadcastTopic, payload);
        }
      } else {
        logger.debug({ signature }, `[Indexer] Event already exists in DB (Idempotent skip)`);
      }

    } catch (e) {
      logger.error({ err: e, signature }, `[Indexer] Critical error syncing tx`);
      if (this.redisClient && this.redisClient.status === 'ready') {
         try { await this.redisClient.del(`indexed:${signature}`); } catch(er){}
      }
    }
  }
}

module.exports = new IndexerService();
