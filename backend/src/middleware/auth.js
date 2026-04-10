/**
 * Wallet address validation middleware
 * Verifies the wallet address from request headers/params
 */
function validateWallet(req, res, next) {
  const wallet =
    req.headers["x-wallet-address"] ||
    req.params.wallet ||
    req.body.walletAddress;

  if (!wallet) {
    return res.status(401).json({
      error: "Wallet address required",
      message: "Please connect your wallet to continue",
    });
  }

  // Basic Solana address validation (base58, 32-44 chars)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if (!base58Regex.test(wallet)) {
    return res.status(400).json({
      error: "Invalid wallet address",
      message: "The provided wallet address is not valid",
    });
  }

  req.walletAddress = wallet;
  next();
}

/**
 * Admin role verification middleware
 */
function requireAdmin(req, res, next) {
  // In production, verify admin status from database
  // For now, check against env variable or user role
  const adminWallets = (process.env.ADMIN_WALLETS || "").split(",");

  if (req.user && req.user.role === "admin") {
    return next();
  }

  if (req.walletAddress && adminWallets.includes(req.walletAddress)) {
    return next();
  }

  // For development, allow admin actions
  if (process.env.NODE_ENV === "development") {
    return next();
  }

  return res.status(403).json({
    error: "Unauthorized",
    message: "Admin privileges required",
  });
}

module.exports = { validateWallet, requireAdmin };
