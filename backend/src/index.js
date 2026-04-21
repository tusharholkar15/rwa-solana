const backgroundWorkerService = require("./services/backgroundWorkerService");
const oracleMonitoringService = require("./services/oracleMonitoringService");
const indexerService = require("./services/indexerService");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pino = require("pino-http")({ logger: require("./config/logger") });
const { connectDatabase, isDatabaseConnected } = require("./config/database");
const { sanitizeMiddleware, requireWalletSignature } = require("./middleware/security");
const redis = require("./config/redis");
const { Connection } = require("@solana/web3.js");

const assetRoutes = require("./routes/assets");
const tradingRoutes = require("./routes/trading");
const portfolioRoutes = require("./routes/portfolio");
const kycRoutes = require("./routes/kyc");
const adminRoutes = require("./routes/admin");
const fxRoutes = require("./routes/fx");
const onrampRoutes = require("./routes/onramp");
const complianceRoutes = require("./routes/compliance");
const insuranceRoutes = require("./routes/insurance");
const liquidityRoutes = require("./routes/liquidity");
const creditRoutes = require("./routes/credit");
const analyticsRoutes = require("./routes/analytics");
const communityRoutes = require("./routes/community");
const oracleRoutes = require("./routes/oracle");
const verificationRoutes = require("./routes/verification");
const governanceRoutes = require("./routes/governance");
const lifecycleRoutes = require("./routes/lifecycle");
const oracleService = require("./services/oracleService");
const rentRoutes = require("./routes/rent");
const auditRoutes = require("./routes/audit");
const darkpoolRoutes = require("./routes/darkpool");
const webhookRoutes = require("./routes/webhooks");
const yieldRoutes = require("./routes/yield");
const regulatoryRoutes = require("./routes/regulatory");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ─────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

// Rate limiting
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, 
  message: { error: "Too many read requests, please try again later." },
});
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, 
  message: { error: "Too many write requests, please try again later." },
});
// ─── Body Parsing ────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeMiddleware);

// ─── Direct Webhooks (Priority - No Rate Limit) ──────────────────────
app.use("/api/webhooks", webhookRoutes);

app.use("/api/", (req, res, next) => {
  if (req.method === "GET") return readLimiter(req, res, next);
  return writeLimiter(req, res, next);
});

// ─── Logging ─────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(pino);
}

// ─── API Routes ──────────────────────────────────────────────────────
app.use("/api/assets", assetRoutes);
app.use("/api", tradingRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/fx", fxRoutes);
app.use("/api/onramp", onrampRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/insurance", insuranceRoutes);
app.use("/api/liquidity", liquidityRoutes);
app.use("/api/credit", creditRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/oracle", oracleRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/governance", governanceRoutes);
app.use("/api/lifecycle", lifecycleRoutes);
app.use("/api/rent", rentRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/darkpool", darkpoolRoutes);
app.use("/api/yield", yieldRoutes);
app.use("/api/regulatory", regulatoryRoutes);

// ─── Admin: Worker & Outbox Health ───────────────────────────────────
const BackgroundTask = require("./models/BackgroundTask");
app.get("/api/admin/worker-health", async (req, res) => {
  try {
    const [pending, processing, failed, deadLettered, completed] = await Promise.all([
      BackgroundTask.countDocuments({ status: "PENDING" }),
      BackgroundTask.countDocuments({ status: "PROCESSING" }),
      BackgroundTask.countDocuments({ status: "FAILED" }),
      BackgroundTask.countDocuments({ status: "DEAD_LETTER" }),
      BackgroundTask.countDocuments({ status: "COMPLETED" }),
    ]);

    // Outbox-specific metrics
    const outboxPending = await BackgroundTask.countDocuments({
      type: "OUTBOX_DISPATCH",
      status: { $in: ["PENDING", "FAILED"] },
    });
    const outboxDeadLettered = await BackgroundTask.countDocuments({
      type: "OUTBOX_DISPATCH",
      status: "DEAD_LETTER",
    });

    res.json({
      status: deadLettered > 0 ? "degraded" : "healthy",
      tasks: { pending, processing, failed, deadLettered, completed },
      outbox: { pending: outboxPending, deadLettered: outboxDeadLettered },
      workerRunning: !!backgroundWorkerService.intervalId,
      reconRunning: !!indexerService.reconIntervalId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to query worker health" });
  }
});

// ─── Health Check ────────────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  let redisStatus = "disconnected";
  let solanaStatus = "disconnected";
  let oracleStatus = "degraded";

  try {
    if (redis.status === "ready") redisStatus = "connected";
  } catch (e) {
    req.log.error("Redis health check failed", { error: e.message });
  }

  try {
    const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com");
    await connection.getSlot();
    solanaStatus = "connected";
  } catch (e) {
    req.log.error("Solana health check failed", { error: e.message });
  }

  try {
    const latestPrices = await oracleService.getLatestPrices?.() || {};
    if (Object.keys(latestPrices).length > 0) oracleStatus = "operational";
  } catch (e) {
    req.log.error("Oracle health check failed", { error: e.message });
  }

  const dbConnected = isDatabaseConnected();
  const isHealthy = dbConnected && redisStatus === "connected" && solanaStatus === "connected";

  res.json({
    status: isHealthy ? "healthy" : "degraded",
    uptime: process.uptime(),
    services: {
      database: dbConnected ? "connected" : "disconnected",
      redis: redisStatus,
      solana: solanaStatus,
      oracle: oracleStatus,
    },
    timestamp: new Date().toISOString(),
    network: process.env.SOLANA_NETWORK || "devnet",
    version: "1.2.0-stable",
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global Error Handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// ─── Scheduled Tasks ─────────────────────────────────────────────────
/**
 * Schedule a daily LEDGER_RECONCILE task to cross-check on-chain state vs DB.
 * Uses a simple setInterval rather than a full cron dependency.
 */
function scheduleLedgerReconciliation() {
  const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  const enqueue = async () => {
    try {
      // Avoid duplicates: only create if no unfinished reconciliation exists
      const existing = await BackgroundTask.findOne({
        type: "LEDGER_RECONCILE",
        status: { $in: ["PENDING", "PROCESSING"] },
      });
      if (!existing) {
        await BackgroundTask.create({
          type: "LEDGER_RECONCILE",
          payload: { scope: "daily", triggeredBy: "scheduler" },
        });
        console.log("[Scheduler] Daily LEDGER_RECONCILE task enqueued");
      }
    } catch (err) {
      console.error("[Scheduler] Failed to enqueue reconciliation:", err.message);
    }
  };

  // First run 30 s after boot, then every 24 h
  setTimeout(enqueue, 30_000);
  setInterval(enqueue, INTERVAL_MS);
}

// ─── Start Server ────────────────────────────────────────────────────
const http = require("http");
const realtimeService = require("./services/realtimeService");

async function startServer() {
  try {
    await connectDatabase();
    
    const server = http.createServer(app);
    realtimeService.init(server);

    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════╗
║     🏗️  RWA Tokenization Platform - Backend API     ║
╠══════════════════════════════════════════════════════╣
║  Server:   http://localhost:${PORT}                    ║
║  Network:  ${(process.env.SOLANA_NETWORK || "devnet").padEnd(40)}║
║  MongoDB:  Connected                                ║
║  Websocket:Ready ✅                                  ║
║  Status:   Ready ✅                                  ║
╚══════════════════════════════════════════════════════╝
      `);
      
      // Start background services
      if (process.env.NODE_ENV !== "test") {
        oracleService.startHeartbeat(); // Starts simulated NAV fluctuations
        
        // Institutional Hardening: Start Background Worker for Guaranteed Delivery
        backgroundWorkerService.start();

        // Institutional Hardening: Start Oracle Circuit Breaker Monitoring (Sync to DB)
        oracleMonitoringService.start();

        // Institutional Hardening: Start Indexer Reconciliation (Self-Healing)
        if (indexerService.startReconciliation) {
          indexerService.startReconciliation();
        }

        // Institutional Hardening: Schedule daily ledger reconciliation
        scheduleLedgerReconciliation();
      }
    });

    // ─── Graceful Shutdown ─────────────────────────────────────────────
    const shutdown = async (signal) => {
      console.log(`\n[${signal}] Termination signal received. Draining workers...`);

      // 1. Stop accepting new work
      backgroundWorkerService.stop();
      oracleMonitoringService.stop();
      if (indexerService.stopReconciliation) indexerService.stopReconciliation();
      oracleService.stopHeartbeat();

      server.close(async () => {
        try {
          const mongoose = require("mongoose");
          await mongoose.connection.close();
          await redis.quit();
          console.log("Cleanup complete. Operational shutdown successful.");
          process.exit(0);
        } catch (err) {
          console.error("Error during graceful shutdown:", err);
          process.exit(1);
        }
      });

      // Force-exit after 15 s if draining stalls
      setTimeout(() => {
        console.error("Graceful shutdown timed out — forcing exit");
        process.exit(1);
      }, 15_000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
