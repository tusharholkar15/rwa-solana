/**
 * Price service for fetching real-time asset valuations
 * Uses Pyth Network Hermes API for oracle data
 * Falls back to mock data for properties without oracle feeds
 */

const HERMES_URL = process.env.PYTH_HERMES_URL || "https://hermes.pyth.network";

// Mock price feeds for real estate (Pyth doesn't have direct RE feeds)
// In production, these would map to relevant economic indicators
const MOCK_PRICE_FEEDS = {
  // SOL/USD feed ID (real)
  SOL_USD: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  // Mock real estate index feeds
  RE_RESIDENTIAL: "mock_residential_index",
  RE_COMMERCIAL: "mock_commercial_index",
};

class PriceService {
  constructor() {
    this.priceCache = new Map();
    this.cacheTTL = 30_000; // 30 seconds
  }

  /**
   * Fetch price from Pyth Hermes API
   */
  async fetchPythPrice(feedId) {
    try {
      const response = await fetch(
        `${HERMES_URL}/api/latest_price_feeds?ids[]=${feedId}`
      );

      if (!response.ok) {
        throw new Error(`Pyth API error: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const priceFeed = data[0];
        const price = priceFeed.price;
        return {
          price: Number(price.price) * Math.pow(10, price.expo),
          confidence: Number(price.conf) * Math.pow(10, price.expo),
          publishTime: price.publish_time,
          feedId,
        };
      }

      return null;
    } catch (error) {
      console.error("Pyth price fetch error:", error.message);
      return null;
    }
  }

  /**
   * Get SOL/USD price
   */
  async getSolPrice() {
    const cacheKey = "SOL_USD";
    const cached = this.priceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const price = await this.fetchPythPrice(MOCK_PRICE_FEEDS.SOL_USD);

    if (price) {
      this.priceCache.set(cacheKey, { data: price, timestamp: Date.now() });
      return price;
    }

    // Fallback mock price
    return { price: 145.50, confidence: 0.5, publishTime: Date.now() / 1000 };
  }

  /**
   * Calculate asset token price in USD
   * Converts lamports price to USD using SOL/USD rate
   */
  async getTokenPriceUsd(priceInLamports) {
    const solPrice = await this.getSolPrice();
    const priceInSol = priceInLamports / 1_000_000_000;
    return priceInSol * solPrice.price;
  }

  /**
   * Generate mock price history for an asset
   * In production, this would come from historical oracle data
   */
  generatePriceHistory(basePrice, days = 30) {
    const history = [];
    const now = Date.now();
    let currentPrice = basePrice;

    for (let i = days; i >= 0; i--) {
      // Random walk with slight upward bias (real estate appreciation)
      const change = (Math.random() - 0.48) * 0.02; // -2% to +2.4%
      currentPrice = currentPrice * (1 + change);

      history.push({
        price: Math.round(currentPrice * 100) / 100,
        timestamp: new Date(now - i * 24 * 60 * 60 * 1000),
      });
    }

    return history;
  }

  /**
   * Get market overview data
   */
  async getMarketOverview() {
    const solPrice = await this.getSolPrice();

    return {
      solPrice: solPrice.price,
      solChange24h: (Math.random() - 0.5) * 10, // Mock 24h change
      totalMarketCap: "2.4B", // Mock
      volume24h: "45.2M", // Mock
      lastUpdated: new Date().toISOString(),
    };
  }
}

module.exports = new PriceService();
