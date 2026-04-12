/**
 * Request validation middleware — hardened for V2 institutional + multi-sig compliance
 */

// Solana address: 32-44 base58 characters
const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// IPFS CID v0 (Qm...) or CIDv1 (bafy...)
const IPFS_CID_RE = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[0-9a-z]{52,})$/;

// Maximum lamport value (~$1B USD at $200/SOL)  
const MAX_SOL_LAMPORTS = 5_000_000 * 1_000_000_000; // 5M SOL
const MIN_PROPERTY_LAMPORTS = 5_000_000; // ~$1,000 USD at $200/SOL

function validateAssetCreation(req, res, next) {
  let {
    name, symbol, description, totalSupply, pricePerToken,
    propertyValue, annualYieldBps, lifecycleStatus, assetType,
  } = req.body;

  const errors = [];

  // ── Symbol Normalization ─────────────────────────────────────────
  if (symbol) {
    req.body.symbol = symbol.trim().toUpperCase();
    symbol = req.body.symbol;
  }

  // ── Core Metadata (mirrors on-chain constraints) ─────────────────
  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 64)
    errors.push('Name is required and must be ≤64 characters (matches on-chain limit)');

  if (!symbol || symbol.length < 1 || symbol.length > 10 || !/^[A-Z0-9\-]+$/.test(symbol))
    errors.push('Symbol is required: 1–10 uppercase alphanumeric chars, hyphens allowed');

  if (!description || typeof description !== 'string' || description.trim().length < 10)
    errors.push('Description is required (minimum 10 characters)');

  // ── Strict Numeric Bounds ────────────────────────────────────────
  const supplyNum = Number(totalSupply);
  if (!totalSupply || !Number.isInteger(supplyNum) || supplyNum <= 0 || supplyNum > 1_000_000_000)
    errors.push('Total supply must be a positive integer ≤ 1,000,000,000');

  const priceNum = Number(pricePerToken);
  if (!pricePerToken || priceNum <= 0 || priceNum > MAX_SOL_LAMPORTS)
    errors.push('Price per token must be positive and ≤ 5,000,000 SOL in lamports');

  const propNum = Number(propertyValue);
  if (!propertyValue || propNum < MIN_PROPERTY_LAMPORTS || propNum > MAX_SOL_LAMPORTS)
    errors.push(`Property value must be ≥ ${MIN_PROPERTY_LAMPORTS} lamports (~$1,000 USD)`);

  // ── Institutional Yield Limits ───────────────────────────────────
  if (annualYieldBps !== undefined) {
    const yieldNum = Number(annualYieldBps);
    if (isNaN(yieldNum) || yieldNum < 0 || yieldNum > 10000)
      errors.push('Annual yield (bps) must be between 0 and 10000 (0%–100%)');
  }

  // ── Enum Validation ──────────────────────────────────────────────
  const validTypes = [
    'residential', 'commercial', 'industrial', 'land',
    'mixed-use', 'hospitality', 'gold', 'art', 'bond',
    'stock', 'vehicle', 'commodity',
  ];
  if (assetType && !validTypes.includes(assetType))
    errors.push(`Invalid asset type. Must be one of: ${validTypes.join(', ')}`);

  // Only allow creation in safe initial states — no direct jump to active
  const creatableStatuses = ['pending', 'under_review'];
  if (lifecycleStatus && !creatableStatuses.includes(lifecycleStatus))
    errors.push(`Lifecycle status must be 'pending' or 'under_review' at creation`);

  if (errors.length > 0)
    return res.status(400).json({ error: 'Validation failed', details: errors });

  next();
}

/**
 * Validates the multi-signature verification initiation payload.
 * Mirrors on-chain MultiVerification PDA constraints.
 */
function validateMultiVerification(req, res, next) {
  const { assetAddress, legalDocHash, attestationHash, ipfsCid } = req.body;
  const errors = [];

  if (!assetAddress || !SOLANA_ADDR_RE.test(assetAddress))
    errors.push('Valid asset on-chain address is required (base58, 32–44 chars)');

  if (!legalDocHash || !/^[0-9a-f]{64}$/i.test(legalDocHash))
    errors.push('Legal document hash must be a 64-character hex SHA-256 string');

  if (!attestationHash || !/^[0-9a-f]{64}$/i.test(attestationHash))
    errors.push('Attestation hash must be a 64-character hex SHA-256 string');

  if (!ipfsCid || !IPFS_CID_RE.test(ipfsCid))
    errors.push('IPFS CID must be a valid CIDv0 (Qm...) or CIDv1 (bafy...) identifier');

  if (errors.length > 0)
    return res.status(400).json({ error: 'Validation failed', details: errors });

  next();
}

function validateTradeRequest(req, res, next) {
  const { assetId, shares, walletAddress } = req.body;
  const errors = [];

  if (!assetId) errors.push('Asset ID is required');

  const sharesNum = Number(shares);
  if (!shares || isNaN(sharesNum) || sharesNum <= 0 || !Number.isInteger(sharesNum))
    errors.push('Shares must be a positive integer');

  if (!walletAddress) {
    errors.push('Wallet address is required');
  } else if (!SOLANA_ADDR_RE.test(walletAddress)) {
    errors.push('Invalid Solana wallet address (must be base58, 32–44 chars)');
  }

  if (errors.length > 0)
    return res.status(400).json({ error: 'Validation failed', details: errors });

  req.walletAddress = walletAddress;
  next();
}

function validateKycSubmission(req, res, next) {
  const { walletAddress, documentType, documentId } = req.body;
  const errors = [];

  if (!walletAddress || !SOLANA_ADDR_RE.test(walletAddress))
    errors.push('Valid Solana wallet address is required');

  if (!documentType) errors.push('Document type is required');
  if (!documentId) errors.push('Document ID is required');

  const validTypes = ['passport', 'drivers_license', 'national_id', 'utility_bill'];
  if (documentType && !validTypes.includes(documentType))
    errors.push(`Document type must be one of: ${validTypes.join(', ')}`);

  if (errors.length > 0)
    return res.status(400).json({ error: 'Validation failed', details: errors });

  req.walletAddress = walletAddress;
  next();
}

module.exports = {
  validateAssetCreation,
  validateMultiVerification,
  validateTradeRequest,
  validateKycSubmission,
};

