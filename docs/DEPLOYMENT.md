# AssetVerse — Solana Devnet Deployment Playbook & Checklist

**Project:** AssetVerse Institutional Real-World Asset (RWA) Platform  
**Target Cluster:** Solana Devnet (`https://api.devnet.solana.com`)  
**Target Program ID:** `FRYwN6vKAVhQNvEcJ8844XxLe3b8zLwivnZk65dnW9HC`  
**Standard:** Upgradeable BPF Loader (`BPFLoaderUpgradeab1e11111111111111111111111`)

---

## 1. Prerequisites

Before deployment, ensure the following toolchains are present:

* **Solana CLI:** `solana-cli >= 1.18.x` (verified with `1.18.26` Agave client in WSL2 Ubuntu).
* **Solana SBF SDK:** `solana-cargo-build-sbf >= 1.18.x`.
* **Node.js:** `>= 18.x` (for preflight verification and backend services).
* **Docker:** (Optional) `backpackapp/build:v0.30.1` for standalone Anchor CLI operations.
* **Configured Deployer Keypair:** `~/.config/solana/id.json` on the deployment host.
* **Solana Config Target:** Set cluster to devnet:
  ```bash
  solana config set --url https://api.devnet.solana.com
  ```

---

## 2. Required Wallet Funding Breakdown

Deploying an upgradeable Solana program requires upfront rent allocation for both the permanent on-chain program accounts and a temporary write buffer.

| Account / Requirement | Size | Rent / Cost | Purpose |
| :--- | :--- | :--- | :--- |
| **Program Account** | 36 bytes | `0.00083312 SOL` | Program metadata pointer |
| **ProgramData Account** | 1,112,349 bytes | `5.65138316 SOL` | Permanent on-chain bytecode + 45B header |
| **Temporary Deployment Buffer** | 1,112,349 bytes | `5.65138316 SOL` | Staging buffer during upload (reclaimed post-deploy) |
| **Transaction Fees** | ~2,500 chunks | `~0.05000000 SOL` | Upload chunk transaction fees |
| **Minimum Required Upfront** | — | **`11.3536 SOL`** | Absolute minimum balance to initiate deploy |
| **Recommended Safety Balance** | — | **`12.5 - 13.0 SOL`** | Safe margin for network fee spikes and retries |

> [!IMPORTANT]
> Because the deployer wallet balance is currently `0 SOL` and public devnet faucets enforce rate limits, fund the deployer public key (`Eoo37Vgds98BL7DU3r4Y9waJVXLDdCnbhK4KXMcyqjVx`) using an institutional faucet, Devnet partner, or OTC Devnet transfer prior to triggering deployment.

---

## 3. Program ID Verification

The platform relies on a deterministic Program ID across all smart contract modules, client libraries, indexers, and frontends:

* **Target Program ID:** `FRYwN6vKAVhQNvEcJ8844XxLe3b8zLwivnZk65dnW9HC`
* **Program Keypair:** `target/deploy/rwa_tokenization-keypair.json`

Verify keypair match:
```bash
solana-keygen pubkey target/deploy/rwa_tokenization-keypair.json
# Expected Output: FRYwN6vKAVhQNvEcJ8844XxLe3b8zLwivnZk65dnW9HC
```

Cross-configuration alignment:
- `programs/rwa-tokenization/src/lib.rs` → `declare_id!("FRYwN6vKAVhQNvEcJ8844XxLe3b8zLwivnZk65dnW9HC");`
- `Anchor.toml` → `[programs.devnet] rwa_tokenization = "FRYwN6vKAVhQNvEcJ8844XxLe3b8zLwivnZk65dnW9HC"`
- `backend/.env` → `PROGRAM_ID=FRYwN6vKAVhQNvEcJ8844XxLe3b8zLwivnZk65dnW9HC`
- `frontend/.env.local` → `NEXT_PUBLIC_PROGRAM_ID=FRYwN6vKAVhQNvEcJ8844XxLe3b8zLwivnZk65dnW9HC`

---

## 4. Build Command

To compile the smart contract into Solana SBF bytecode:

### Via WSL2 Ubuntu:
```bash
cargo-build-sbf \
  --manifest-path programs/rwa-tokenization/Cargo.toml \
  --sbf-out-dir target/deploy
```

### Via Root npm helper:
```powershell
npm run build:program
```

Verify generated binary:
```powershell
Get-Item target/deploy/rwa_tokenization.so
# Confirms size is approx 1,112,304 bytes with valid ELF header
```

---

## 5. Preflight Command

Execute the deterministic, zero-side-effect preflight inspector:

```powershell
npm run preflight
# or directly:
node scripts/preflight.js
```

The preflight script checks 34 validation points:
- CLI availability & toolchain versions
- Binary integrity and keypair public key derivation
- Cross-configuration consistency
- IDL structure and presence in `backend/src/config/idl.json` and `target/idl/`
- Safe environment variables (with secrets redacted)
- Live Devnet RPC health, slot latency, and deployer balance

---

## 6. Deployment Command

Once the deployer wallet balance is funded (>= 11.36 SOL, recommended 13.0 SOL), execute the deploy command:

### Deployment via Solana CLI:
```bash
solana program deploy \
  --url devnet \
  --keypair ~/.config/solana/id.json \
  --program-id target/deploy/rwa_tokenization-keypair.json \
  target/deploy/rwa_tokenization.so
```

### Deployment via Windows PowerShell:
```powershell
wsl -d Ubuntu -e bash -l -c "cd /mnt/c/Users/HP/rwa-solana && solana program deploy --url devnet --keypair ~/.config/solana/id.json --program-id target/deploy/rwa_tokenization-keypair.json target/deploy/rwa_tokenization.so"
```

> [!NOTE]
> The `--program-id` keypair signs the initial deploy transaction to establish ownership of `FRYwN6vKAVhQNvEcJ8844XxLe3b8zLwivnZk65dnW9HC`. Future upgrades will only require the `--upgrade-authority` signer (`~/.config/solana/id.json`).

---

## 7. Post-Deployment Verification

Verify the on-chain account state and upgrade authority on Devnet:

```bash
solana program show FRYwN6vKAVhQNvEcJ8844XxLe3b8zLwivnZk65dnW9HC --url devnet
```

Expected output:
* **ProgramData Address:** `<PUBKEY>`
* **Authority:** `Eoo37Vgds98BL7DU3r4Y9waJVXLDdCnbhK4KXMcyqjVx`
* **Last Deployed In Slot:** `<SLOT_NUMBER>`
* **Data Length:** `1,112,349 bytes`

Check deployer reclaimed balance:
```bash
solana balance Eoo37Vgds98BL7DU3r4Y9waJVXLDdCnbhK4KXMcyqjVx --url devnet
# Buffer rent (~5.65 SOL) is automatically closed and reclaimed, leaving ~6-7 SOL
```

---

## 8. Explorer Verification

Inspect the program on public block explorers:

* **Solscan Devnet:**
  `https://solscan.io/account/FRYwN6vKAVhQNvEcJ8844XxLe3b8zLwivnZk65dnW9HC?cluster=devnet`
* **Solana Explorer:**
  `https://explorer.solana.com/address/FRYwN6vKAVhQNvEcJ8844XxLe3b8zLwivnZk65dnW9HC?cluster=devnet`

Verify:
- "Executable: Yes"
- "Owner: BPFLoaderUpgradeab1e11111111111111111111111"
- Upgrade Authority matches `Eoo37Vgds98BL7DU3r4Y9waJVXLDdCnbhK4KXMcyqjVx`

---

## 9. Backend & Frontend Configuration Checks

### Backend Services Verification:
1. Verify backend health endpoint:
   ```bash
   curl -s http://localhost:5000/api/health
   # Returns status: "healthy", network: "devnet", services.solana: "connected"
   ```
2. Verify Indexer reconciliation scan against the deployed program ID:
   ```bash
   # Indexer service polls Devnet RPC for signatures on FRYwN6vKAVhQNvEcJ8844XxLe3b8zLwivnZk65dnW9HC
   ```

### Frontend Web App Verification:
1. Open `http://localhost:3000`.
2. Connect Phantom or Solflare wallet configured to **Solana Devnet**.
3. Verify wallet balance displays Devnet SOL.
4. Verify asset card yields, pricing feeds, and contract addresses link to `?cluster=devnet`.

---

## 10. Recovery Steps for Failed Deployment

If a deployment transaction times out or drops due to Devnet RPC congestion:

### Step 1: Check for Unclosed Buffer Accounts
```bash
solana program show --buffers --url devnet
```
If an unclosed buffer exists, it holds ~5.65 SOL of your balance.

### Step 2: Option A — Reclaim Buffer Rent
If you want to cancel and retrieve the rent-exempt SOL:
```bash
solana program close --buffers --url devnet
```

### Step 3: Option B — Resume Deployment Using Existing Buffer
If part of the bytecode was already uploaded:
```bash
solana program deploy \
  --url devnet \
  --keypair ~/.config/solana/id.json \
  --buffer <BUFFER_PUBKEY> \
  --program-id target/deploy/rwa_tokenization-keypair.json \
  target/deploy/rwa_tokenization.so
```

### Step 4: Use Priority Fees if Dropped
```bash
solana program deploy \
  --url devnet \
  --with-compute-unit-price 1000 \
  --use-rpc \
  --program-id target/deploy/rwa_tokenization-keypair.json \
  target/deploy/rwa_tokenization.so
```
