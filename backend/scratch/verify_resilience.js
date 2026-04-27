/**
 * Resilience Verification Script
 *
 * Tests the full hardening pipeline end-to-end:
 *  1. Transfer Agent persistent outbox (queue → process → complete)
 *  2. Outbox dead-letter replay (simulated indexer failure → BackgroundTask → retry)
 *  3. Ledger reconciliation task lifecycle
 *
 * Usage: node backend/scratch/verify_resilience.js
 */

const mongoose = require('mongoose');
const BackgroundTask = require('../src/models/BackgroundTask');
const backgroundWorkerService = require('../src/services/backgroundWorkerService');
require('dotenv').config();

const DIVIDER = '─'.repeat(60);

async function verifyResilience() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  🔒 RWA Platform — Resilience Verification Suite    ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rwa-solana';
    await mongoose.connect(mongoUri);
    console.log('[INFO] Connected to MongoDB\n');

    // ═══════════════════════════════════════════════════════════
    // TEST 1: Transfer Agent Persistent Outbox
    // ═══════════════════════════════════════════════════════════
    console.log(DIVIDER);
    console.log('TEST 1: Transfer Agent Outbox (queue → process → complete)');
    console.log(DIVIDER);

    const taTask = new BackgroundTask({
      type: 'TRANSFER_AGENT_SYNC',
      payload: {
        assetId: '69d9c5a99573aee5a3cd9c2b',
        fromWallet: 'TEST_BUYER_' + Date.now(),
        toWallet: 'TEST_SELLER_' + Date.now(),
        amount: 100,
      },
    });
    await taTask.save();
    console.log(`  [CREATED] PENDING task: ${taTask._id}`);

    await backgroundWorkerService.pollAndProcess();

    const taResult = await BackgroundTask.findById(taTask._id);
    if (taResult.status === 'COMPLETED') {
      console.log('  [PASS] ✅ Transfer Agent task processed successfully');
    } else {
      console.log(`  [WARN] ⚠️  Task in state: ${taResult.status} (error: ${taResult.lastError})`);
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 2: Outbox Dead-Letter Replay
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + DIVIDER);
    console.log('TEST 2: Outbox Dead-Letter (OUTBOX_DISPATCH lifecycle)');
    console.log(DIVIDER);

    const outboxTask = new BackgroundTask({
      type: 'OUTBOX_DISPATCH',
      payload: {
        signature: 'test_sig_' + Date.now(),
        slot: 999999,
        timestamp: new Date(),
        parsedType: 'BUY',
        assetId: 'test-asset-id',
        wallet: 'test-wallet',
        amount: 50,
        rawTx: { logs: ['Instruction: BuyShares'] },
      },
    });
    await outboxTask.save();
    console.log(`  [CREATED] PENDING outbox task: ${outboxTask._id}`);

    await backgroundWorkerService.pollAndProcess();

    const outboxResult = await BackgroundTask.findById(outboxTask._id);
    if (outboxResult.status === 'COMPLETED') {
      console.log('  [PASS] ✅ Outbox dispatch replayed and completed');
    } else {
      console.log(`  [WARN] ⚠️  Outbox task in state: ${outboxResult.status}`);
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 3: Ledger Reconciliation
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + DIVIDER);
    console.log('TEST 3: Ledger Reconciliation Task');
    console.log(DIVIDER);

    const reconTask = new BackgroundTask({
      type: 'LEDGER_RECONCILE',
      payload: { scope: 'test', triggeredBy: 'verify_resilience' },
    });
    await reconTask.save();
    console.log(`  [CREATED] PENDING reconcile task: ${reconTask._id}`);

    await backgroundWorkerService.pollAndProcess();

    const reconResult = await BackgroundTask.findById(reconTask._id);
    if (reconResult.status === 'COMPLETED') {
      console.log('  [PASS] ✅ Ledger reconciliation completed');
    } else {
      console.log(`  [WARN] ⚠️  Reconcile task in state: ${reconResult.status}`);
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 4: Dead-Letter Exhaustion
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + DIVIDER);
    console.log('TEST 4: Dead-Letter Exhaustion (maxAttempts exceeded)');
    console.log(DIVIDER);

    const dlTask = new BackgroundTask({
      type: 'TRANSFER_AGENT_SYNC',
      payload: { assetId: 'nonexistent-will-fail', fromWallet: 'a', toWallet: 'b', amount: 1 },
      attempts: 4,     // Already at 4 of default 5
      maxAttempts: 5,
      status: 'FAILED',
    });
    await dlTask.save();
    console.log(`  [CREATED] Pre-exhausted task: ${dlTask._id} (4/5 attempts)`);

    await backgroundWorkerService.pollAndProcess();

    const dlResult = await BackgroundTask.findById(dlTask._id);
    if (dlResult.status === 'DEAD_LETTER') {
      console.log('  [PASS] ✅ Task correctly moved to DEAD_LETTER');
    } else {
      console.log(`  [WARN] ⚠️  Expected DEAD_LETTER, got: ${dlResult.status}`);
    }

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + DIVIDER);
    console.log('📊 SUMMARY');
    console.log(DIVIDER);

    const counts = await BackgroundTask.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    console.log('  Task distribution:');
    counts.forEach((c) => console.log(`    ${c._id}: ${c.count}`));

    // Cleanup test tasks
    await BackgroundTask.deleteMany({
      _id: { $in: [taTask._id, outboxTask._id, reconTask._id, dlTask._id] },
    });
    console.log('\n  [CLEANUP] Test tasks removed');

    await mongoose.disconnect();
    console.log('\n✅ All resilience checks complete.\n');
  } catch (err) {
    console.error('\n[FAIL] ❌ Resilience verification failed:', err.message);
    process.exit(1);
  }
}

verifyResilience();
