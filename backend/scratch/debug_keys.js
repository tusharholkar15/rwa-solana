const bs58 = require('bs58');
const { Keypair, PublicKey } = require('@solana/web3.js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const key = process.env.ADMIN_PRIVATE_KEY;
console.log('Key length:', key ? key.length : 'N/A');

try {
  const decoded = bs58.decode(key);
  console.log('Decoded length:', decoded.length);
  const kp = Keypair.fromSecretKey(decoded);
  console.log('PublicKey:', kp.publicKey.toBase58());
} catch (e) {
  console.error('Base58 decode failed:', e.message);
}

try {
  const pid = process.env.PROGRAM_ID;
  const pubkey = new PublicKey(pid);
  console.log('Program ID valid:', pubkey.toBase58());
} catch (e) {
  console.error('Program ID invalid:', e.message);
}
