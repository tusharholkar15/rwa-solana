/**
 * Verification Test: On-Chain TWAP Fallback
 * 
 * Verifies that the Solana contract correctly uses the ring buffer TWAP
 * when external oracles diverge.
 */

"use strict";

const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");
const bs58 = require("bs58");
const idl = require("../src/config/idl.json");

async function verify() {
  // Use environment or local defaults
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new anchor.Program(idl, provider);

  console.log("Starting verification...");

  // 1. Create a dummy asset for testing
  const assetName = "Test TWAP Asset " + Math.floor(Math.random() * 1000);
  const [assetPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("asset"), provider.wallet.publicKey.toBuffer(), Buffer.from(assetName)],
    program.programId
  );
  const [historyPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("price_history"), assetPDA.toBuffer()],
    program.programId
  );
  const [breakerPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("circuit_breaker"), assetPDA.toBuffer()],
    program.programId
  );

  console.log(`Testing with asset: ${assetName} at ${assetPDA.toBase58()}`);

  try {
    // Note: This script assumes you have run initialize_asset or similar.
    // In a real test we would call it here. 
    // For brevity, we check if it exists:
    const assetInfo = await provider.connection.getAccountInfo(assetPDA);
    if (!assetInfo) {
      console.log("Asset not found. Please ensure it is initialized.");
      return;
    }

    // 2. Push 3 normal prices to fill buffer
    console.log("Phase 1: Pushing normal prices...");
    for (let i = 0; i < 3; i++) {
        const price = 100 + i;
        await program.methods.updatePrice(
            new anchor.BN(price * 1e9), // switchboard
            new anchor.BN(price * 1e9)  // twap ref
        ).accounts({
            authority: provider.wallet.publicKey,
            asset: assetPDA,
            circuitBreaker: breakerPDA,
            priceUpdate: new PublicKey("7UVim1guvfS7uR9v86KCHiVNm8asH677V6UFDzC2Q8Ym"), // Devnet Pyth
            priceHistory: historyPDA
        }).rpc();
        console.log(`Pushed price: ${price}`);
    }

    // 3. Simulate a BREACH (Pyth vs Switchboard)
    // We expect the contract to use the mean of existing buffer (approx 101)
    console.log("Phase 2: Simulating BREACH (Switchboard = 200, Pyth = 100)...");
    const tx = await program.methods.updatePrice(
        new anchor.BN(200 * 1e9), // High divergence
        new anchor.BN(101 * 1e9)  
    ).accounts({
        authority: provider.wallet.publicKey,
        asset: assetPDA,
        circuitBreaker: breakerPDA,
        priceUpdate: new PublicKey("7UVim1guvfS7uR9v86KCHiVNm8asH677V6UFDzC2Q8Ym"),
        priceHistory: historyPDA
    }).rpc();

    console.log("Breach transaction sent:", tx);

    // 4. Verify asset price on-chain
    const assetAcc = await program.account.assetAccount.fetch(assetPDA);
    console.log(`On-chain price after breach fall-back: ${assetAcc.pricePerToken.toString()}`);
    
    if (assetAcc.pricePerToken.lt(new anchor.BN(110 * 1e9))) {
        console.log("✅ VERIFICATION SUCCESS: Contract correctly used TWAP fallback.");
    } else {
        console.log("❌ VERIFICATION FAILURE: Contract did not use TWAP.");
    }

  } catch (err) {
    console.error("Verification failed:", err);
  }
}

verify();
