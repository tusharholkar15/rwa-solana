/**
 * Request validation middleware
 */

function validateAssetCreation(req, res, next) {
  let { 
    name, symbol, description, totalSupply, pricePerToken, 
    propertyValue, annualYieldBps, lifecycleStatus, assetType 
  } = req.body;

  const errors = [];

  // Symbol Normalization
  if (symbol) {
    req.body.symbol = symbol.trim().toUpperCase();
    symbol = req.body.symbol;
  }

  // Core Metadata (On-chain limits)
  if (!name || name.length > 64)
    errors.push("Name is required (max 64 chars)");
  if (!symbol || symbol.length > 10)
    errors.push("Symbol is required (1-10 uppercase chars)");
  if (!description) errors.push("Description is required");
  
  // Strict Numeric Bounds (Prevent logical errors and overflow)
  const MAX_SOL_VALUE = 1_000_000_000 * 1_000_000_000; // 1B SOL fallback cap

  if (!totalSupply || totalSupply <= 0 || !Number.isInteger(totalSupply))
    errors.push("Total supply must be a positive integer");
  if (!pricePerToken || pricePerToken <= 0 || pricePerToken > MAX_SOL_VALUE)
    errors.push("Price per token must be positive and within safety bounds");
  if (!propertyValue || propertyValue <= 0 || propertyValue > MAX_SOL_VALUE)
    errors.push("Property value must be positive and within safety bounds");
  
  // Institutional Defaults/Limits
  if (annualYieldBps !== undefined) {
    const yieldNum = Number(annualYieldBps);
    if (isNaN(yieldNum) || yieldNum < 0 || yieldNum > 10000) {
      errors.push("Annual yield (bps) must be between 0 and 10000 (0-100%)");
    }
  }

  const validTypes = [
    "residential", "commercial", "industrial", "land", 
    "mixed-use", "hospitality", "gold", "art", "bond", 
    "stock", "vehicle", "commodity"
  ];
  if (assetType && !validTypes.includes(assetType)) {
    errors.push(`Invalid asset type. Must be one of: ${validTypes.join(", ")}`);
  }

  const validStatuses = ["pending", "under_review", "verified", "tokenized", "active", "paused", "sold"];
  if (lifecycleStatus && !validStatuses.includes(lifecycleStatus)) {
    errors.push("Invalid lifecycle status");
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  next();
}

function validateTradeRequest(req, res, next) {
  const { assetId, shares, walletAddress } = req.body;

  const errors = [];

  if (!assetId) errors.push("Asset ID is required");
  
  const sharesNum = Number(shares);
  if (!shares || isNaN(sharesNum) || sharesNum <= 0) {
    errors.push("Shares must be a positive number");
  }
  
  if (!walletAddress) errors.push("Wallet address is required");

  // Strict Solana Address Check
  if (walletAddress && (walletAddress.length < 32 || walletAddress.length > 44)) {
    errors.push("Invalid Solana wallet address format");
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  req.walletAddress = walletAddress;
  next();
}

function validateKycSubmission(req, res, next) {
  const { walletAddress, documentType, documentId } = req.body;

  const errors = [];

  if (!walletAddress) errors.push("Wallet address is required");
  if (!documentType) errors.push("Document type is required");
  if (!documentId) errors.push("Document ID is required");

  const validTypes = ["passport", "drivers_license", "national_id", "utility_bill"];
  if (documentType && !validTypes.includes(documentType)) {
    errors.push(`Document type must be one of: ${validTypes.join(", ")}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  req.walletAddress = walletAddress;
  next();
}

module.exports = {
  validateAssetCreation,
  validateTradeRequest,
  validateKycSubmission,
};
