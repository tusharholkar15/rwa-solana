/**
 * Analytics Engine
 * Provides market trends, asset comparisons, and portfolio performance insights
 */

const Asset = require("../models/Asset");
const Transaction = require("../models/Transaction");
const Portfolio = require("../models/Portfolio");
const priceService = require("./priceService");

class AnalyticsService {
  /**
   * Get global market overview
   */
  async getMarketOverview() {
    const [assets, solPrice, recentTransactions] = await Promise.all([
      Asset.find({ isActive: true }).select("propertyValue totalSupply availableSupply pricePerToken annualYieldBps assetType totalInvestors"),
      priceService.getSolPrice(),
      Transaction.find().sort({ createdAt: -1 }).limit(100),
    ]);

    const totalTVL = assets.reduce((sum, a) => sum + a.propertyValue, 0);
    const totalTokenized = assets.length;
    const totalInvestors = assets.reduce((sum, a) => sum + (a.totalInvestors || 0), 0);
    const avgYield = assets.length > 0
      ? assets.reduce((sum, a) => sum + (a.annualYieldBps || 0), 0) / assets.length
      : 0;

    // Calculate 24h volume from recent transactions
    const now = Date.now();
    const volume24h = recentTransactions
      .filter((tx) => now - new Date(tx.createdAt).getTime() < 24 * 60 * 60 * 1000)
      .reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);

    // Asset type distribution
    const typeDistribution = {};
    assets.forEach((a) => {
      typeDistribution[a.assetType] = (typeDistribution[a.assetType] || 0) + 1;
    });

    // Top assets by investor count
    const topByInvestors = [...assets]
      .sort((a, b) => (b.totalInvestors || 0) - (a.totalInvestors || 0))
      .slice(0, 5)
      .map((a) => ({
        name: a.name || a._id,
        investors: a.totalInvestors,
        value: a.propertyValue,
      }));

    return {
      totalTVL,
      totalTVLFormatted: `$${(totalTVL / 1e6).toFixed(1)}M`,
      totalTokenizedAssets: totalTokenized,
      totalInvestors,
      averageYieldBps: Math.round(avgYield),
      averageYieldPercent: (avgYield / 100).toFixed(2),
      volume24h: volume24h / 1e9, // in SOL
      volume24hFormatted: `${(volume24h / 1e9).toFixed(2)} SOL`,
      solPrice: solPrice.price,
      solChange24h: (Math.random() - 0.45) * 8, // Simulated
      typeDistribution,
      topByInvestors,
      marketSentiment: avgYield > 500 ? "Bullish" : "Neutral",
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Compare multiple assets side-by-side
   */
  async compareAssets(assetIds) {
    const assets = await Asset.find({
      _id: { $in: assetIds },
    });

    const solPrice = await priceService.getSolPrice();

    return assets.map((asset) => {
      const a = asset.toObject();
      const soldPercent = ((a.totalSupply - a.availableSupply) / a.totalSupply) * 100;
      const tokenPriceUsd = (a.pricePerToken / 1e9) * solPrice.price;

      // Calculate price trend from history
      let priceTrend = 0;
      if (a.priceHistory && a.priceHistory.length >= 2) {
        const recent = a.priceHistory[a.priceHistory.length - 1].price;
        const older = a.priceHistory[0].price;
        priceTrend = ((recent - older) / older) * 100;
      }

      return {
        id: a._id,
        name: a.name,
        symbol: a.symbol,
        assetType: a.assetType,
        location: `${a.location?.city || ""}, ${a.location?.country || ""}`,
        propertyValue: a.propertyValue,
        tokenPriceUsd: Math.round(tokenPriceUsd * 100) / 100,
        annualYieldPercent: (a.annualYieldBps / 100).toFixed(2),
        soldPercent: Math.round(soldPercent * 10) / 10,
        totalInvestors: a.totalInvestors,
        priceTrend: Math.round(priceTrend * 100) / 100,
        riskScore: a.assetType === "land" ? "Low" : a.assetType === "hospitality" ? "Medium-High" : "Medium",
        liquidityScore: soldPercent > 70 ? "High" : soldPercent > 40 ? "Medium" : "Low",
      };
    });
  }

  /**
   * Deep portfolio analytics
   */
  async getPortfolioAnalytics(walletAddress) {
    const [portfolio, transactions] = await Promise.all([
      Portfolio.findOne({ walletAddress }),
      Transaction.find({ walletAddress }).sort({ createdAt: -1 }),
    ]);

    if (!portfolio || !portfolio.holdings || portfolio.holdings.length === 0) {
      return {
        walletAddress,
        hasPortfolio: false,
        message: "No portfolio found",
      };
    }

    // Fetch asset details for holdings
    const assetIds = portfolio.holdings.map((h) => h.assetId);
    const assets = await Asset.find({ _id: { $in: assetIds } });
    const assetMap = {};
    assets.forEach((a) => { assetMap[a._id.toString()] = a; });

    // Portfolio composition
    const composition = portfolio.holdings.map((h) => {
      const asset = assetMap[h.assetId.toString()];
      const currentValue = h.shares * (asset?.pricePerToken || h.avgBuyPrice);
      const invested = h.totalInvested || h.shares * h.avgBuyPrice;
      const pnl = currentValue - invested;

      return {
        assetId: h.assetId,
        name: asset?.name || "Unknown",
        symbol: asset?.symbol || "???",
        assetType: asset?.assetType || "unknown",
        shares: h.shares,
        investedValue: invested,
        currentValue,
        pnl,
        pnlPercent: invested > 0 ? (pnl / invested) * 100 : 0,
        allocation: 0, // calculated below
        annualYield: asset?.annualYieldBps ? (asset.annualYieldBps / 100) : 0,
      };
    });

    const totalValue = composition.reduce((sum, c) => sum + c.currentValue, 0);
    composition.forEach((c) => {
      c.allocation = totalValue > 0 ? Math.round((c.currentValue / totalValue) * 10000) / 100 : 0;
    });

    const totalInvested = composition.reduce((sum, c) => sum + c.investedValue, 0);
    const totalPnl = totalValue - totalInvested;
    const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    // Diversification score (0-100)
    // Herfindahl-Hirschman Index approach
    const hhi = composition.reduce((sum, c) => sum + Math.pow(c.allocation / 100, 2), 0);
    const diversificationScore = Math.round((1 - hhi) * 100);

    // Asset type breakdown
    const typeBreakdown = {};
    composition.forEach((c) => {
      typeBreakdown[c.assetType] = (typeBreakdown[c.assetType] || 0) + c.allocation;
    });

    // Weighted average yield
    const weightedYield = composition.reduce(
      (sum, c) => sum + c.annualYield * (c.allocation / 100),
      0
    );

    // Transaction velocity (trades per month)
    const firstTx = transactions.length > 0 ? transactions[transactions.length - 1].createdAt : new Date();
    const monthsActive = Math.max(1, (Date.now() - new Date(firstTx).getTime()) / (30 * 24 * 60 * 60 * 1000));
    const txVelocity = Math.round((transactions.length / monthsActive) * 10) / 10;

    return {
      walletAddress,
      hasPortfolio: true,
      summary: {
        totalHoldings: composition.length,
        totalInvested: totalInvested / 1e9, // in SOL
        totalValue: totalValue / 1e9,
        totalPnl: totalPnl / 1e9,
        totalPnlPercent: Math.round(totalPnlPercent * 100) / 100,
        realizedPnl: (portfolio.totalRealizedPnl || 0) / 1e9,
      },
      metrics: {
        diversificationScore,
        diversificationLabel: diversificationScore > 70 ? "Well Diversified" : diversificationScore > 40 ? "Moderate" : "Concentrated",
        weightedAnnualYield: Math.round(weightedYield * 100) / 100,
        transactionVelocity: txVelocity,
        totalTransactions: transactions.length,
        monthsActive: Math.round(monthsActive * 10) / 10,
      },
      composition,
      typeBreakdown,
      recentTransactions: transactions.slice(0, 10).map((tx) => ({
        type: tx.type,
        assetName: tx.assetName,
        shares: tx.shares,
        amount: tx.totalAmount / 1e9,
        date: tx.createdAt,
        status: tx.status,
      })),
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Get asset performance heat map data
   */
  async getHeatMap() {
    const assets = await Asset.find({ isActive: true }).select(
      "name symbol assetType location propertyValue annualYieldBps priceHistory totalInvestors"
    );

    return assets.map((asset) => {
      const a = asset.toObject();
      let priceTrend = 0;
      if (a.priceHistory && a.priceHistory.length >= 2) {
        const recent = a.priceHistory[a.priceHistory.length - 1].price;
        const older = a.priceHistory[Math.max(0, a.priceHistory.length - 30)].price;
        priceTrend = ((recent - older) / older) * 100;
      }

      return {
        name: a.name,
        symbol: a.symbol,
        type: a.assetType,
        city: a.location?.city,
        country: a.location?.country,
        coordinates: a.location?.coordinates,
        value: a.propertyValue,
        yield: a.annualYieldBps / 100,
        trend: Math.round(priceTrend * 100) / 100,
        investors: a.totalInvestors,
        intensity: Math.min(1, (a.totalInvestors || 0) / 500), // 0–1 heat intensity
      };
    });
  }

  /**
   * Get top movers (biggest price changes)
   */
  async getTopMovers() {
    const assets = await Asset.find({ isActive: true }).select(
      "name symbol pricePerToken priceHistory propertyValue"
    );

    const movers = assets.map((asset) => {
      const a = asset.toObject();
      let change = 0;
      if (a.priceHistory && a.priceHistory.length >= 2) {
        const latest = a.priceHistory[a.priceHistory.length - 1].price;
        const dayAgo = a.priceHistory[Math.max(0, a.priceHistory.length - 2)].price;
        change = ((latest - dayAgo) / dayAgo) * 100;
      }
      return { name: a.name, symbol: a.symbol, change: Math.round(change * 100) / 100 };
    });

    movers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    return {
      gainers: movers.filter((m) => m.change > 0).slice(0, 5),
      losers: movers.filter((m) => m.change < 0).slice(0, 5),
      mostActive: movers.slice(0, 5),
    };
  }
}

module.exports = new AnalyticsService();
