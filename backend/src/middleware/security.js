/**
 * Unified Institutional Security Layer
 * Consolidates Authentication (SIWS), RBAC, and Input Sanitization.
 */
const nacl = require("tweetnacl");
const bs58 = require("bs58").default;
const logger = require("../config/logger");
const RoleRegistry = require("../models/RoleRegistry");
const ComplianceIdentity = require("../models/ComplianceIdentity");

/**
 * ─── PART 1: DEEP SANITIZATION ───────────────────────────────────────
 * Recursively protects objects from NoSQL injection ($) and ReDoS (regex).
 */
function deepSanitize(obj) {
  if (obj === null || typeof obj !== "object") {
    // Escape strings if they look like regex patterns
    if (typeof obj === "string" && /[.*+?^${}()|[\]\\]/.test(obj)) {
      return obj.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    return obj;
  }
  
  if (Array.isArray(obj)) return obj.map(deepSanitize);

  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$")) {
      logger.warn({ key }, "[Security] Stripped hazardous MongoDB operator");
      continue;
    }
    clean[key] = deepSanitize(obj[key]);
  }
  return clean;
}

const sanitizeMiddleware = (req, res, next) => {
  if (req.body) req.body = deepSanitize(req.body);
  if (req.query) req.query = deepSanitize(req.query);
  if (req.params) req.params = deepSanitize(req.params);
  next();
};

/**
 * ─── PART 2: SIWS AUTHENTICATION ─────────────────────────────────────
 * Mandatory cryptographic signature verification.
 */
const requireWalletSignature = (req, res, next) => {
  try {
    const signatureBase58 = req.headers["x-wallet-signature"];
    const publicKeyBase58 = req.headers["x-wallet-address"];
    const message = req.headers["x-wallet-message"];

    if (!signatureBase58 || !publicKeyBase58 || !message) {
      return res.status(401).json({ error: "Authentication required", message: "Missing SIWS headers" });
    }

    // Anti-Replay: Verify timestamp in message (2-minute window for high-stakes RWA)
    const timestampMatch = message.match(/: (\d+)$/);
    if (timestampMatch) {
      const timestamp = parseInt(timestampMatch[1], 10);
      if (Date.now() - timestamp > 2 * 60 * 1000) {
        return res.status(401).json({ error: "Signature expired", message: "Institutional session expired (2m window). Please re-authenticate." });
      }
    }

    const signature = bs58.decode(signatureBase58);
    const publicKey = bs58.decode(publicKeyBase58);
    const messageBytes = new TextEncoder().encode(message);

    if (!nacl.sign.detached.verify(messageBytes, signature, publicKey)) {
      return res.status(401).json({ error: "Invalid signature", message: "Cryptographic verification failed" });
    }

    req.walletAddress = publicKeyBase58;
    next();
  } catch (error) {
    logger.error({ error: error.message }, "[Security] SIWS verification crashed");
    res.status(401).json({ error: "Authentication failed" });
  }
};

/**
 * ─── PART 3: RBAC & COMPLIANCE ───────────────────────────────────────
 * Automatically includes signature verification.
 */
const requireRole = (...roles) => {
  return [
    requireWalletSignature,
    async (req, res, next) => {
      try {
        const { walletAddress } = req;
        
        // 1. Check RoleRegistry
        const roleEntry = await RoleRegistry.findOne({ walletAddress, isActive: true });
        if (roleEntry && roles.includes(roleEntry.role)) {
          req.userRole = roleEntry.role;
          return next();
        }

        // 2. Legacy/Admin Fallback
        if (roles.includes("admin")) {
          const admins = (process.env.ADMIN_WALLETS || "").split(",");
          if (admins.includes(walletAddress)) {
            req.userRole = "admin";
            return next();
          }
        }

        logger.warn({ walletAddress, requiredRoles: roles }, "[Security] Unauthorized role access attempt");
        res.status(403).json({ error: "Access denied", message: `Required role: ${roles.join(" or ")}` });
      } catch (error) {
        next(error);
      }
    }
  ];
};

const requireTier = (minTier) => {
  return [
    requireWalletSignature,
    async (req, res, next) => {
      try {
        const { walletAddress } = req;
        const identity = await ComplianceIdentity.findOne({ walletAddress });

        if (!identity || identity.complianceTier < minTier || identity.isFrozen) {
          return res.status(403).json({ 
            error: "Compliance failure", 
            message: identity?.isFrozen ? "Account frozen" : `Minimum compliance tier ${minTier} required` 
          });
        }
        next();
      } catch (error) {
        next(error);
      }
    }
  ];
};

module.exports = {
  sanitizeMiddleware,
  requireWalletSignature,
  requireRole,
  requireTier
};
