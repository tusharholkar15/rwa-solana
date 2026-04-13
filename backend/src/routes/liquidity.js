/**
 * Liquidity Pool & OTC Trading Routes (Asynchronous Version)
 */
const express = require("express");
const router = express.Router();
const liquidityService = require("../services/liquidityService");
const darkPoolEngine = require("../services/darkPoolEngine");
const { requireWalletSignature, requireRole } = require("../middleware/security");
const requireAdminWallet = requireRole("admin");

/**
 * GET /api/liquidity/pools
 * List all active liquidity pools
 */
router.get("/pools", async (req, res) => {
  try {
    const pools = await liquidityService.getAllPools();
    res.json({ pools });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pools" });
  }
});

/**
 * GET /api/liquidity/pool/:poolId
 * Get pool details
 */
router.get("/pool/:poolId", async (req, res) => {
  try {
    const pool = await liquidityService.getPool(req.params.poolId);
    if (!pool) return res.status(404).json({ error: "Pool not found" });
    res.json({ pool });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pool" });
  }
});

/**
 * POST /api/liquidity/pool/create
 * Create a new liquidity pool
 */
router.post("/pool/create", async (req, res) => {
  try {
    const { assetId, assetSymbol, initialTokenReserve, initialSolReserve, creator } = req.body;

    if (!assetId || !initialTokenReserve || !initialSolReserve || !creator) {
      return res.status(400).json({ error: "assetId, initialTokenReserve, initialSolReserve, creator required" });
    }

    const result = await liquidityService.createPool({
      assetId,
      assetSymbol: assetSymbol || "TOKEN",
      initialTokenReserve: Number(initialTokenReserve),
      initialSolReserve: Number(initialSolReserve),
      creator,
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/liquidity/swap
 * Execute an AMM swap
 */
router.post("/swap", async (req, res) => {
  try {
    const { poolId, direction, amount, walletAddress, maxSlippage } = req.body;

    if (!poolId || !direction || !amount || !walletAddress) {
      return res.status(400).json({ error: "poolId, direction, amount, walletAddress required" });
    }

    const trade = await liquidityService.executeSwap({
      poolId,
      direction,
      amount: Number(amount),
      walletAddress,
      maxSlippage: maxSlippage ? Number(maxSlippage) : 0.01,
    });

    res.json({ trade });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/liquidity/swap-preview
 * Preview a swap (no execution)
 */
router.get("/swap-preview", async (req, res) => {
  try {
    const { poolId, direction, amount } = req.query;

    if (!poolId || !direction || !amount) {
      return res.status(400).json({ error: "poolId, direction, amount required" });
    }

    const preview = await liquidityService.getSwapPreview({
      poolId,
      direction,
      amount: Number(amount),
    });

    res.json(preview);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/liquidity/add
 * Add liquidity to a pool
 */
router.post("/add", async (req, res) => {
  try {
    const { poolId, tokenAmount, solAmount, provider } = req.body;

    if (!poolId || !tokenAmount || !solAmount || !provider) {
      return res.status(400).json({ error: "poolId, tokenAmount, solAmount, provider required" });
    }

    const result = await liquidityService.addLiquidity({
      poolId,
      tokenAmount: Number(tokenAmount),
      solAmount: Number(solAmount),
      provider,
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ─── OTC Order Book ────────────────────────────────────────────────

/**
 * POST /api/liquidity/otc/order
 * Place an OTC limit order
 */
router.post("/otc/order", async (req, res) => {
  try {
    const { assetId, walletAddress, side, shares, pricePerShare, expiresInHours } = req.body;

    if (!assetId || !walletAddress || !side || !shares || !pricePerShare) {
      return res.status(400).json({ error: "assetId, walletAddress, side, shares, pricePerShare required" });
    }

    const order = await liquidityService.placeOTCOrder({
      assetId,
      walletAddress,
      side,
      shares: Number(shares),
      pricePerShare: Number(pricePerShare),
      expiresInHours: Number(expiresInHours) || 24,
    });

    res.json({ order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/liquidity/otc/orderbook/:assetId
 * Get OTC order book
 */
router.get("/otc/orderbook/:assetId", async (req, res) => {
  try {
    const orderbook = await liquidityService.getOrderBook(req.params.assetId);
    res.json(orderbook);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch order book" });
  }
});

// ─── Dark Pool (Institutional) ──────────────────────────────────────

/**
 * POST /api/liquidity/darkpool/order
 * Place a hidden dark pool block order
 */
router.post("/darkpool/order", async (req, res) => {
  try {
    const { walletAddress, assetId, side, price, shares, minimumFill } = req.body;

    if (!walletAddress || !assetId || !side || !price || !shares) {
      return res.status(400).json({ error: "walletAddress, assetId, side, price, shares required" });
    }

    const order = await darkPoolEngine.placeDarkOrder({
      walletAddress,
      assetId,
      side,
      price: Number(price),
      shares: Number(shares),
      minimumFill: Number(minimumFill) || 0,
    });

    res.json({ order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/liquidity/darkpool/my-orders/:wallet
 * Get user's active dark orders
 */
router.get("/darkpool/my-orders/:wallet", async (req, res) => {
  try {
    const orders = await darkPoolEngine.getActiveDarkOrders(req.params.wallet);
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/liquidity/darkpool/stats/:assetId
 * Get aggregate dark pool stats
 */
router.get("/darkpool/stats/:assetId", async (req, res) => {
  try {
    const stats = await darkPoolEngine.getMarketStats(req.params.assetId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
