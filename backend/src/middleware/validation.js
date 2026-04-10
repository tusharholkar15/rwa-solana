/**
 * Request validation middleware
 */

function validateAssetCreation(req, res, next) {
  const { name, symbol, description, totalSupply, pricePerToken, propertyValue } =
    req.body;

  const errors = [];

  if (!name || name.length > 64)
    errors.push("Name is required (max 64 chars)");
  if (!symbol || symbol.length > 10)
    errors.push("Symbol is required (max 10 chars)");
  if (!description) errors.push("Description is required");
  if (!totalSupply || totalSupply <= 0)
    errors.push("Total supply must be positive");
  if (!pricePerToken || pricePerToken <= 0)
    errors.push("Price per token must be positive");
  if (!propertyValue || propertyValue <= 0)
    errors.push("Property value must be positive");

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  next();
}

function validateTradeRequest(req, res, next) {
  const { assetId, shares, walletAddress } = req.body;

  const errors = [];

  if (!assetId) errors.push("Asset ID is required");
  if (!shares || shares <= 0) errors.push("Shares must be a positive number");
  if (!walletAddress) errors.push("Wallet address is required");

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

  const validTypes = [
    "passport",
    "drivers_license",
    "national_id",
    "utility_bill",
  ];
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
