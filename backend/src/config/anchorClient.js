/**
 * Anchor Program Client
 * 
 * Provides a shared instance of the Anchor Program for interacting with the 
 * RWA smart contract on-chain.
 */

"use strict";

const anchor = require("@coral-xyz/anchor");
const bs58 = require("bs58");
const idl = require("./idl.json");
const logger = require("./logger");

class AnchorClient {
  constructor() {
    this.program = null;
    this.wallet = null;
    this.connection = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return this.program;

    try {
      const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.testnet.solana.com";
      const programIdStr = process.env.PROGRAM_ID;
      const adminSecretB58 = process.env.ADMIN_PRIVATE_KEY;

      if (!programIdStr || !adminSecretB58 || adminSecretB58 === "your_admin_private_key_here") {
        logger.warn("[AnchorClient] Missing credentials — running in read-only mode");
        this.connection = new anchor.web3.Connection(rpcUrl, "confirmed");
        const provider = new anchor.AnchorProvider(this.connection, {}, { commitment: "confirmed" });
        this.program = new anchor.Program(idl, provider);
        this.isInitialized = true;
        return this.program;
      }

      // Initialize with admin signer
      const adminKeypair = anchor.web3.Keypair.fromSecretKey(bs58.decode(adminSecretB58));
      this.wallet = new anchor.Wallet(adminKeypair);
      this.connection = new anchor.web3.Connection(rpcUrl, "confirmed");

      const provider = new anchor.AnchorProvider(this.connection, this.wallet, {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
      });

      this.program = new anchor.Program(idl, provider);
      this.isInitialized = true;

      logger.info(
        { publicKey: adminKeypair.publicKey.toBase58() },
        "[AnchorClient] Initialized successfully with admin signer"
      );

      return this.program;
    } catch (err) {
      logger.error({ err }, "[AnchorClient] Initialization failed");
      throw err;
    }
  }

  getProgram() {
    if (!this.isInitialized) {
      throw new Error("AnchorClient not initialized. Call initialize() first.");
    }
    return this.program;
  }
}

module.exports = new AnchorClient();
