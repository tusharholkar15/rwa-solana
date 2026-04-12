/**
 * Institutional Webhook Verification Script
 * Simulates Helius webhook payloads to verify Anchor event decoding and broadcasting.
 */
const axios = require('axios');

const LOCAL_WEBHOOK_URL = 'http://localhost:5000/api/webhooks/helius';

const MOCK_PAYLOADS = [
  // 1. Decoded AssetBought Event
  {
    signature: 'TEST_SIG_BOUGHT_EVENT_' + Date.now(),
    slot: 12345678,
    timestamp: Math.floor(Date.now() / 1000),
    logs: [
      "Program RwaP111111111111111111111111111111111111111 invoke [1]",
      "Program log: Instruction: BuyShares",
      "Program data: dV9V6UPr9XkDAAAAAAAACnS0vO9rEw8BAAAA", // Mocked Base64 Anchor Event
      "Program log: AssetBought event emitted",
      "Program RwaP111111111111111111111111111111111111111 consumed 12000 of 200000 compute units",
      "Program RwaP111111111111111111111111111111111111111 success"
    ],
    accountData: [{ account: "RwaP111111111111111111111111111111111111111" }]
  },
  // 2. Oracle Breach Alert
  {
    signature: 'TEST_SIG_BREACH_ALERT_' + Date.now(),
    slot: 12345679,
    timestamp: Math.floor(Date.now() / 1000),
    logs: [
      "Program RwaP111111111111111111111111111111111111111 invoke [1]",
      "Program log: Instruction: UpdatePrice",
      "Program data: mXf9Nf9Nf9OBAAAAAAAACnS0vO9rEw8BAAAA", // Mocked Base64 Breach Event
      "Program log: OracleBreachDetected event emitted",
      "Program RwaP111111111111111111111111111111111111111 success"
    ],
    accountData: [{ account: "RwaP111111111111111111111111111111111111111" }]
  },
  // 3. Legacy Fallback (No Anchor event, just instruction log)
  {
    signature: 'TEST_SIG_LEGACY_' + Date.now(),
    slot: 12345680,
    timestamp: Math.floor(Date.now() / 1000),
    logs: [
      "Program RwaP111111111111111111111111111111111111111 invoke [1]",
      "Program log: Instruction: SwapTokens",
      "Program RwaP111111111111111111111111111111111111111 success"
    ]
  }
];

async function runTest() {
  console.log('🚀 Starting Helius Webhook Simulation...\n');
  
  for (const payload of MOCK_PAYLOADS) {
    try {
      console.log(`📦 POSTing signature: ${payload.signature.substring(0, 15)}...`);
      const response = await axios.post(LOCAL_WEBHOOK_URL, [payload]);
      console.log(`✅ Accepted: ${response.data.status}\n`);
    } catch (err) {
      console.error(`❌ Failed: ${err.message}`);
      if (err.response) {
        console.error(`   Details: ${JSON.stringify(err.response.data)}\n`);
      }
    }
  }

  console.log('📡 Verification sequence completed.');
  console.log('Check the backend terminal for Decoded Event logs and DB check.');
}

runTest();
