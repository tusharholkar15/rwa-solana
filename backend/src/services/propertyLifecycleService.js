/**
 * Property Lifecycle Service
 * Manages real-world property status: rent, occupancy, maintenance, inspections.
 * Feeds data into risk scoring and yield recalculation.
 */

const PropertyEvent = require("../models/PropertyEvent");
const Asset = require("../models/Asset");
const auditService = require("./auditService");

class PropertyLifecycleService {
  /**
   * Update property occupancy rate
   */
  async updateOccupancy(assetId, rate, evidenceUrl, reportedBy) {
    if (rate < 0 || rate > 100) throw new Error("Occupancy rate must be 0–100");

    const asset = await Asset.findById(assetId);
    if (!asset) throw new Error("Asset not found");

    const previousRate = asset.propertyHealth?.occupancyRate || 0;

    const event = new PropertyEvent({
      assetId,
      eventType: "occupancy_change",
      occupancyRate: rate,
      previousOccupancyRate: previousRate,
      description: `Occupancy updated: ${previousRate}% → ${rate}%`,
      evidenceUrl,
      reportedBy,
    });
    await event.save();

    // Update asset
    if (!asset.propertyHealth) asset.propertyHealth = {};
    asset.propertyHealth.occupancyRate = rate;
    await asset.save();

    await auditService.logEvent({
      eventType: "occupancy_updated",
      walletAddress: reportedBy,
      details: { assetId, previousRate, newRate: rate },
    });

    return event;
  }

  /**
   * Record a rent collection event
   */
  async recordRentCollection(assetId, amount, period, paymentProof, reportedBy) {
    if (amount <= 0) throw new Error("Rent amount must be positive");

    const asset = await Asset.findById(assetId);
    if (!asset) throw new Error("Asset not found");

    const event = new PropertyEvent({
      assetId,
      eventType: "rent_collected",
      amount,
      period,
      description: `Rent collected for ${period}: $${amount.toLocaleString()}`,
      evidenceHash: paymentProof,
      reportedBy,
    });
    await event.save();

    // Update YTD rent
    if (!asset.propertyHealth) asset.propertyHealth = {};
    asset.propertyHealth.rentCollectedYTD =
      (asset.propertyHealth.rentCollectedYTD || 0) + amount;
    await asset.save();

    return event;
  }

  /**
   * Record a maintenance cost
   */
  async recordMaintenanceCost({
    assetId, amount, description, invoiceHash, category, vendor, reportedBy,
  }) {
    if (amount <= 0) throw new Error("Maintenance amount must be positive");

    const asset = await Asset.findById(assetId);
    if (!asset) throw new Error("Asset not found");

    const event = new PropertyEvent({
      assetId,
      eventType: "maintenance",
      amount,
      description,
      evidenceHash: invoiceHash,
      maintenanceCategory: category || "routine",
      vendor,
      reportedBy,
    });
    await event.save();

    // Update YTD maintenance
    if (!asset.propertyHealth) asset.propertyHealth = {};
    asset.propertyHealth.maintenanceCostYTD =
      (asset.propertyHealth.maintenanceCostYTD || 0) + amount;
    await asset.save();

    return event;
  }

  /**
   * Record a property inspection
   */
  async recordInspection(assetId, report, reportedBy) {
    const asset = await Asset.findById(assetId);
    if (!asset) throw new Error("Asset not found");

    const event = new PropertyEvent({
      assetId,
      eventType: "inspection",
      description: report.summary || "Property inspection completed",
      evidenceHash: report.reportHash,
      evidenceUrl: report.reportUrl,
      reportedBy,
    });
    await event.save();

    if (!asset.propertyHealth) asset.propertyHealth = {};
    asset.propertyHealth.lastInspectionAt = new Date();
    await asset.save();

    return event;
  }

  /**
   * Verify a property event (admin approval)
   */
  async verifyEvent(eventId, verifiedBy) {
    const event = await PropertyEvent.findById(eventId);
    if (!event) throw new Error("Event not found");
    if (event.isVerified) throw new Error("Event already verified");

    event.isVerified = true;
    event.verifiedBy = verifiedBy;
    event.verifiedAt = new Date();
    await event.save();

    await auditService.logEvent({
      eventType: "property_event_verified",
      walletAddress: verifiedBy,
      details: { eventId, eventType: event.eventType, assetId: event.assetId },
    });

    return event;
  }

  /**
   * Compute a property health score (0–100)
   * Based on occupancy, rent consistency, maintenance burden, and inspection freshness
   */
  async computeHealthScore(assetId) {
    const asset = await Asset.findById(assetId);
    if (!asset) throw new Error("Asset not found");

    const health = asset.propertyHealth || {};
    let score = 0;

    // Occupancy component (40% weight)
    const occupancy = health.occupancyRate || 0;
    score += (occupancy / 100) * 40;

    // Rent-to-maintenance ratio (30% weight)
    const rentYTD = health.rentCollectedYTD || 0;
    const maintenanceYTD = health.maintenanceCostYTD || 1;
    const rentRatio = Math.min(rentYTD / maintenanceYTD, 10) / 10;
    score += rentRatio * 30;

    // Inspection freshness (15% weight) — full score if inspected within 90 days
    const lastInspection = health.lastInspectionAt
      ? new Date(health.lastInspectionAt)
      : new Date(0);
    const daysSinceInspection = (Date.now() - lastInspection.getTime()) / (1000 * 60 * 60 * 24);
    const inspectionScore = Math.max(0, 1 - daysSinceInspection / 180);
    score += inspectionScore * 15;

    // Recent event activity (15% weight) — properties with recent events are healthier
    const recentEvents = await PropertyEvent.countDocuments({
      assetId,
      createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      isVerified: true,
    });
    const activityScore = Math.min(recentEvents / 10, 1);
    score += activityScore * 15;

    return {
      score: Math.round(score),
      grade:
        score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "F",
      components: {
        occupancy: { value: occupancy, weight: 40 },
        rentRatio: { value: Math.round(rentRatio * 100), weight: 30 },
        inspectionFreshness: { value: Math.round(inspectionScore * 100), weight: 15 },
        eventActivity: { value: Math.round(activityScore * 100), weight: 15 },
      },
    };
  }

  /**
   * Get full lifecycle dashboard for an asset
   */
  async getLifecycleDashboard(assetId) {
    const asset = await Asset.findById(assetId);
    if (!asset) throw new Error("Asset not found");

    const [healthScore, recentEvents, rentEvents, maintenanceEvents] =
      await Promise.all([
        this.computeHealthScore(assetId),
        PropertyEvent.find({ assetId })
          .sort({ createdAt: -1 })
          .limit(20),
        PropertyEvent.find({ assetId, eventType: "rent_collected" })
          .sort({ createdAt: -1 })
          .limit(12),
        PropertyEvent.find({ assetId, eventType: "maintenance" })
          .sort({ createdAt: -1 })
          .limit(10),
      ]);

    return {
      asset: {
        id: asset._id,
        name: asset.name,
        lifecycleStatus: asset.lifecycleStatus,
        propertyHealth: asset.propertyHealth,
      },
      healthScore,
      recentEvents,
      rentHistory: rentEvents,
      maintenanceHistory: maintenanceEvents,
    };
  }

  /**
   * Get event history with filters
   */
  async getEvents(assetId, filters = {}, options = { limit: 50, skip: 0 }) {
    const query = { assetId };
    if (filters.eventType) query.eventType = filters.eventType;
    if (filters.isVerified !== undefined) query.isVerified = filters.isVerified;
    if (filters.startDate) query.createdAt = { $gte: new Date(filters.startDate) };
    if (filters.endDate) {
      query.createdAt = { ...query.createdAt, $lte: new Date(filters.endDate) };
    }

    const total = await PropertyEvent.countDocuments(query);
    const events = await PropertyEvent.find(query)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit);

    return { total, events };
  }
}

module.exports = new PropertyLifecycleService();
