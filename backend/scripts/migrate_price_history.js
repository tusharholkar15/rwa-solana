/**
 * Migration Script: Initialize PriceHistory for Existing Assets
 * 
 * Run: node scripts/migrate_price_history.js
 */

"use strict";

require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");
const anchorClient = require("../src/config/anchorClient");
const Asset = require("../src/models/Asset");
const logger = require("../src/config/logger");

async function migrate() {
  try {
    logger.info("Starting PriceHistory migration...");

    // 1. Connect DB
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info("Connected to MongoDB.");

    // 2. Initialize Anchor
    const program = await anchorClient.initialize();
    logger.info("Anchor client initialized.");

    // 3. Find all assets with on-chain addresses
    const assets = await Asset.find({ onChainAddress: { $exists: true, $ne: null } });
    logger.info(`Found ${assets.length} assets to inspect.`);

    for (const asset of assets) {
      const assetPubkey = new PublicKey(asset.onChainAddress);
      
      // Derive PriceHistory PDA
      const [historyAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("price_history"), assetPubkey.toBuffer()],
        program.programId
      );

      // Check if account exists
      const accountInfo = await program.provider.connection.getAccountInfo(historyAddress);
      
      if (accountInfo) {
        logger.info({ asset: asset.name, historyAddress: historyAddress.toBase58() }, "PriceHistory already exists. Skipping.");
        continue;
      }

      logger.warn({ asset: asset.name, historyAddress: historyAddress.toBase58() }, "PriceHistory missing. Initializing...");

      try {
        const tx = await program.methods
          .initializePriceHistory()
          .accounts({
            authority: anchorClient.wallet.publicKey,
            asset: assetPubkey,
            priceHistory: historyAddress,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        logger.info({ asset: asset.name, tx }, "Successfully initialized PriceHistory.");
      } catch (err) {
        logger.error({ asset: asset.name, err: err.message }, "Failed to initialize PriceHistory.");
      }
    }

    logger.info("Migration complete.");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Migration CRITICAL FAILURE");
    process.exit(1);
  }
}

migrate();
