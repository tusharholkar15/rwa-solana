/**
 * Audit Trail Service (Regulator Grade)
 * Implements an immutable log of all compliance and security events.
 * Supports CSV/JSON exports for regulators.
 */

const AuditLog = require("../models/AuditLog");

class AuditService {
  /**
   * Log a compliance event
   */
  async logEvent({ eventType, walletAddress, targetWallet = null, details = {}, performedBy = "system" }, session = null) {
    try {
      const log = new AuditLog({
        eventType,
        walletAddress,
        targetWallet,
        details,
        performedBy,
        ipAddress: details.ipAddress || "system",
        jurisdiction: details.jurisdiction || "unknown",
        amlScore: details.amlScore || 0,
        regulatorFlag: details.regulatorFlag || !!details.isSuspicious
      });

      await log.save({ session });
      
      // Institutional Tracking: If this is a circuit breaker or suspicious activity, 
      // we MUST ensure it persists.
      if (details.isHighPriority && !session) {
         // Force immediate flush if no session provided for high priority events
         await log.save();
      }

      return log;
    } catch (error) {
      console.error("[AuditService] Failed to append to audit log:", error);
      
      // If we are in a session, we MUST throw to trigger a rollback.
      // Compliance integrity is paramount for institutional RWAs.
      if (session) {
        throw new Error(`Audit Logging Failed: ${error.message}. Rolling back main transaction.`);
      }
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
    
    if (filters.regulatorFlag !== undefined) {
      query.regulatorFlag = filters.regulatorFlag;
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

  /**
   * Export audit logs to CSV or JSON format for regulators.
   * This would typically be a BullMQ background task.
   */
  async exportLogs(filters = {}, format = "csv") {
    // To generate a fast export without loading all to memory, we use streams
    // For this demonstration, we await a `.find()` but it supports a cursor format.
    const query = {};
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const events = await AuditLog.find(query).sort({ createdAt: 1 }).lean();

    if (format === "json") {
      return JSON.stringify(events, null, 2);
    }

    // CSV Format
    const fields = ['_id', 'createdAt', 'eventType', 'walletAddress', 'targetWallet', 'performedBy', 'ipAddress', 'jurisdiction', 'amlScore', 'regulatorFlag', 'details'];
    let csv = fields.join(',') + '\n';
    
    for (const event of events) {
      const row = fields.map(f => {
         let val = event[f];
         if (f === 'details') val = JSON.stringify(val).replace(/"/g, '""'); // escape quotes
         return `"${val === undefined || val === null ? '' : val}"`;
      });
      csv += row.join(',') + '\n';
    }
    
    return csv;
  }
}

module.exports = new AuditService();
