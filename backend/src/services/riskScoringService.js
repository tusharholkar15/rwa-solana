/**
 * Risk Scoring Service
 * Computes institutional-grade risk scores for each property asset.
 * Weighted composite model: occupancy, jurisdiction, volatility, yield stability, legal freshness.
 */

const Asset = require("../models/Asset");
const RiskScore = require("../models/RiskScore");
const OracleFeed = require("../models/OracleFeed");
const PropertyEvent = require("../models/PropertyEvent");

class RiskScoringService {
  /**
   * Compute and persist risk score for a property
   */
  async computePropertyRisk(assetId) {
    const asset = await Asset.findById(assetId);
    if (!asset) throw new Error("Asset not found");

    const factors = {};

    // 1. Occupancy score (30% weight) — higher occupancy = lower risk
    const occupancy = asset.propertyHealth?.occupancyRate || 0;
    factors.occupancy = {
      score: occupancy,  // 0–100 directly maps
      weight: 0.30,
      details: `${occupancy}% occupancy rate`,
    };

    // 2. Jurisdiction risk (20% weight)
    const jurisdictionRiskMap = {
      US: 85, SG: 90, UK: 85, EU: 80, AE: 75, JP: 90,
      IN: 60, BR: 55, NG: 40, DEFAULT: 50,
    };
    const country = asset.location?.country || "DEFAULT";
    const jurisdictionScore = jurisdictionRiskMap[country] || jurisdictionRiskMap.DEFAULT;
    factors.jurisdictionRisk = {
      score: jurisdictionScore,
      weight: 0.20,
      details: `${country} jurisdiction (stability: ${jurisdictionScore}/100)`,
    };

    // 3. Price volatility (20% weight) — lower volatility = higher score
    const priceHistory = await OracleFeed.find({
      assetId,
      timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }).select("navPrice");

    let volatilityScore = 50; // default
    if (priceHistory.length >= 5) {
      const prices = priceHistory.map((p) => p.navPrice);
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance =
        prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      const coeffOfVariation = mean > 0 ? (stdDev / mean) * 100 : 50;
      // CV < 2% = excellent (95), CV > 20% = poor (10)
      volatilityScore = Math.max(10, Math.min(95, 100 - coeffOfVariation * 5));
    }
    factors.priceVolatility = {
      score: Math.round(volatilityScore),
      weight: 0.20,
      details: `${priceHistory.length} data points, score: ${Math.round(volatilityScore)}`,
    };

    // 4. Yield stability (15% weight) — consistent rent payments = higher score
    const rentEvents = await PropertyEvent.find({
      assetId,
      eventType: "rent_collected",
      isVerified: true,
      createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
    });

    let yieldScore = 30; // default (no data)
    if (rentEvents.length >= 3) {
      const amounts = rentEvents.map((e) => e.amount);
      const avgRent = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const rentVariance =
        amounts.reduce((sum, a) => sum + Math.pow(a - avgRent, 2), 0) / amounts.length;
      const rentCV = avgRent > 0 ? (Math.sqrt(rentVariance) / avgRent) * 100 : 50;
      yieldScore = Math.max(10, Math.min(95, 100 - rentCV * 3));
    }
    factors.yieldStability = {
      score: Math.round(yieldScore),
      weight: 0.15,
      details: `${rentEvents.length} rent records in 6mo, score: ${Math.round(yieldScore)}`,
    };

    // 5. Legal document freshness (15% weight) — recent verification = higher score
    let legalScore = 20; // default
    const verificationDate = asset.verificationData?.approvedAt;
    if (verificationDate) {
      const daysSince = (Date.now() - new Date(verificationDate).getTime()) / (1000 * 60 * 60 * 24);
      legalScore = daysSince < 90 ? 95 : daysSince < 180 ? 80 : daysSince < 365 ? 60 : 30;
    }
    factors.legalDocFreshness = {
      score: legalScore,
      weight: 0.15,
      details: verificationDate
        ? `Last verified: ${new Date(verificationDate).toISOString().split("T")[0]}`
        : "No verification data",
    };

    // Compute weighted composite
    const overallScore = Math.round(
      Object.values(factors).reduce(
        (sum, f) => sum + f.score * f.weight,
        0
      )
    );

    const grade =
      overallScore >= 80 ? "A" :
      overallScore >= 65 ? "B" :
      overallScore >= 50 ? "C" :
      overallScore >= 35 ? "D" : "F";

    // Get previous score for trend analysis
    const previousRecord = await RiskScore.findOne({ assetId })
      .sort({ computedAt: -1 });

    const scoreDelta = previousRecord ? overallScore - previousRecord.overallScore : 0;
    const trend = scoreDelta > 2 ? "improving" : scoreDelta < -2 ? "declining" : "stable";

    // Persist
    const riskScore = new RiskScore({
      assetId,
      overallScore,
      grade,
      factors,
      previousScore: previousRecord?.overallScore || null,
      scoreDelta,
      trend,
    });
    await riskScore.save();

    return riskScore;
  }

  /**
   * Get latest risk score for an asset
   */
  async getLatestScore(assetId) {
    return RiskScore.findOne({ assetId }).sort({ computedAt: -1 });
  }

  /**
   * Get risk score history for charting
   */
  async getScoreHistory(assetId, days = 90) {
    return RiskScore.find({
      assetId,
      computedAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
    })
      .sort({ computedAt: 1 })
      .select("overallScore grade trend computedAt");
  }

  /**
   * Batch compute risk scores for all active assets
   */
  async computeAllScores() {
    const assets = await Asset.find({ isActive: true }).select("_id");
    const results = [];
    for (const asset of assets) {
      try {
        const score = await this.computePropertyRisk(asset._id);
        results.push({ assetId: asset._id, score: score.overallScore, grade: score.grade });
      } catch (err) {
        results.push({ assetId: asset._id, error: err.message });
      }
    }
    return results;
  }
}

module.exports = new RiskScoringService();
