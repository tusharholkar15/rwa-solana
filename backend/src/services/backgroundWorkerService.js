const BackgroundTask = require("../models/BackgroundTask");
const transferAgentService = require("./transferAgentService");
const logger = require("../config/logger");

class BackgroundWorkerService {
  constructor() {
    this.isProcessing = false;
    this.intervalId = null;
    this.pollIntervalMs = 5000; // 5 seconds
    this.maxAttempts = 5;
  }

  /**
   * Start the background worker loop
   */
  start() {
    if (this.intervalId) return;
    logger.info("[BackgroundWorker] Starting persistent task processor...");
    this.intervalId = setInterval(() => this.pollAndProcess(), this.pollIntervalMs);
  }

  /**
   * Stop the background worker loop
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Poll for PENDING or FAILED (with retries) tasks
   */
  async pollAndProcess() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const tasks = await BackgroundTask.find({
        status: { $in: ["PENDING", "FAILED"] },
        attempts: { $lt: this.maxAttempts },
        processAfter: { $lte: new Date() }
      })
      .sort({ createdAt: 1 })
      .limit(10);

      if (tasks.length > 0) {
        logger.info(`[BackgroundWorker] Found ${tasks.length} tasks to process`);
        for (const task of tasks) {
          await this.processTask(task);
        }
      }
    } catch (error) {
      logger.error({ err: error }, "[BackgroundWorker] Polling error");
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single task with error handling and retries
   */
  async processTask(task) {
    task.status = "PROCESSING";
    task.attempts += 1;
    await task.save();

    try {
      switch (task.type) {
        case "TRANSFER_AGENT_SYNC":
          await transferAgentService.processSync(task.payload);
          break;
        // Add other task types here (e.g., REGULATORY_REPORT)
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      task.status = "COMPLETED";
      task.completedAt = new Date();
      await task.save();
      logger.info(`[BackgroundWorker] Task ${task._id} (${task.type}) completed successfully`);

    } catch (error) {
      logger.error({ err: error, taskId: task._id }, `[BackgroundWorker] Task execution failed (Attempt ${task.attempts})`);
      
      task.status = "FAILED";
      task.lastError = error.message;
      
      // Exponential backoff for retries: 1m, 4m, 9m, 16m...
      const backoffMinutes = Math.pow(task.attempts, 2);
      task.processAfter = new Date(Date.now() + backoffMinutes * 60000);
      
      await task.save();
    }
  }
}

module.exports = new BackgroundWorkerService();
