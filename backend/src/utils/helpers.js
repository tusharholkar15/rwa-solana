/**
 * Utility helpers
 */

/**
 * Format lamports to SOL with specified decimals
 */
function lamportsToSol(lamports, decimals = 4) {
  return Number((lamports / 1_000_000_000).toFixed(decimals));
}

/**
 * Format SOL to lamports
 */
function solToLamports(sol) {
  return Math.round(sol * 1_000_000_000);
}

/**
 * Paginate mongoose query results
 */
function paginate(query, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
}

/**
 * Create pagination metadata
 */
function paginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

/**
 * Safe JSON parse
 */
function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Abbreviate large numbers (e.g., 1.2M, 45.3K)
 */
function abbreviateNumber(num) {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

module.exports = {
  lamportsToSol,
  solToLamports,
  paginate,
  paginationMeta,
  safeJsonParse,
  abbreviateNumber,
};
