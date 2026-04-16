/**
 * Institutional Shadow Testing Service
 * "Chaos Monkey" for RWA Assets — simulates black-swan events
 * to verify protocol resilience and circuit-breaker integrity.
 */

const logger = require("../config/logger");
const solanaService = require("./solanaService");
const BlockchainEvent = require("../models/BlockchainEvent");

class StressTestingService {
  /**
   * Simulate a 'Split-Brain' Oracle divergence
   * Intended to trip the OracleCircuitBreaker.
   */
  async simulateOracleDivergence(assetId, pythPrice, switchboardPrice) {
    const spread = Math.abs(pythPrice - switchboardPrice) / Math.min(pythPrice, switchboardPrice);
    logger.warn({ assetId, spread }, "[StressTest] Simulating Oracle Divergence...");

    // Trigger update_price with diverging feeds
    const result = await solanaService.updatePrice(assetId, {
      pyth: pythPrice,
      switchboard: switchboardPrice,
      twap: (pythPrice + switchboardPrice) / 2
    });

    if (result.isTripped) {
      logger.info({ assetId }, "[StressTest] SUCCESS: Circuit breaker tripped as expected.");
    } else {
      logger.error({ assetId }, "[StressTest] FAILURE: Breaker did NOT trip despite high spread!");
    }
    
    return result;
  }

  /**
   * Simulate a 'Flash-Loan' Governance Attack
   * Attempts to Buy + Vote in the same simulated lifecycle.
   */
  async simulateGovernanceAttack(wallet, assetId, proposalId) {
    logger.warn({ wallet, assetId }, "[StressTest] Attempting Flash-Loan Vote Attack...");

    try {
      // 1. Swap SOL for Tokens (AMM)
      await solanaService.swap(wallet, assetId, { amount: 1000, type: 'BUY' });
      
      // 2. Immediately attempt to Vote (should fail on-chain due to last_acquired_slot)
      const voteResult = await solanaService.castVote(wallet, proposalId, "FOR");
      
      if (voteResult.error === 'FlashLoanVoteBlocked') {
        logger.info("[StressTest] SUCCESS: Flash-loan vote correctly blocked by smart contract.");
      } else {
        logger.error("[StressTest] VULNERABILITY: Flash-loan vote was ACCEPTED!");
      }
    } catch (err) {
      logger.error({ err }, "[StressTest] Attack simulation crashed.");
    }
  }

  /**
   * Simulate 'Liquidity Drain' via Price Impact
   * Attempts a swap that moves the price > 3%.
   */
  async simulatePriceImpactDrain(assetId, amount) {
    logger.warn({ assetId, amount }, "[StressTest] Simulating AMM Price Impact attack...");

    const result = await solanaService.swap(null, assetId, { amount, type: 'BUY', simulate: true });
    
    if (result.priceImpact > 0.03) {
      logger.info({ impact: result.priceImpact }, "[StressTest] SUCCESS: Excessive price impact detected.");
      // The on-chain handler (swap_tokens.rs) will revert this.
    }
  }

  /**
   * Simulate Oracle Slot-Drift Attack
   * Attempts to update price with a stale message (manipulated drift).
   */
  async simulateSlotDriftAttack(assetId) {
    logger.warn({ assetId }, "[StressTest] Simulating Oracle Slot-Drift attack...");

    try {
      // Fetch latest asset state
      const asset = await Asset.findOne({ onChainAddress: assetId });
      if (!asset) throw new Error("Asset not found");

      // In a real test environment, we would use a stale Pyth PriceUpdateV2 account.
      // For this simulation/validation script, we trigger the call and expect 
      // the on-chain program to return 'OracleSlotDriftExceeded'.
      const result = await solanaService.updatePrice(assetId, {
        simulateDrift: true, // Internal flag for test-provider
        pyth: asset.pricePerToken,
        switchboard: asset.pricePerToken
      });

      if (result.error === "OracleSlotDriftExceeded") {
        logger.info("[StressTest] SUCCESS: Slot-drift correctly detected and blocked by on-chain guard.");
      } else if (result.isTripped) {
        logger.info("[StressTest] SUCCESS: Circuit breaker tripped due to consecutive drift failures.");
      } else {
        logger.error("[StressTest] FAILURE: Stale price was accepted!");
      }
      
      return result;
    } catch (err) {
      logger.error({ err: err.message }, "[StressTest] Slot-drift simulation error");
    }
  }
}

module.exports = new StressTestingService();
