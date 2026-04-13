const mongoose = require('mongoose');
const BackgroundTask = require('../src/models/BackgroundTask');
const backgroundWorkerService = require('../src/services/backgroundWorkerService');
require('dotenv').config();

async function verifyResilience() {
  console.log("--- Starting Resilience Verification ---");
  
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rwa-solana';
    await mongoose.connect(mongoUri);
    console.log("[INFO] Connected to DB");

    // 1. Create a PENDING task manually
    const task = new BackgroundTask({
      type: "TRANSFER_AGENT_SYNC",
      payload: { 
        assetId: "65d9c5a99573aee5a3cda46f", // Mock ID
        fromWallet: "MOCK_BUYER",
        toWallet: "MOCK_SELLER",
        amount: 100
      }
    });
    await task.save();
    console.log(`[PASS] Created PENDING task: ${task._id}`);

    // 2. Run the worker once
    console.log("[INFO] Running worker poll...");
    await backgroundWorkerService.pollAndProcess();

    // 3. Verify task status
    const updatedTask = await BackgroundTask.findById(task._id);
    console.log(`[INFO] Task Status after poll: ${updatedTask.status}`);
    
    if (updatedTask.status === "COMPLETED") {
       console.log("[PASS] Persistent task processed successfully.");
    } else {
       console.log(`[WARN] Task in state: ${updatedTask.status}. Check logs for details.`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("[FAIL] Resilience verification failed:", err.message);
  }
}

verifyResilience();
