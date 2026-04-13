const axios = require('axios');

async function verifyHardening() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log("--- Starting Hardening Verification ---");

  try {
    // 1. Check Oracle Health
    const health = await axios.get(`${BASE_URL}/oracle/health`);
    console.log("[PASS] Oracle Health:", health.data);

    // 2. Fetch Assets and find one to test
    const assetsRes = await axios.get(`${BASE_URL}/assets`);
    const testAsset = assetsRes.data.assets[0];
    if (!testAsset) throw new Error("No assets found to test");
    console.log(`[INFO] Testing with Asset: ${testAsset.name} (${testAsset._id})`);

    // 3. Verify Cache HIT (X-Cache header check would be manual or via response time)
    const t1 = Date.now();
    await axios.get(`${BASE_URL}/assets/${testAsset._id}`);
    const firstCall = Date.now() - t1;
    
    const t2 = Date.now();
    await axios.get(`${BASE_URL}/assets/${testAsset._id}`);
    const secondCall = Date.now() - t2;
    console.log(`[INFO] First Call: ${firstCall}ms, Second Call: ${secondCall}ms (Cache Potential)`);

    // 4. Verify Automatic Pausal (Logic Check)
    // Note: To truly test this, we'd need to mock the feed in PriceService.
    // For now, we verify the status endpoint.
    const status = await axios.get(`${BASE_URL}/oracle/status/${testAsset._id}`);
    console.log("[PASS] Oracle Status Endpoint:", status.data);

  } catch (err) {
    console.error("[FAIL] Verification failed:", err.message);
    if (err.response) console.error("Response:", err.response.data);
  }
}

verifyHardening();
