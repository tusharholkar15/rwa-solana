const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Mock Data Storage for Dark Pool Orders (In-Memory for demonstration or use DB later)
const darkPoolOrders = [];
let darkPoolVolume = 1250000; // Mock seed stats

/**
 * GET /api/darkpool/stats/:assetId
 * Retrieves institutional block trading stats for an asset
 */
router.get('/stats/:assetId', (req, res) => {
  res.json({
    assetId: req.params.assetId,
    volume24h: 142000,
    totalLiquidity: darkPoolVolume,
    avgExecutionPrice: Math.random() * 2 + 10,
    lastMatchTime: new Date().toISOString()
  });
});

/**
 * GET /api/darkpool/orders/:walletAddress
 * Retrieves a user's hidden orders (only they can see it)
 */
router.get('/orders/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  const myOrders = darkPoolOrders.filter(o => o.walletAddress === walletAddress);
  res.json({ count: myOrders.length, orders: myOrders });
});

/**
 * POST /api/darkpool/order
 * Places a hidden institutional order
 */
router.post('/order', (req, res) => {
  const { walletAddress, assetId, side, price, shares, minimumFill } = req.body;
  
  if (!walletAddress || !assetId || !side || !price || !shares) {
    return res.status(400).json({ error: 'Missing required dark pool order fields' });
  }

  const newOrder = {
    _id: new mongoose.Types.ObjectId().toString(),
    walletAddress,
    assetId,
    side,
    price: Number(price),
    shares: Number(shares),
    minimumFill: Number(minimumFill || 0),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  darkPoolOrders.push(newOrder);

  // Simple mock matching engine: Occasionally 'fill' an order.
  setTimeout(() => {
    const order = darkPoolOrders.find(o => o._id === newOrder._id);
    if (order) {
      order.status = 'filled';
      darkPoolVolume += order.shares;
    }
  }, 30000); // Fills after 30 seconds

  res.json({ message: 'Dark order accepted into the pool', order: newOrder });
});

module.exports = router;
