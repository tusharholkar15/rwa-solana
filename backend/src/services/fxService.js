/**
 * Foreign Exchange Rate Service
 * Fetches live FX rates for multi-currency support
 * Supports: USD, INR, EUR, GBP, JPY, SGD, AED
 */

const SUPPORTED_CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  JPY: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
};

// Realistic fallback rates (USD base) — updated periodically
const FALLBACK_RATES = {
  USD: 1.0,
  INR: 83.45,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 154.80,
  SGD: 1.34,
  AED: 3.67,
};

class FxService {
  constructor() {
    this.rates = { ...FALLBACK_RATES };
    this.lastFetched = 0;
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes
    this.baseCurrency = 'USD';
  }

  /**
   * Fetch live rates from ExchangeRate-API (free tier)
   */
  async fetchLiveRates() {
    try {
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/USD`
      );

      if (!response.ok) {
        throw new Error(`FX API error: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.rates) {
        Object.keys(SUPPORTED_CURRENCIES).forEach((currency) => {
          if (data.rates[currency]) {
            this.rates[currency] = data.rates[currency];
          }
        });
        this.lastFetched = Date.now();
        console.log('💱 FX rates updated:', new Date().toISOString());
      }
    } catch (error) {
      console.warn('⚠️ FX rate fetch failed, using cached/fallback rates:', error.message);
    }
  }

  /**
   * Get all current rates (USD base)
   */
  async getRates() {
    if (Date.now() - this.lastFetched > this.cacheTTL) {
      await this.fetchLiveRates();
    }

    return {
      base: this.baseCurrency,
      rates: { ...this.rates },
      currencies: SUPPORTED_CURRENCIES,
      lastUpdated: new Date(this.lastFetched).toISOString(),
      isLive: Date.now() - this.lastFetched < this.cacheTTL * 2,
    };
  }

  /**
   * Convert amount between currencies
   */
  async convert(amount, from = 'USD', to = 'INR') {
    if (Date.now() - this.lastFetched > this.cacheTTL) {
      await this.fetchLiveRates();
    }

    const fromRate = this.rates[from] || 1;
    const toRate = this.rates[to] || 1;

    // Convert to USD first, then to target
    const usdAmount = amount / fromRate;
    const convertedAmount = usdAmount * toRate;

    return {
      from: { currency: from, amount, symbol: SUPPORTED_CURRENCIES[from]?.symbol || from },
      to: { currency: to, amount: Math.round(convertedAmount * 100) / 100, symbol: SUPPORTED_CURRENCIES[to]?.symbol || to },
      rate: toRate / fromRate,
      inverseRate: fromRate / toRate,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Convert a USD amount to a target currency
   */
  async usdTo(amount, targetCurrency = 'USD') {
    if (targetCurrency === 'USD') return amount;
    const result = await this.convert(amount, 'USD', targetCurrency);
    return result.to.amount;
  }

  /**
   * Format an amount in the given currency
   */
  formatCurrency(amount, currency = 'USD') {
    const config = SUPPORTED_CURRENCIES[currency];
    if (!config) return `${amount}`;

    try {
      return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: currency === 'JPY' ? 0 : 2,
        maximumFractionDigits: currency === 'JPY' ? 0 : 2,
      }).format(amount);
    } catch {
      return `${config.symbol}${amount.toLocaleString()}`;
    }
  }

  /**
   * Get supported currencies list
   */
  getSupportedCurrencies() {
    return SUPPORTED_CURRENCIES;
  }
}

module.exports = new FxService();
