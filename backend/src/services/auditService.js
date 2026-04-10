/**
 * Audit Trail Service
 * Implements an immutable log of all compliance and security events.
 */

const AuditLog = require("../models/AuditLog");

class AuditService {
  /**
   * Log a compliance event
   */
  async logEvent({ eventType, walletAddress, targetWallet = null, details = {}, performedBy = "system" }) {
    try {
      const log = new AuditLog({
        eventType,
        walletAddress,
        targetWallet,
        details,
        performedBy,
      });

      await log.save();
      return log;
    } catch (error) {
      console.error("Failed to append to audit log:", error);
      // We don't throw here to avoid failing the main transaction if logging fails,
      // but in production, this should ideally be atomic or use a reliable queue.
    }
  }

  /**
   * Query audit events with filters and pagination
   */
  async queryEvents(filters = {}, options = { limit: 50, skip: 0 }) {
    const query = {};

    if (filters.walletAddress) {
      query.$or = [
        { walletAddress: filters.walletAddress },
        { targetWallet: filters.walletAddress }
      ];
    }
    
    if (filters.eventType) {
      query.eventType = filters.eventType;
    }

    if (filters.performedBy) {
      query.performedBy = filters.performedBy;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    try {
      const total = await AuditLog.countDocuments(query);
      const events = await AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(options.skip)
        .limit(options.limit);

      return {
        total,
        events,
      };
    } catch (error) {
      console.error("Failed to query audit logs:", error);
      throw new Error("Audit log query failed");
    }
  }
}

module.exports = new AuditService();
