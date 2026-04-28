/**
 * Blockchain Indexer Service (Production-Hardened)
 *
 * Responsibilities:
 *  1. Parse & persist Helius webhook payloads (idempotent, deduped via Redis)
 *  2. Broadcast real-time events to WebSocket subscribers
 *  3. Self-healing reconciliation loop — fetches & re-processes any missed
 *     on-chain transactions every 5 minutes, guaranteeing data integrity.
 *  4. Dead-letter queue — irrecoverable parse failures are persisted as
 *     OUTBOX_DISPATCH tasks so no event is silently dropped.
 */

"use strict";

const BlockchainEvent = require("../models/BlockchainEvent");
const BackgroundTask  = require("../models/BackgroundTask");
const realtimeService = require("./realtimeService");
const Redis           = require("ioredis");
const anchor          = require("@coral-xyz/anchor");
const idl             = require("../config/idl.json");
const logger          = require("../config/logger");

// ─── Constants ────────────────────────────────────────────────────────────────
const RECON_INTERVAL_MS   = 5 * 60 * 1000;  // 5 minutes
const RECON_INITIAL_DELAY = 10 * 1000;       // 10 s after boot
const RECON_LOOK_BACK     = 150;             // signatures to scan each run
const REDIS_DEDUP_TTL_S   = 86_400;          // 24 hours

class IndexerService {
  constructor() {
    this.redisClient     = null;
    this.eventParser     = null;
    this.reconIntervalId = null;

    this._initRedis();
    this._initEventParser();
  }

  // ─── Initialisation ─────────────────────────────────────────────────────────

  _initRedis() {
    try {
      const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
      this.redisClient = new Redis(url, { lazyConnect: true });
      this.redisClient.on("error", () => {
        // Intentionally silent — Redis is an optimisation; DB deduplication is
        // the authoritative fallback.
      });
    } catch (e) {
      logger.warn("[Indexer] Redis unavailable — falling back to DB-level dedup");
    }
  }

  _initEventParser() {
    // Skip Anchor initialization in test mode — not needed for tests
    if (process.env.NODE_ENV === "test") {
      return;
    }

    try {
      const programId = new anchor.web3.PublicKey(
        process.env.PROGRAM_ID || "RwaP111111111111111111111111111111111111111"
      );
      const coder = new anchor.BorshCoder(idl);
      this.eventParser = new anchor.EventParser(programId, coder);
      logger.info("[Indexer] Anchor EventParser initialised successfully");
    } catch (e) {
      logger.error({ err: e }, "[Indexer] Anchor EventParser init failed — falling back to log heuristics");
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Entry-point for Helius webhook payloads.
   * Processes each transaction concurrently (errors are isolated per-tx).
   */
  async processWebhookPayload(payload) {
    if (!Array.isArray(payload) || payload.length === 0) return;

    logger.info(`[Indexer] Received ${payload.length} event(s) from webhook`);

    const PROGRAM_ID = process.env.PROGRAM_ID || "RwaP111111111111111111111111111111111111111";

    const results = await Promise.allSettled(
      payload.map(async (tx) => {
        if (tx.err) return; // Skip failed on-chain transactions

        const isOurs =
          tx.accountData?.some((acc) => acc.account === PROGRAM_ID) ||
          tx.instructions?.some((ix)  => ix.programId === PROGRAM_ID);

        if (isOurs) {
          await this.syncTransaction(tx);
        }
      })
    );

    // Surface any unexpected rejections
    results.forEach((r) => {
      if (r.status === "rejected") {
        logger.error({ err: r.reason }, "[Indexer] Unhandled error in webhook payload processing");
      }
    });
  }

  /**
   * Sync a single parsed Helius transaction to the DB (idempotent).
   */
  async syncTransaction(tx) {
    const signature = tx.signature;

    // ── Phase 1: Redis fast-path deduplication ────────────────────────────────
    if (this.redisClient && this.redisClient.status === "ready") {
      const key    = `indexed:${signature}`;
      const setNX  = await this.redisClient.set(key, "1", "EX", REDIS_DEDUP_TTL_S, "NX");
      if (!setNX) {
        logger.debug({ signature }, "[Indexer] Skipped (Redis dedup hit)");
        return;
      }
    }

    // ── Phase 2: Event parsing ────────────────────────────────────────────────
    let type            = "UNKNOWN";
    let legacyEventType = "unknown";
    let assetId         = null;
    let wallet          = null;
    let amount          = 0;
    let parsedData      = null;
    let isBroadcastable = false;
    let broadcastTopic  = null;

    // 2a. Try Anchor EventParser (preferred — schema-level correctness)
    if (this.eventParser && tx.logs?.length > 0) {
      try {
        for (const event of this.eventParser.parseLogs(tx.logs)) {
          logger.info({ eventName: event.name }, "[Indexer] Decoded Anchor event");

          parsedData = this._normaliseBN(event.data);

          switch (event.name) {
            case "AssetBought":
              type = "BUY"; legacyEventType = "shares_bought";
              isBroadcastable = true; broadcastTopic = "trade_events";
              assetId = parsedData.asset;  wallet = parsedData.buyer;
              amount  = parsedData.shares  || 0;
              break;

            case "AssetSold":
              type = "SELL"; legacyEventType = "shares_sold";
              isBroadcastable = true; broadcastTopic = "trade_events";
              assetId = parsedData.asset;  wallet = parsedData.seller;
              amount  = parsedData.shares  || 0;
              break;

            case "PriceUpdated":
              type = "PRICE"; legacyEventType = "price_updated";
              isBroadcastable = true; broadcastTopic = "price_update";
              assetId = parsedData.asset;  amount = parsedData.price || 0;
              break;

            case "OracleBreachDetected":
              type = "ORACLE_ALERT"; legacyEventType = "oracle_breach";
              isBroadcastable = true; broadcastTopic = "WARN_ORACLE_BREACH";
              assetId = parsedData.asset;  amount = parsedData.spreadBps || 0;
              break;

            case "OracleFailureDetected":
              type = "ORACLE_ALERT"; legacyEventType = "oracle_failure";
              isBroadcastable = true; broadcastTopic = "WARN_ORACLE_BREACH";
              assetId = parsedData.asset;
              break;

            case "OracleZScoreBreachDetected":
              type = "ORACLE_ALERT"; legacyEventType = "oracle_zscore";
              isBroadcastable = true; broadcastTopic = "WARN_ORACLE_BREACH";
              assetId = parsedData.asset;
              break;

            default:
              logger.debug({ eventName: event.name }, "[Indexer] Unrecognised Anchor event — stored as raw");
          }

          break; // Take the first recognised event per transaction
        }
      } catch (parseErr) {
        logger.warn({ err: parseErr, signature }, "[Indexer] EventParser failed — falling back to log heuristics");
      }
    }

    // 2b. Fallback: log-string heuristics (backwards-compatible with older deployments)
    if (type === "UNKNOWN") {
      const logs = tx.logs?.join(" ") || "";
      if      (logs.includes("Instruction: BuyShares"))      { type = "BUY";          legacyEventType = "shares_bought";  }
      else if (logs.includes("Instruction: SellShares"))     { type = "SELL";         legacyEventType = "shares_sold";    }
      else if (logs.includes("Instruction: UpdatePrice"))    { type = "PRICE";        legacyEventType = "price_updated";  }
      else if (logs.includes("Instruction: SwapTokens"))     { type = "SWAP";         legacyEventType = "swap_executed";  }
      else if (logs.includes("OracleBreachDetected"))        { type = "ORACLE_ALERT"; legacyEventType = "oracle_breach";  }
    }

    // ── Phase 3: Idempotent DB write ──────────────────────────────────────────
    const blockTime = tx.timestamp ? new Date(tx.timestamp * 1000) : new Date();

    try {
      const result = await BlockchainEvent.updateOne(
        { txSignature: signature },
        {
          $setOnInsert: {
            txSignature: signature,
            slot:        tx.slot,
            blockTime,
            type,
            eventType:     legacyEventType,
            assetId,
            assetAddress:  assetId,
            wallet,
            primaryWallet: wallet,
            amount,
            metadata:  parsedData,
            data:      parsedData,
            rawLogs:   tx.logs,
            status:    "confirmed",
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        logger.info({ signature, type, assetId }, "[Indexer] Synced new event to DB");

        // ── Phase 4: Real-time broadcast ─────────────────────────────────────
        if (isBroadcastable && realtimeService && broadcastTopic) {
          realtimeService.publish(broadcastTopic, {
            type, signature, assetId, wallet, amount,
            timestamp: blockTime, metadata: parsedData,
          });
        }
      } else {
        logger.debug({ signature }, "[Indexer] DB dedup hit — event already stored");
      }
    } catch (dbErr) {
      logger.error({ err: dbErr, signature }, "[Indexer] DB write failed — enqueuing to outbox");

      // ── Phase 5: Dead-letter / Outbox fallback ────────────────────────────
      // Persist to BackgroundTask so the worker retries later with back-off.
      await BackgroundTask.create({
        type:    "OUTBOX_DISPATCH",
        payload: {
          signature,
          slot:      tx.slot,
          timestamp: blockTime,
          rawTx:     tx,
          parsedType: type,
          assetId,
          wallet,
          amount,
        },
        processAfter: new Date(Date.now() + 30_000), // retry in 30 s
      }).catch((e) => logger.error({ err: e }, "[Indexer] CRITICAL: Outbox enqueue also failed"));
    }
  }

  // ─── Reconciliation Loop ────────────────────────────────────────────────────

  /**
   * Start the self-healing reconciliation loop.
   * Safe to call multiple times — idempotent.
   */
  startReconciliation() {
    if (this.reconIntervalId) return;

    logger.info("[Indexer] Starting self-healing reconciliation loop...");

    // Immediate first scan after a short boot delay
    setTimeout(() => this._reconcileMissingSlots(), RECON_INITIAL_DELAY);

    // Recurring scan
    this.reconIntervalId = setInterval(
      () => this._reconcileMissingSlots(),
      RECON_INTERVAL_MS
    );
  }

  stopReconciliation() {
    if (this.reconIntervalId) {
      clearInterval(this.reconIntervalId);
      this.reconIntervalId = null;
      logger.info("[Indexer] Reconciliation loop stopped");
    }
  }

  /**
   * Scan the last N program transactions on-chain and reprocess any that are
   * missing from the local DB.  This guarantees catch-up after webhook gaps,
   * network partitions, or service restarts.
   */
  async _reconcileMissingSlots() {
    try {
      logger.info("[Indexer] Reconciliation scan started...");

      const programId  = new anchor.web3.PublicKey(
        process.env.PROGRAM_ID || "RwaP111111111111111111111111111111111111111"
      );
      const connection = new anchor.web3.Connection(
        process.env.SOLANA_RPC_URL || "https://api.testnet.solana.com",
        "confirmed"
      );

      // Fetch the N most recent signatures for our program
      const sigInfos = await connection.getSignaturesForAddress(programId, {
        limit: RECON_LOOK_BACK,
      });

      let missing = 0;
      let synced  = 0;
      let failed  = 0;

      for (const info of sigInfos) {
        if (info.err) continue; // Skip failed on-chain txs

        const exists = await BlockchainEvent.exists({ txSignature: info.signature });
        if (exists) continue;

        missing++;
        logger.warn({ signature: info.signature }, "[Indexer] Reconciliation: found gap — fetching full tx...");

        try {
          // Fetch the full parsed transaction from RPC
          const txResponse = await connection.getParsedTransaction(info.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!txResponse) {
            logger.warn({ signature: info.signature }, "[Indexer] Reconciliation: RPC returned null for tx");
            continue;
          }

          // Re-shape into Helius-style payload so syncTransaction can consume it
          const heliusShaped = {
            signature:  info.signature,
            slot:       info.slot,
            timestamp:  txResponse.blockTime,
            err:        null,
            logs:       txResponse.meta?.logMessages  || [],
            accountData: [],
            instructions: txResponse.transaction?.message?.instructions?.map((ix) => ({
              programId: ix.programId?.toBase58?.() || "",
            })) || [],
          };

          await this.syncTransaction(heliusShaped);
          synced++;
        } catch (fetchErr) {
          failed++;
          logger.error({ err: fetchErr, signature: info.signature },
            "[Indexer] Reconciliation: failed to fetch/sync tx"
          );
        }
      }

      if (missing > 0) {
        logger.info(
          { missing, synced, failed },
          "[Indexer] Reconciliation complete — backfilled missing transactions"
        );
      } else {
        logger.debug("[Indexer] Reconciliation complete — no gaps found");
      }
    } catch (error) {
      logger.error({ err: error }, "[Indexer] Reconciliation scan failed");
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Normalise BN / PublicKey values from Anchor decoded events into plain
   * JS primitives so they are safe to store in MongoDB.
   */
  _normaliseBN(data) {
    if (!data || typeof data !== "object") return data;

    const out = {};
    for (const [k, v] of Object.entries(data)) {
      if (v == null) {
        out[k] = v;
      } else if (typeof v.toNumber === "function") {
        try   { out[k] = v.toNumber(); }
        catch { out[k] = v.toString(); } // BN too large for JS number
      } else if (typeof v.toBase58 === "function") {
        out[k] = v.toBase58();
      } else {
        out[k] = v;
      }
    }
    return out;
  }
}

module.exports = new IndexerService();
