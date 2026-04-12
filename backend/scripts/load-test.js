/**
 * Institutional Load Test Script
 * Simulates concurrent buy and sell transactions to validate backend atomicity and performance.
 */
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { connectDatabase } = require('../src/config/database');

const API_URL = 'http://localhost:5000/api';
const CONCURRENT_USERS = 20;
const TRADES_PER_USER = 2; // Total 40 transactions (well within 100-req limit)

async function runLoadTest() {
  console.log('🚀 Starting Institutional Load Test...');
  console.log(`📊 Parameters: ${CONCURRENT_USERS} users, ${TRADES_PER_USER} trades/user`);
  
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  // 0. Setup: Create KYC-approved users for the test wallets
  await connectDatabase();
  const wallets = Array.from({ length: CONCURRENT_USERS }, () => `TestWalletAddr11111111111111111${uuidv4().substring(0, 8)}`);
  
  console.log('👤 Seeding KYC-approved test users...');
  await User.insertMany(wallets.map(w => ({
    walletAddress: w,
    kycStatus: 'approved',
    isWhitelisted: true
  })));

  // 1. Get an available asset
  let assetId;
  try {
    const assetsRes = await axios.get(`${API_URL}/assets?limit=1`);
    assetId = assetsRes.data.assets[0]._id;
    console.log(`🔹 Testing with Asset: ${assetsRes.data.assets[0].name} (${assetId})`);
  } catch (e) {
    console.error('❌ Failed to fetch assets for test:', e.message);
    return;
  }

  // 2. Already generated wallets above


  // 3. Execution Function
  const executeUserTrades = async (wallet) => {
    for (let i = 0; i < TRADES_PER_USER; i++) {
      const type = i % 2 === 0 ? 'buy' : 'sell';
      try {
        await axios.post(`${API_URL}/${type}`, {
          assetId,
          shares: 0.1, // Fractional shares
          walletAddress: wallet
        });
        successCount++;
        if (successCount % 10 === 0) process.stdout.write('🟢');
      } catch (e) {
        failCount++;
        process.stdout.write('🔴');
        const errorMsg = e.response?.data?.details || e.response?.data?.error || e.message;
        console.error(`\n[${type.toUpperCase()} FAILED] ${errorMsg}`);
      }
    }
  };

  // 4. Run Concurrent Users
  console.log('⏳ Running trades...');
  await Promise.all(wallets.map(w => executeUserTrades(w)));

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log('\n\n✅ Load Test Completed!');
  console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
  console.log(`📈 Success: ${successCount}`);
  console.log(`📉 Failed: ${failCount}`);
  console.log(`🚀 Throughput: ${(successCount / duration).toFixed(2)} tx/s`);

  // 5. Fetch Metrics
  try {
    const metricsRes = await axios.get(`${API_URL}/admin/metrics`);
    console.log('\n📊 Infrastructure Metrics:');
    console.log(JSON.stringify(metricsRes.data.infrastructure, null, 2));
  } catch (e) {
     console.log('\n⚠️  Could not fetch final metrics (Admin signature required?)');
  }

  // 6. Cleanup
  console.log('\n🧹 Cleaning up test users...');
  await User.deleteMany({ walletAddress: { $in: wallets } });
  await mongoose.connection.close();
}

runLoadTest();
