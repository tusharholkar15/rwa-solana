require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { connectDatabase } = require("./config/database");

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
const oracleService = require("./services/oracleService");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// ─── Body Parsing ────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
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

// ─── Health Check ────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    network: process.env.SOLANA_NETWORK || "devnet",
    version: "1.0.0",
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

// ─── Start Server ────────────────────────────────────────────────────
async function startServer() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════╗
║     🏗️  RWA Tokenization Platform - Backend API     ║
╠══════════════════════════════════════════════════════╣
║  Server:   http://localhost:${PORT}                    ║
║  Network:  ${(process.env.SOLANA_NETWORK || "devnet").padEnd(40)}║
║  MongoDB:  Connected                                ║
║  Status:   Ready ✅                                  ║
╚══════════════════════════════════════════════════════╝
      `);
      
      // Start background services
      if (process.env.NODE_ENV !== "test") {
        oracleService.startHeartbeat(); // Starts simulated NAV fluctuations
      }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
