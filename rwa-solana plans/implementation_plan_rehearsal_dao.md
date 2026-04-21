# Implementation Plan - Adversarial Rehearsal (DAO Edition)

This plan outlines the procedure for an institutional "War Game" simulation to verify the platform's decentralized security recovery infrastructure. We will simulate a catastrophic oracle failure and exercise the DAO-governed recovery loop to ensure all technical and governance guardrails are operational.

## User Review Required

> [!IMPORTANT]
> **Time-lock Simulation**: The on-chain `ExecuteProposal` instruction enforces a 24-hour timelock. For the rehearsal, we will simulate this by manually adjusting the `voteEnd` timestamp in the database to trigger the "Expired" state, allowing us to test the execution logic without waiting a full day.

## Proposed Changes

### 1. Backend: Solana Execution Bridge
We need to implement the actual on-chain execution logic in the backend to bridge the gap between a passed proposal and the Solana network.

#### [MODIFY] [solanaService.js](file:///c:/Users/Tushar/rwa-solana/backend/src/services/solanaService.js)
- Implement `executeGovernanceProposal(proposalId, assetId, proposalType, proposerAddress)`.
- Add account mapping for `OracleReset` variant (Asset, Breaker PDA, Proposer, Config).

#### [MODIFY] [governanceService.js](file:///c:/Users/Tushar/rwa-solana/backend/src/services/governanceService.js)
- Update `markExecuted` to call `solanaService.executeGovernanceProposal`.
- Ensure it handles the transaction signature return.

### 2. Research & Simulation Tooling
We will create a specialized driver to orchestrate the rehearsal.

#### [NEW] [rehearsal_dao_driver.js](file:///c:/Users/Tushar/rwa-solana/backend/src/scripts/rehearsal_dao_driver.js)
- **Stage 1**: Force a `price_divergence` breach on a target asset.
- **Stage 2**: Wait for `OracleMonitoringService` to trip the breaker.
- **Stage 3**: Programmatically create an `oracle_reset` proposal.
- **Stage 4**: Simulate passing the vote (Update votesFor in DB).
- **Stage 5**: Attempt execution (Verify Timelock failure).
- **Stage 6**: Cheat Time-lock (Modify DB) and execute.

## Verification Plan

### Automated Rehearsal
- Run `node backend/src/scripts/rehearsal_dao_driver.js "Asset Name"`.
- Monitor the `Network Integrity` dashboard for:
    - [ ] Asset Trip (Red Alert).
    - [ ] Active Proposal appears in Governance tracker.
    - [ ] Status transitions: `active` -> `passed` -> `executed`.
    - [ ] Asset Recovery (Green Heartbeat).

### Manual Verification
- Verify the On-chain transaction signature on the Solana Explorer to confirm the `OracleReset` instruction was successfully called.
