/**
 * Wallet Signature Authentication Middleware
 * Ensures the request is signed by the wallet owner.
 */
const nacl = require("tweetnacl");
const bs58 = require("bs58").default;

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
 * Require specific compliance tier or identity (Optional, but useful)
 * This could be a separate middleware or part of the auth flow depending on complexity.
 */
const requireAdminWallet = (req, res, next) => {
  // Simple admin check: Ensure the authenticated wallet is in a hardcoded list of admins
  // In production, this would grab the user's role from the DB.
  
  // For MVP, if it made it past the signature check, it's authenticated.
  // We can inject a hardcoded list of admin pubkeys:
  
  const ADMIN_WALLETS = process.env.ADMIN_WALLETS 
     ? process.env.ADMIN_WALLETS.split(",") 
     : ["DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", "TusharWalletAddressHere"]; // Fallback or read from env

  if (ADMIN_WALLETS.includes(req.walletAddress)) {
     next();
  } else {
     return res.status(403).json({ error: "Access denied. Admin privileges required." });
  }
};

module.exports = {
  requireWalletSignature,
  requireAdminWallet,
};
