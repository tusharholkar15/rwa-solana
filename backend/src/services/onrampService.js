/**
 * Fiat On-Ramp / Off-Ramp Service
 * Supports Razorpay (INR/UPI) and Stripe (USD/international)
 * Includes full mock mode for development without API keys
 */

const { v4: uuidv4 } = require("uuid");

class OnrampService {
  constructor() {
    this.razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    this.razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    this.stripeSecret = process.env.STRIPE_SECRET_KEY;
    this.mockMode = !this.razorpayKeyId && !this.stripeSecret;

    if (this.mockMode) {
      console.log("💳 On-ramp service running in MOCK mode (no API keys)");
    }
  }

  /**
   * Create a Razorpay payment order (INR)
   */
  async createRazorpayOrder({ amountINR, walletAddress, assetId, shares }) {
    if (this.mockMode) {
      return this._mockOrder("razorpay", amountINR, "INR", walletAddress, assetId, shares);
    }

    try {
      const Razorpay = require("razorpay");
      const instance = new Razorpay({
        key_id: this.razorpayKeyId,
        key_secret: this.razorpaySecret,
      });

      const order = await instance.orders.create({
        amount: Math.round(amountINR * 100), // Razorpay uses paise
        currency: "INR",
        receipt: `rwa_${uuidv4().slice(0, 8)}`,
        notes: { walletAddress, assetId, shares: String(shares) },
      });

      return {
        provider: "razorpay",
        orderId: order.id,
        amount: amountINR,
        currency: "INR",
        status: "created",
        keyId: this.razorpayKeyId,
        walletAddress,
        assetId,
        shares,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Razorpay order error:", error);
      throw new Error("Failed to create Razorpay order");
    }
  }

  /**
   * Create a Stripe payment intent (USD)
   */
  async createStripeIntent({ amountUSD, walletAddress, assetId, shares }) {
    if (this.mockMode) {
      return this._mockOrder("stripe", amountUSD, "USD", walletAddress, assetId, shares);
    }

    try {
      const stripe = require("stripe")(this.stripeSecret);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amountUSD * 100), // Stripe uses cents
        currency: "usd",
        metadata: { walletAddress, assetId, shares: String(shares) },
        automatic_payment_methods: { enabled: true },
      });

      return {
        provider: "stripe",
        orderId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: amountUSD,
        currency: "USD",
        status: "created",
        walletAddress,
        assetId,
        shares,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Stripe intent error:", error);
      throw new Error("Failed to create Stripe payment intent");
    }
  }

  /**
   * Verify Razorpay payment
   */
  async verifyRazorpayPayment({ orderId, paymentId, signature }) {
    if (this.mockMode) {
      return {
        verified: true,
        orderId,
        paymentId: paymentId || `mock_pay_${uuidv4().slice(0, 8)}`,
        status: "captured",
        mock: true,
      };
    }

    try {
      const crypto = require("crypto");
      const generated = crypto
        .createHmac("sha256", this.razorpaySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      return {
        verified: generated === signature,
        orderId,
        paymentId,
        status: generated === signature ? "captured" : "failed",
      };
    } catch (error) {
      return { verified: false, error: error.message };
    }
  }

  /**
   * Initiate off-ramp (bank withdrawal)
   */
  async initiateOfframp({ walletAddress, amount, currency, bankDetails }) {
    // Always mock in current version - real off-ramp requires licensed payout provider
    return {
      id: `offramp_${uuidv4().slice(0, 12)}`,
      walletAddress,
      amount,
      currency,
      bankAccount: bankDetails.accountLast4 || "****1234",
      status: "processing",
      estimatedCompletion: "2-3 business days",
      fee: Math.round(amount * 0.005 * 100) / 100, // 0.5% withdrawal fee
      netAmount: Math.round(amount * 0.995 * 100) / 100,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Generate a mock payment order for development
   */
  _mockOrder(provider, amount, currency, walletAddress, assetId, shares) {
    const orderId = `mock_${provider}_${uuidv4().slice(0, 12)}`;
    return {
      provider,
      orderId,
      clientSecret: provider === "stripe" ? `mock_cs_${uuidv4()}` : undefined,
      keyId: provider === "razorpay" ? "rzp_test_mock" : undefined,
      amount,
      currency,
      status: "created",
      walletAddress,
      assetId,
      shares,
      mock: true,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Simulate a successful payment (dev only)
   */
  async simulatePaymentSuccess(orderId) {
    return {
      orderId,
      paymentId: `mock_pay_${uuidv4().slice(0, 8)}`,
      status: "captured",
      verified: true,
      mock: true,
      completedAt: new Date().toISOString(),
    };
  }
}

module.exports = new OnrampService();
