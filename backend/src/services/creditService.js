/**
 * On-chain Credit Scoring Engine
 * Evaluates user risk profiles for lending and borrowing
 * Score range: 300–850 (FICO-style)
 */

const Portfolio = require("../models/Portfolio");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// Score weights
const WEIGHTS = {
  transactionHistory: 0.30, // 30%
  portfolioDiversity: 0.20, // 20%
  kycTier: 0.15,           // 15%
  walletAge: 0.15,         // 15%
  paymentConsistency: 0.10, // 10%
  totalVolume: 0.10,       // 10%
};

// Tier thresholds
const TIERS = [
  { min: 750, label: "Excellent", color: "#10b981", ltvRatio: 0.80, interestRate: 4.5 },
  { min: 650, label: "Good", color: "#6366f1", ltvRatio: 0.65, interestRate: 7.0 },
  { min: 550, label: "Fair", color: "#f59e0b", ltvRatio: 0.50, interestRate: 10.5 },
  { min: 0, label: "Poor", color: "#ef4444", ltvRatio: 0.30, interestRate: 15.0 },
];

class CreditService {
  /**
   * Compute credit score for a wallet
   */
  async computeScore(walletAddress) {
    const [user, portfolio, transactions] = await Promise.all([
      User.findOne({ walletAddress }),
      Portfolio.findOne({ walletAddress }),
      Transaction.find({ walletAddress }).sort({ createdAt: -1 }).limit(500),
    ]);

    const factors = {};

    // 1. Transaction History Score (0–100)
    const txCount = transactions.length;
    factors.transactionHistory = {
      score: Math.min(100, txCount * 5), // 20 transactions = 100
      detail: `${txCount} total transactions`,
      weight: WEIGHTS.transactionHistory,
    };

    // 2. Portfolio Diversity Score (0–100)
    const holdingsCount = portfolio?.holdings?.length || 0;
    const assetTypes = new Set();
    const countries = new Set();
    if (portfolio?.holdings) {
      // We'd normally join with Asset model, but approximate here
      holdingsCount > 1 && assetTypes.add("multi");
    }
    factors.portfolioDiversity = {
      score: Math.min(100, holdingsCount * 20), // 5 different assets = 100
      detail: `${holdingsCount} unique asset holdings`,
      weight: WEIGHTS.portfolioDiversity,
    };

    // 3. KYC Tier Score (0–100)
    const kycScores = { approved: 100, pending: 40, none: 10, rejected: 0, expired: 20 };
    const kycStatus = user?.kycStatus || "none";
    factors.kycTier = {
      score: kycScores[kycStatus] || 10,
      detail: `KYC status: ${kycStatus}`,
      weight: WEIGHTS.kycTier,
    };

    // 4. Wallet Age Score (0–100)
    const accountAge = user?.createdAt
      ? (Date.now() - new Date(user.createdAt).getTime()) / (24 * 60 * 60 * 1000)
      : 0;
    factors.walletAge = {
      score: Math.min(100, accountAge * 0.5), // 200 days = 100
      detail: `${Math.round(accountAge)} days old`,
      weight: WEIGHTS.walletAge,
    };

    // 5. Payment Consistency (0–100)
    // Look at time between transactions — regular trading = higher score
    let consistencyScore = 50; // default
    if (transactions.length >= 3) {
      const intervals = [];
      for (let i = 1; i < Math.min(transactions.length, 20); i++) {
        const diff = new Date(transactions[i - 1].createdAt) - new Date(transactions[i].createdAt);
        intervals.push(diff);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const stdDev = Math.sqrt(
        intervals.reduce((sum, v) => sum + Math.pow(v - avgInterval, 2), 0) / intervals.length
      );
      const cv = stdDev / (avgInterval || 1); // coefficient of variation
      consistencyScore = Math.max(0, Math.min(100, 100 - cv * 50));
    }
    factors.paymentConsistency = {
      score: Math.round(consistencyScore),
      detail: `Regularity coefficient`,
      weight: WEIGHTS.paymentConsistency,
    };

    // 6. Total Volume Score (0–100)
    const totalVolume = transactions.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);
    const volumeInSol = totalVolume / 1e9;
    factors.totalVolume = {
      score: Math.min(100, volumeInSol * 2), // 50 SOL volume = 100
      detail: `${volumeInSol.toFixed(2)} SOL total volume`,
      weight: WEIGHTS.totalVolume,
    };

    // Calculate weighted score (0–100 scale)
    let rawScore = 0;
    for (const [key, factor] of Object.entries(factors)) {
      rawScore += factor.score * factor.weight;
    }

    // Map 0–100 to 300–850 range
    const creditScore = Math.round(300 + (rawScore / 100) * 550);
    const clampedScore = Math.max(300, Math.min(850, creditScore));

    // Determine tier
    const tier = TIERS.find((t) => clampedScore >= t.min) || TIERS[TIERS.length - 1];

    return {
      walletAddress,
      score: clampedScore,
      tier: tier.label,
      tierColor: tier.color,
      maxLTV: tier.ltvRatio,
      baseInterestRate: tier.interestRate,
      factors,
      breakdown: Object.entries(factors).map(([key, f]) => ({
        category: key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
        score: Math.round(f.score),
        maxScore: 100,
        weight: `${f.weight * 100}%`,
        contribution: Math.round(f.score * f.weight),
        detail: f.detail,
      })),
      computedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
    };
  }

  /**
   * Apply for an asset-backed loan
   */
  async applyForLoan({ walletAddress, collateralAssetId, collateralShares, requestedAmount }) {
    const score = await this.computeScore(walletAddress);

    if (score.score < 450) {
      return {
        approved: false,
        reason: "Credit score too low for lending. Minimum required: 450.",
        currentScore: score.score,
        tier: score.tier,
      };
    }

    const maxLoanAmount = requestedAmount * score.maxLTV;
    const approved = requestedAmount <= maxLoanAmount;
    const interestRate = score.baseInterestRate;

    return {
      loanId: approved ? `loan_${Date.now().toString(36)}` : null,
      approved,
      walletAddress,
      collateralAssetId,
      collateralShares,
      requestedAmount,
      approvedAmount: approved ? requestedAmount : maxLoanAmount,
      interestRate,
      termMonths: 12,
      monthlyPayment: approved
        ? Math.round((requestedAmount * (1 + interestRate / 100)) / 12 * 100) / 100
        : null,
      creditScore: score.score,
      tier: score.tier,
      maxLTV: `${score.maxLTV * 100}%`,
      status: approved ? "approved" : "rejected",
      reason: approved ? null : `Requested amount exceeds ${score.maxLTV * 100}% LTV limit`,
      appliedAt: new Date().toISOString(),
    };
  }

  /**
   * Get tier info for a score
   */
  getTierInfo(score) {
    return TIERS.find((t) => score >= t.min) || TIERS[TIERS.length - 1];
  }
}

module.exports = new CreditService();
