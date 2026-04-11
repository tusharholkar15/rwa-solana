/**
 * Wallet Signature Authentication Middleware
 * Ensures the request is signed by the wallet owner.
 *
 * V2: DB-driven RBAC via RoleRegistry, requireRole factory,
 *     and compliance identity integration.
 */
const nacl = require("tweetnacl");
const bs58 = require("bs58").default;
const RoleRegistry = require("../models/RoleRegistry");
const ComplianceIdentity = require("../models/ComplianceIdentity");

const requireWalletSignature = (req, res, next) => {
  try {
    const signatureBase58 = req.headers["x-wallet-signature"];
    const publicKeyBase58 = req.headers["x-wallet-address"];
    const message = req.headers["x-wallet-message"]; // e.g., "Assetverse Admin Login-" + timestamp

    if (!signatureBase58 || !publicKeyBase58 || !message) {
      return res.status(401).json({ error: "Missing authentication headers" });
    }

    // Optional: Protect against replay attacks by checking timestamp in the message
    // If the message ends with a timestamp, verify it's within a reasonable window (e.g., 5 mins)
    const timestampMatch = message.match(/-(\d+)$/);
    if (timestampMatch) {
      const timestamp = parseInt(timestampMatch[1], 10);
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        return res.status(401).json({ error: "Signature expired. Please sign again." });
      }
    }

    const signature = bs58.decode(signatureBase58);
    const publicKey = bs58.decode(publicKeyBase58);
    const messageBytes = new TextEncoder().encode(message);

    const isValid = nacl.sign.detached.verify(messageBytes, signature, publicKey);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Attach user wallet address to request
    req.walletAddress = publicKeyBase58;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Authentication failed. Invalid keys or signature format." });
  }
};

/**
 * DB-driven role-based access control middleware factory
 * Usage: router.post('/approve', requireWalletSignature, requireRole('admin', 'auditor'), handler)
 *
 * Looks up the user's role in the RoleRegistry collection.
 * Falls back to env-based admin list for backwards compatibility.
 */
const requireRole = (...roles) => {
  return async (req, res, next) => {
    try {
      const walletAddress = req.walletAddress;
      if (!walletAddress) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // 1. Check RoleRegistry (primary)
      const roleEntry = await RoleRegistry.findOne({
        walletAddress,
        isActive: true,
      });

      if (roleEntry && roles.includes(roleEntry.role)) {
        req.userRole = roleEntry.role;
        req.permissions = roleEntry.permissions;
        return next();
      }

      // 2. Fallback: Check ComplianceIdentity (secondary)
      const identity = await ComplianceIdentity.findOne({ walletAddress });
      if (identity && identity.role && roles.includes(identity.role)) {
        req.userRole = identity.role;
        req.complianceTier = identity.complianceTier;
        return next();
      }

      // 3. Legacy fallback: Hardcoded admin wallets from env
      if (roles.includes("admin")) {
        const ADMIN_WALLETS = process.env.ADMIN_WALLETS
          ? process.env.ADMIN_WALLETS.split(",")
          : [];
        if (ADMIN_WALLETS.includes(walletAddress)) {
          req.userRole = "admin";
          return next();
        }
      }

      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({ error: "Authorization check failed" });
    }
  };
};

/**
 * Require specific granular permission
 * Usage: router.post('/approve', requireWalletSignature, requirePermission('assets:approve'), handler)
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const walletAddress = req.walletAddress;
      if (!walletAddress) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const roleEntry = await RoleRegistry.findOne({
        walletAddress,
        isActive: true,
      });

      // Admins have all permissions
      if (roleEntry && roleEntry.role === "admin") {
        req.userRole = "admin";
        return next();
      }

      // Check specific permission
      if (roleEntry && roleEntry.permissions.includes(permission)) {
        req.userRole = roleEntry.role;
        return next();
      }

      return res.status(403).json({
        error: `Missing permission: ${permission}`,
      });
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ error: "Authorization check failed" });
    }
  };
};

/**
 * Require compliance tier (minimum tier level)
 * Usage: router.post('/buy', requireWalletSignature, requireTier(2), handler)
 */
const requireTier = (minTier) => {
  return async (req, res, next) => {
    try {
      const walletAddress = req.walletAddress;
      if (!walletAddress) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const identity = await ComplianceIdentity.findOne({ walletAddress });

      if (!identity) {
        return res.status(403).json({
          error: "No compliance identity found. Complete KYC first.",
        });
      }

      if (identity.isFrozen) {
        return res.status(403).json({
          error: "Account is frozen. Contact compliance team.",
        });
      }

      if (identity.complianceTier < minTier) {
        return res.status(403).json({
          error: `Minimum compliance tier ${minTier} required. Current: ${identity.complianceTier}`,
        });
      }

      req.complianceTier = identity.complianceTier;
      req.jurisdiction = identity.jurisdiction;
      next();
    } catch (error) {
      console.error("Tier check error:", error);
      res.status(500).json({ error: "Compliance check failed" });
    }
  };
};

/**
 * Simple admin check (backwards-compatible)
 */
const requireAdminWallet = (req, res, next) => {
  const ADMIN_WALLETS = process.env.ADMIN_WALLETS
     ? process.env.ADMIN_WALLETS.split(",")
     : ["DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", "TusharWalletAddressHere"];

  if (ADMIN_WALLETS.includes(req.walletAddress)) {
     next();
  } else {
     return res.status(403).json({ error: "Access denied. Admin privileges required." });
  }
};

module.exports = {
  requireWalletSignature,
  requireAdminWallet,
  requireRole,
  requirePermission,
  requireTier,
};
