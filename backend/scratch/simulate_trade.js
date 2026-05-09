require('dotenv').config();
const axios = require('axios');
const nacl = require('tweetnacl');
const bs58Raw = require('bs58');
const bs58 = bs58Raw.default || bs58Raw;
const API_URL = 'http://localhost:5000/api';

// 1. Generate an Ephemeral Keypair for the simulation
const keypair = nacl.sign.keyPair();
const publicKeyBase58 = bs58.encode(keypair.publicKey);
const secretKey = keypair.secretKey;

console.log('🚀 Starting Institutional Cryptographic Simulation...');
console.log(`📍 Simulation Wallet: ${publicKeyBase58}\n`);

async function simulate() {
  try {
    // ─── Step 1: Submit KYC ──────────────────────────────────────────────
    console.log('[Step 1] Submitting Institutional KYC...');
    await axios.post(`${API_URL}/kyc/verify`, {
      walletAddress: publicKeyBase58,
      documentType: 'passport',
      documentId: 'INST-SIM-' + Date.now(),
      name: 'Simulated Institution',
      email: 'sim@protocol.internal'
    });
    console.log('✅ KYC Submitted. Waiting for Institutional Sync (4s)...');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    console.log('[Step 1.5] Verifying Sync Status...');
    const { data: status } = await axios.get(`${API_URL}/kyc/status/${publicKeyBase58}`);
    console.log(`✅ Current Status: ${status.status}\n`);
    
    console.log('✅ Sync Complete.\n');

    // ─── Step 2: SIWS Authentication ─────────────────────────────────────
    console.log('[Step 2] Generating SIWS Cryptographic Identity...');
    const timestamp = Date.now();
    const message = `Sign in to RWA Tokenization Platform | Protocol: Institutional v3 | Authorized Wallet: ${publicKeyBase58} | Timestamp: ${timestamp}`;
    
    const messageBytes = Buffer.from(message);
    const signatureBytes = nacl.sign.detached(messageBytes, secretKey);
    const signatureBase58 = bs58.encode(signatureBytes);

    const authHeaders = {
      'x-wallet-address': publicKeyBase58,
      'x-wallet-signature': signatureBase58,
      'x-wallet-message': message,
    };
    console.log('✅ Signature Generated.\n');

    // ─── Step 3: Fetch Marketplace ───────────────────────────────────────
    console.log('[Step 3] Fetching Primary Market Assets...');
    const { data: marketplace } = await axios.get(`${API_URL}/assets`);
    const asset = marketplace.assets[0];
    if (!asset) throw new Error('No assets found. Run "npm run seed" first.');
    console.log(`✅ Found Asset: ${asset.name} (${asset.symbol})`);
    console.log(`   Price: ${asset.pricePerTokenUsd.toFixed(2)} USD / token\n`);

    // ─── Step 4: Execute Trade (Primary Market) ──────────────────────────
    console.log(`[Step 4] Executing Buy Order (50 tokens)...`);
    const buyRes = await axios.post(`${API_URL}/buy`, {
      assetId: asset._id,
      shares: 50,
      walletAddress: publicKeyBase58
    }, { headers: authHeaders });

    console.log(`✅ Purchase Successful! TxHash: ${buyRes.data.transaction.txSignature}`);
    console.log(`   Message: ${buyRes.data.message}\n`);

    // ─── Step 5: Verify Portfolio ────────────────────────────────────────
    console.log('[Step 5] Verifying Institutional Portfolio...');
    const { data: portfolio } = await axios.get(`${API_URL}/portfolio/${publicKeyBase58}`, { 
      headers: authHeaders 
    });
    console.log(`✅ Portfolio confirmed. Active Holdings: ${portfolio.holdings.length}`);
    portfolio.holdings.forEach(h => {
      console.log(`   - ${h.assetName}: ${h.shares} tokens (Value: $${h.valueUsd.toFixed(2)})`);
    });

    console.log('\n✨ Simulation Complete: All Institutional Guardrails Passed.');
  } catch (error) {
    console.error('\n❌ Simulation Failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    process.exit(1);
  }
}

simulate();
