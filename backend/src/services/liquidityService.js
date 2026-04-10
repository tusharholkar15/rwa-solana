/**
 * Liquidity Pool Service — AMM Engine (Persistence Version)
 * Implements constant-product (x * y = k) automated market maker
 * Also supports OTC limit order book with MongoDB persistence
 */

const { v4: uuidv4 } = require("uuid");
const LiquidityPool = require("../models/LiquidityPool");
const OTCOrder = require("../models/OTCOrder");

class LiquidityService {
  // ─── AMM Pool Management ─────────────────────────────────────────

  /**
   * Create a new liquidity pool for a tokenized asset
   */
  async createPool({ assetId, assetSymbol, initialTokenReserve, initialSolReserve, creator }) {
    const poolId = `pool_${uuidv4().slice(0, 12)}`;
    const k = initialTokenReserve * initialSolReserve; // constant product
    const totalLpTokens = Math.sqrt(initialTokenReserve * initialSolReserve);

    const pool = await LiquidityPool.create({
      poolId,
      assetId,
      assetSymbol,
      tokenReserve: initialTokenReserve,
      solReserve: initialSolReserve,
      k,
      totalLpTokens,
      feeRate: 0.003, // 0.3% swap fee (Uniswap standard)
      volume24h: 0,
      fees24h: 0,
      tvl: initialSolReserve * 2, // Approximate TVL in SOL terms
      pricePerToken: initialSolReserve / initialTokenReserve,
      creator,
      trades: [],
    });

    return { pool };
  }

  /**
   * Execute an AMM swap (buy tokens with SOL or sell tokens for SOL)
   */
  async executeSwap({ poolId, direction, amount, walletAddress, maxSlippage = 0.01 }) {
    const pool = await LiquidityPool.findOne({ poolId });
    if (!pool) throw new Error("Pool not found");

    let tokensOut, solOut, fee, priceImpact, effectivePrice;

    if (direction === "buy") {
      // User sends SOL, receives tokens
      const solIn = amount;
      fee = solIn * pool.feeRate;
      const solInAfterFee = solIn - fee;

      // x * y = k => new token reserve = k / (solReserve + solInAfterFee)
      const newSolReserve = pool.solReserve + solInAfterFee;
      const newTokenReserve = pool.k / newSolReserve;
      tokensOut = pool.tokenReserve - newTokenReserve;

      // Price impact
      const spotPrice = pool.solReserve / pool.tokenReserve;
      effectivePrice = solInAfterFee / tokensOut;
      priceImpact = Math.abs((effectivePrice - spotPrice) / spotPrice);

      if (priceImpact > maxSlippage) {
        throw new Error(`Price impact ${(priceImpact * 100).toFixed(2)}% exceeds max slippage ${(maxSlippage * 100).toFixed(2)}%`);
      }

      // Update reserves
      pool.tokenReserve = newTokenReserve;
      pool.solReserve = newSolReserve;
      solOut = 0;
    } else if (direction === "sell") {
      // User sends tokens, receives SOL
      const tokensIn = amount;
      fee = tokensIn * pool.feeRate;
      const tokensInAfterFee = tokensIn - fee;

      const newTokenReserve = pool.tokenReserve + tokensInAfterFee;
      const newSolReserve = pool.k / newTokenReserve;
      solOut = pool.solReserve - newSolReserve;

      const spotPrice = pool.solReserve / pool.tokenReserve;
      effectivePrice = solOut / tokensInAfterFee;
      priceImpact = Math.abs((effectivePrice - spotPrice) / spotPrice);

      if (priceImpact > maxSlippage) {
        throw new Error(`Price impact ${(priceImpact * 100).toFixed(2)}% exceeds max slippage`);
      }

      pool.tokenReserve = newTokenReserve;
      pool.solReserve = newSolReserve;
      tokensOut = 0;
    } else {
      throw new Error("Direction must be 'buy' or 'sell'");
    }

    // Update pool stats
    pool.pricePerToken = pool.solReserve / pool.tokenReserve;
    pool.tvl = pool.solReserve * 2;
    pool.volume24h += amount;
    pool.fees24h += fee;

    const trade = {
      tradeId: `trade_${uuidv4().slice(0, 8)}`,
      direction,
      amountIn: amount,
      tokensOut: Math.round(tokensOut * 1000) / 1000,
      solOut: Math.round(solOut * 1000000) / 1000000,
      fee: Math.round(fee * 1000000) / 1000000,
      priceImpact: Math.round(priceImpact * 10000) / 100,
      effectivePrice: Math.round(effectivePrice * 1000000) / 1000000,
      walletAddress,
      timestamp: new Date(),
    };

    pool.trades.unshift(trade);
    if (pool.trades.length > 100) pool.trades = pool.trades.slice(0, 100);

    await pool.save();
    return trade;
  }

  /**
   * Add liquidity to a pool
   */
  async addLiquidity({ poolId, tokenAmount, solAmount, provider }) {
    const pool = await LiquidityPool.findOne({ poolId });
    if (!pool) throw new Error("Pool not found");

    // Calculate LP tokens to issue (proportional to existing pool)
    const tokenRatio = tokenAmount / pool.tokenReserve;
    const solRatio = solAmount / pool.solReserve;
    const ratio = Math.min(tokenRatio, solRatio);
    const lpTokensIssued = pool.totalLpTokens * ratio;

    // Update pool reserves
    pool.tokenReserve += tokenAmount;
    pool.solReserve += solAmount;
    pool.k = pool.tokenReserve * pool.solReserve;
    pool.totalLpTokens += lpTokensIssued;
    pool.tvl = pool.solReserve * 2;

    await pool.save();
    return { pool };
  }

  /**
   * Get swap price preview (no execution)
   */
  async getSwapPreview({ poolId, direction, amount }) {
    const pool = await LiquidityPool.findOne({ poolId });
    if (!pool) throw new Error("Pool not found");

    const spotPrice = pool.solReserve / pool.tokenReserve;
    let estimatedOut, fee, priceImpact;

    if (direction === "buy") {
      fee = amount * pool.feeRate;
      const afterFee = amount - fee;
      const newSol = pool.solReserve + afterFee;
      const newToken = pool.k / newSol;
      estimatedOut = pool.tokenReserve - newToken;
      const effectivePrice = afterFee / estimatedOut;
      priceImpact = Math.abs((effectivePrice - spotPrice) / spotPrice);
    } else {
      fee = amount * pool.feeRate;
      const afterFee = amount - fee;
      const newToken = pool.tokenReserve + afterFee;
      const newSol = pool.k / newToken;
      estimatedOut = pool.solReserve - newSol;
      const effectivePrice = estimatedOut / afterFee;
      priceImpact = Math.abs((effectivePrice - spotPrice) / spotPrice);
    }

    return {
      spotPrice,
      estimatedOut: Math.round(estimatedOut * 1000) / 1000,
      fee: Math.round(fee * 1000000) / 1000000,
      priceImpact: Math.round(priceImpact * 10000) / 100,
      poolDepth: { tokenReserve: pool.tokenReserve, solReserve: pool.solReserve },
    };
  }

  // ─── OTC Order Book ────────────────────────────────────────────────

  /**
   * Place an OTC limit order
   */
  async placeOTCOrder({ assetId, walletAddress, side, shares, pricePerShare, expiresInHours = 24 }) {
    const orderId = `otc_${uuidv4().slice(0, 12)}`;
    const order = await OTCOrder.create({
      orderId,
      assetId,
      walletAddress,
      side,
      shares,
      pricePerShare,
      totalValue: shares * pricePerShare,
      status: "open",
      filledShares: 0,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
    });

    return order;
  }

  /**
   * Get order book for an asset
   */
  async getOrderBook(assetId) {
    // Also clean up expired orders
    await OTCOrder.updateMany(
      { assetId, status: "open", expiresAt: { $lt: new Date() } },
      { $set: { status: "expired" } }
    );

    const orders = await OTCOrder.find({ assetId, status: "open" });
    const bids = orders.filter((o) => o.side === "bid").sort((a, b) => b.pricePerShare - a.pricePerShare);
    const asks = orders.filter((o) => o.side === "ask").sort((a, b) => a.pricePerShare - b.pricePerShare);

    const spread = asks.length > 0 && bids.length > 0
      ? asks[0].pricePerShare - bids[0].pricePerShare
      : null;

    return {
      assetId,
      bids: bids.slice(0, 20),
      asks: asks.slice(0, 20),
      spread,
      spreadPercent: spread && bids[0] ? (spread / bids[0].pricePerShare) * 100 : null,
      totalBidVolume: bids.reduce((sum, o) => sum + o.shares, 0),
      totalAskVolume: asks.reduce((sum, o) => sum + o.shares, 0),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get all active pools
   */
  async getAllPools() {
    const pools = await LiquidityPool.find().lean();
    return pools.map(p => {
      const { trades, ...rest } = p;
      return {
        ...rest,
        recentTrades: (trades || []).slice(0, 5)
      };
    });
  }

  /**
   * Get single pool details
   */
  async getPool(poolId) {
    return await LiquidityPool.findOne({ poolId });
  }
}

module.exports = new LiquidityService();
