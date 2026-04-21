const { Connection, PublicKey, Keypair, clusterApiUrl } = require("@solana/web3.js");

// Solana connection configuration
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || "devnet";
const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK);
const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || "11111111111111111111111111111111"
);

// Create connection
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

// Admin keypair (loaded from env)
let adminKeypair = null;
if (process.env.ADMIN_PRIVATE_KEY) {
  try {
    const secretKey = JSON.parse(process.env.ADMIN_PRIVATE_KEY);
    adminKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
  } catch {
    try {
      // Try base58 decode
      const bs58 = require("bs58");
      adminKeypair = Keypair.fromSecretKey(
        bs58.decode(process.env.ADMIN_PRIVATE_KEY)
      );
    } catch {
      console.warn("⚠️  Could not parse ADMIN_PRIVATE_KEY");
    }
  }
}

// PDA derivation helpers
function getAssetPda(authority, name) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("asset"), authority.toBuffer(), Buffer.from(name)],
    PROGRAM_ID
  );
}

function getTreasuryPda(assetPda) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("treasury"), assetPda.toBuffer()],
    PROGRAM_ID
  );
}

function getWhitelistPda(user) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("whitelist"), user.toBuffer()],
    PROGRAM_ID
  );
}

function getOwnershipPda(assetPda, owner) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("ownership"), assetPda.toBuffer(), owner.toBuffer()],
    PROGRAM_ID
  );
}

function getConfigPda() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
}

function getPoolPda(assetPda) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liquidity_pool"), assetPda.toBuffer()],
    PROGRAM_ID
  );
}

module.exports = {
  connection,
  PROGRAM_ID,
  SOLANA_NETWORK,
  SOLANA_RPC_URL,
  adminKeypair,
  getAssetPda,
  getTreasuryPda,
  getWhitelistPda,
  getOwnershipPda,
  getConfigPda,
  getPoolPda,
};
