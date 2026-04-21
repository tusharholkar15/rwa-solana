const {
  connection,
  PROGRAM_ID,
  adminKeypair,
  getAssetPda,
  getTreasuryPda,
  getWhitelistPda,
  getOwnershipPda,
} = require("../config/solana");
const { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require("@solana/web3.js");

class SolanaService {
  /**
   * Get SOL balance for a wallet
   */
  async getBalance(walletAddress) {
    try {
      const pubkey = new PublicKey(walletAddress);
      const balance = await connection.getBalance(pubkey);
      return {
        lamports: balance,
        sol: balance / LAMPORTS_PER_SOL,
      };
    } catch (error) {
      console.error("Error fetching balance:", error);
      return { lamports: 0, sol: 0 };
    }
  }

  /**
   * Get SPL token accounts for a wallet
   */
  async getTokenAccounts(walletAddress) {
    try {
      const pubkey = new PublicKey(walletAddress);
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        pubkey,
        { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
      );

      return tokenAccounts.value.map((account) => ({
        mint: account.account.data.parsed.info.mint,
        amount: account.account.data.parsed.info.tokenAmount.uiAmount,
        decimals: account.account.data.parsed.info.tokenAmount.decimals,
      }));
    } catch (error) {
      console.error("Error fetching token accounts:", error);
      return [];
    }
  }

  /**
   * Get recent transactions for a wallet
   */
  async getRecentTransactions(walletAddress, limit = 20) {
    try {
      const pubkey = new PublicKey(walletAddress);
      const signatures = await connection.getSignaturesForAddress(pubkey, {
        limit,
      });

      return signatures.map((sig) => ({
        signature: sig.signature,
        slot: sig.slot,
        blockTime: sig.blockTime,
        status: sig.confirmationStatus,
        err: sig.err,
      }));
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  }

  /**
   * Check if an account exists on-chain
   */
  async accountExists(address) {
    try {
      const pubkey = new PublicKey(address);
      const account = await connection.getAccountInfo(pubkey);
      return account !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get asset PDA info
   */
  getAssetPdaAddress(authorityAddress, assetName) {
    const authority = new PublicKey(authorityAddress);
    const [pda, bump] = getAssetPda(authority, assetName);
    return { address: pda.toBase58(), bump };
  }

  /**
   * Get whitelist PDA info
   */
  getWhitelistPdaAddress(userAddress) {
    const user = new PublicKey(userAddress);
    const [pda, bump] = getWhitelistPda(user);
    return { address: pda.toBase58(), bump };
  }

  /**
   * Get ownership PDA info
   */
  getOwnershipPdaAddress(assetAddress, ownerAddress) {
    const asset = new PublicKey(assetAddress);
    const owner = new PublicKey(ownerAddress);
    const [pda, bump] = getOwnershipPda(asset, owner);
    return { address: pda.toBase58(), bump };
  }

  /**
   * Get circuit breaker PDA info
   */
  getCircuitBreakerAddress(assetAddress) {
    const asset = new PublicKey(assetAddress);
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("circuit_breaker"), asset.toBuffer()],
      new PublicKey(PROGRAM_ID)
    );
    return { address: pda.toBase58(), bump };
  }

  /**
   * Fetch and decode on-chain Circuit Breaker state
   */
  async getCircuitBreakerState(assetAddress) {
    try {
      const { address } = this.getCircuitBreakerAddress(assetAddress);
      const program = require("../config/anchorClient").getProgram();
      const state = await program.account.oracleCircuitBreaker.fetch(address);
      
      // Map reason codes to strings
      const reasons = ["none", "spread", "failure", "zscore", "drift", "manual"];
      
      return {
        isTripped: state.isTripped,
        tripReason: reasons[state.tripReason] || "unknown",
        trippedAt: state.trippedAt.toNumber() > 0 ? new Date(state.trippedAt.toNumber() * 1000) : null,
        lastValidPrice: state.lastValidPrice.toNumber() / 1e9,
        worstSpreadBps: state.worstSpreadBps,
        consecutiveFailures: state.consecutiveFailures,
        lastUpdateSlot: state.lastUpdateSlot.toNumber(),
      };
    } catch (error) {
      console.error("Error fetching circuit breaker state:", error);
      return null;
    }
  }

  /**
   * Automatically compound accrued SOL yield into tokens via the AMM
   * Triggers the 'compound_yield' instruction from the harvester (backend admin).
   */
  async compoundYield(assetAddress, ownerAddress) {
    try {
      const { 
        getConfigPda, 
        getPoolPda, 
        getTreasuryPda, 
        getOwnershipPda 
      } = require("../config/solana");
      
      const asset = new PublicKey(assetAddress);
      const owner = new PublicKey(ownerAddress);
      
      const [configPda] = getConfigPda();
      const [poolPda] = getPoolPda(asset);
      const [treasuryPda] = getTreasuryPda(asset);
      const [ownershipPda] = getOwnershipPda(asset, owner);

      const anchorClient = require("../config/anchorClient");
      const program = await anchorClient.initialize();
      
      const tx = await program.methods
        .compoundYield()
        .accounts({
          harvester: adminKeypair.publicKey,
          config: configPda,
          asset: asset,
          pool: poolPda,
          treasury: treasuryPda,
          ownership: ownershipPda,
          owner: owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error("[SolanaService] Error compounding yield:", error);
      throw error;
    }
  }

  /**
   * Reset the oracle circuit breaker for an asset (Guardian recovery)
   * Re-activates an asset after an anomaly has been resolved.
   */
  async resetCircuitBreaker(assetAddress) {
    try {
      const asset = new PublicKey(assetAddress);
      const { address: breakerAddress } = this.getCircuitBreakerAddress(assetAddress);
      
      const anchorClient = require("../config/anchorClient");
      const program = await anchorClient.initialize();
      
      const tx = await program.methods
        .resetCircuitBreaker()
        .accounts({
          guardian: adminKeypair.publicKey,
          asset: asset,
          circuitBreaker: new PublicKey(breakerAddress),
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error("[SolanaService] Error resetting circuit breaker:", error);
      throw error;
    }
  }

  /**
   * Set auto-compounding preferences for an asset holding on-chain
   */
  async setCompoundingPreference(assetAddress, ownerAddress, enabled, threshold) {
    try {
      const asset = new PublicKey(assetAddress);
      const owner = new PublicKey(ownerAddress);
      const { getOwnershipPda } = require("../config/solana");
      const [ownershipPda] = getOwnershipPda(asset, owner);

      const anchorClient = require("../config/anchorClient");
      const program = await anchorClient.initialize();
      const anchor = require("@coral-xyz/anchor");
      
      const tx = await program.methods
        .setCompoundingPreference(enabled, new anchor.BN(threshold))
        .accounts({
          owner: owner,
          asset: asset,
          ownership: ownershipPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error("[SolanaService] Error setting compounding preference:", error);
      throw error;
    }
  }

  /**
   * Get cluster info
   */
  async getClusterInfo() {
    try {
      const version = await connection.getVersion();
      const slot = await connection.getSlot();
      const blockHeight = await connection.getBlockHeight();

      return {
        version: version["solana-core"],
        slot,
        blockHeight,
        network: process.env.SOLANA_NETWORK || "devnet",
        rpcUrl: process.env.SOLANA_RPC_URL,
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

module.exports = new SolanaService();
