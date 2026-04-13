/**
 * Yield Service: Scalable Pull-Based Distribution
 */

"use strict";

const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");
const anchorClient = require("../config/anchorClient");
const logger = require("../config/logger");

const YIELD_PRECISION = new anchor.BN("1000000000000"); // 10^12

class YieldService {
  /**
   * Get real-time pending yield for a user
   */
  async getPendingYield(assetAddress, userAddress) {
    try {
      const program = anchorClient.getProgram();
      const assetPubkey = new PublicKey(assetAddress);
      const userPubkey = new PublicKey(userAddress);

      // 1. Fetch Asset State
      const assetAcc = await program.account.assetAccount.fetch(assetPubkey);
      const globalAcc = new anchor.BN(assetAcc.accumulatedYieldPerShare.toString());

      // 2. Derive & Fetch User Ownership
      const [ownershipAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("ownership"), assetPubkey.toBuffer(), userPubkey.toBuffer()],
        program.programId
      );

      const ownershipAcc = await program.account.userOwnership.fetch(ownershipAddress);
      const shares = new anchor.BN(ownershipAcc.sharesOwned.toString());
      const debt = new anchor.BN(ownershipAcc.yieldDebt.toString());
      const unclaimedLamports = new anchor.BN(ownershipAcc.unclaimedYieldLamports.toString());

      // 3. Calculate: (Shares * GlobalAcc / Precision) - Debt + Unclaimed
      const totalAccScaled = shares.mul(globalAcc);
      const pendingScaled = totalAccScaled.sub(debt);
      const pendingLamports = pendingScaled.div(YIELD_PRECISION);

      const totalClaimable = pendingLamports.add(unclaimedLamports);

      return {
        amount: totalClaimable.toNumber(),
        amountSol: totalClaimable.toNumber() / 1e9,
        lastTransaction: ownershipAcc.lastTransactionAt.toNumber()
      };
    } catch (err) {
      logger.error({ err: err.message, assetAddress, userAddress }, "[YieldService] Failed to calculate pending yield");
      return { amount: 0, amountSol: 0 };
    }
  }

  /**
   * Fund the global yield pool (Admin only)
   */
  async fundGlobalYield(assetAddress, amountLamports) {
    try {
      const program = anchorClient.getProgram();
      const assetPubkey = new PublicKey(assetAddress);

      // Derive PDAs
      const [treasuryAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury"), assetPubkey.toBuffer()],
        program.programId
      );

      logger.info({ assetAddress, amountLamports }, "[YieldService] Funding global pool...");

      const tx = await program.methods
        .fundYield(new anchor.BN(amountLamports))
        .accounts({
          authority: anchorClient.wallet.publicKey,
          asset: assetPubkey,
          treasury: treasuryAddress,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      logger.info({ tx }, "[YieldService] Global yield funded successfully");
      return tx;
    } catch (err) {
      logger.error({ err: err.message, assetAddress }, "[YieldService] Failed to fund global yield");
      throw err;
    }
  }
}

module.exports = new YieldService();
