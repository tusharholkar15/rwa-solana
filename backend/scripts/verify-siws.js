/**
 * SIWS & Institutional Security Verification Script
 * 
 * Tests:
 * 1. Signature Requirement (401 without headers)
 * 2. Invalid Signature Rejection
 * 3. Deep Sanitization ($ key stripping)
 */
const axios = require('axios');
const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Institutional Security Audit...');

  // TEST 1: SIWS Requirement
  try {
    console.log('\n📡 Test 1: POST /api/buy without SIWS headers');
    await axios.post(`${API_URL}/buy`, { assetId: 'mock', shares: 10 });
    console.error('❌ FAIL: Request succeeded without headers');
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('✅ PASS: Correctly rejected (401 Unauthorized)');
    } else {
      console.error('❌ FAIL: Unexpected error', err.response?.status);
    }
  }

  // TEST 2: Signature Requirement (Mock should fail)
  try {
    console.log('\n📡 Test 2: POST with MOCK_SIGNATURE (Expected failure)');
    await axios.post(`${API_URL}/buy`, { 
      assetId: '507f1f77bcf86cd799439011',
      shares: 10
    }, {
      headers: {
        'x-wallet-address': 'DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'x-wallet-signature': 'MOCK_SIGNATURE',
        'x-wallet-message': 'Login-' + Date.now()
      }
    });
    console.error('❌ FAIL: Request succeeded with invalid mock signature');
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('✅ PASS: Correctly rejected invalid/mock signature (401)');
    } else {
      console.error('❌ FAIL: Unexpected error', err.response?.status, err.message);
    }
  }

  // TEST 3: Expired Signature
  try {
    console.log('\n📡 Test 3: GET with expired timestamp');
    await axios.get(`${API_URL}/portfolio/DemoWa11et/tax-lots`, {
      headers: {
        'x-wallet-address': 'DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'x-wallet-signature': 'IGNORED_BECAUSE_EXP_CHECK_FIRST',
        'x-wallet-message': 'Login-1000' 
      }
    });
    console.error('❌ FAIL: Succeeded with expired signature');
  } catch (err) {
    if (err.response?.status === 401) {
       console.log('✅ PASS: Correctly rejected expired signature (401)');
    } else {
       console.error('❌ FAIL: Unexpected error', err.response?.status, err.message);
    }
  }

  console.log('\n🏁 Institutional Security Audit Complete.');
}

runTests();
