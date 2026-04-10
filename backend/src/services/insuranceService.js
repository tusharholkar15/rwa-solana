/**
 * Insurance Service
 * Provides asset insurance quotes, activation, and claims management
 */

const { v4: uuidv4 } = require("uuid");

// Risk factors by asset type and location
const RISK_PROFILES = {
  residential: { baseRate: 0.0035, label: "Residential Property" },
  commercial: { baseRate: 0.0042, label: "Commercial Property" },
  industrial: { baseRate: 0.0055, label: "Industrial Facility" },
  hospitality: { baseRate: 0.0048, label: "Hospitality Asset" },
  land: { baseRate: 0.0020, label: "Agricultural/Land" },
  "mixed-use": { baseRate: 0.0045, label: "Mixed-Use Development" },
};

const LOCATION_RISK = {
  USA: 1.0,
  UK: 0.95,
  Japan: 0.90,
  Singapore: 0.85,
  UAE: 1.10,
  India: 1.15,
  Australia: 1.05,
  Germany: 0.90,
  Switzerland: 0.85,
  Brazil: 1.25,
};

const COVERAGE_TIERS = {
  basic: {
    name: "Basic Shield",
    multiplier: 1.0,
    coverage: ["Fire", "Natural Disaster", "Structural Damage"],
    maxCoverage: 0.80, // 80% of property value
    deductible: 0.05, // 5% deductible
  },
  standard: {
    name: "Standard Guard",
    multiplier: 1.45,
    coverage: ["Fire", "Natural Disaster", "Structural Damage", "Theft", "Vandalism", "Water Damage"],
    maxCoverage: 0.90,
    deductible: 0.025,
  },
  premium: {
    name: "Institutional Premium",
    multiplier: 2.10,
    coverage: [
      "Fire", "Natural Disaster", "Structural Damage", "Theft", "Vandalism",
      "Water Damage", "Business Interruption", "Rental Income Loss",
      "Legal Liability", "Environmental Contamination",
    ],
    maxCoverage: 1.0,
    deductible: 0.01,
  },
};

class InsuranceService {
  constructor() {
    this.activePolicies = new Map();
    this.claims = new Map();
  }

  /**
   * Generate an insurance quote for an asset
   */
  getQuote({ assetType, propertyValue, country, shares, totalSupply }) {
    const riskProfile = RISK_PROFILES[assetType] || RISK_PROFILES.residential;
    const locationMultiplier = LOCATION_RISK[country] || 1.0;
    const ownershipFraction = shares / totalSupply;
    const insuredValue = propertyValue * ownershipFraction;

    const quotes = Object.entries(COVERAGE_TIERS).map(([tierId, tier]) => {
      const annualPremium =
        insuredValue * riskProfile.baseRate * locationMultiplier * tier.multiplier;
      const monthlyPremium = annualPremium / 12;
      const maxPayout = insuredValue * tier.maxCoverage;
      const deductibleAmount = insuredValue * tier.deductible;

      return {
        tierId,
        tierName: tier.name,
        coverage: tier.coverage,
        insuredValue: Math.round(insuredValue),
        annualPremium: Math.round(annualPremium * 100) / 100,
        monthlyPremium: Math.round(monthlyPremium * 100) / 100,
        maxPayout: Math.round(maxPayout),
        deductible: Math.round(deductibleAmount),
        deductiblePercent: tier.deductible * 100,
        riskScore: Math.round(riskProfile.baseRate * locationMultiplier * 10000) / 100,
      };
    });

    return {
      quoteId: `quote_${uuidv4().slice(0, 12)}`,
      assetType: riskProfile.label,
      country,
      locationRisk: locationMultiplier <= 0.90 ? "Low" : locationMultiplier <= 1.05 ? "Medium" : "High",
      ownershipPercent: Math.round(ownershipFraction * 10000) / 100,
      tiers: quotes,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Activate an insurance policy
   */
  activatePolicy({ walletAddress, assetId, tierId, quoteData }) {
    const tier = COVERAGE_TIERS[tierId];
    if (!tier) throw new Error("Invalid insurance tier");

    const selectedQuote = quoteData?.tiers?.find((t) => t.tierId === tierId);
    if (!selectedQuote) throw new Error("Quote data mismatch");

    const policyId = `pol_${uuidv4().slice(0, 12)}`;
    const policy = {
      policyId,
      walletAddress,
      assetId,
      tierId,
      tierName: tier.name,
      coverage: tier.coverage,
      insuredValue: selectedQuote.insuredValue,
      annualPremium: selectedQuote.annualPremium,
      monthlyPremium: selectedQuote.monthlyPremium,
      maxPayout: selectedQuote.maxPayout,
      deductible: selectedQuote.deductible,
      status: "active",
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      nextPaymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    this.activePolicies.set(policyId, policy);
    return policy;
  }

  /**
   * File an insurance claim
   */
  fileClaim({ policyId, walletAddress, claimType, description, estimatedLoss }) {
    const policy = this.activePolicies.get(policyId);
    if (!policy) throw new Error("Policy not found");
    if (policy.walletAddress !== walletAddress) throw new Error("Unauthorized");
    if (policy.status !== "active") throw new Error("Policy is not active");

    if (!policy.coverage.includes(claimType)) {
      throw new Error(`Claim type '${claimType}' is not covered under your ${policy.tierName} plan`);
    }

    const claimId = `claim_${uuidv4().slice(0, 12)}`;
    const estimatedPayout = Math.min(
      estimatedLoss - policy.deductible,
      policy.maxPayout
    );

    const claim = {
      claimId,
      policyId,
      walletAddress,
      claimType,
      description,
      estimatedLoss,
      deductible: policy.deductible,
      estimatedPayout: Math.max(0, estimatedPayout),
      status: "under_review",
      filedAt: new Date().toISOString(),
      estimatedResolution: "7-14 business days",
    };

    this.claims.set(claimId, claim);
    return claim;
  }

  /**
   * Get policies for a wallet
   */
  getPolicies(walletAddress) {
    const results = [];
    for (const policy of this.activePolicies.values()) {
      if (policy.walletAddress === walletAddress) {
        results.push(policy);
      }
    }
    return results;
  }

  /**
   * Get claims for a wallet
   */
  getClaims(walletAddress) {
    const results = [];
    for (const claim of this.claims.values()) {
      if (claim.walletAddress === walletAddress) {
        results.push(claim);
      }
    }
    return results;
  }
}

module.exports = new InsuranceService();
