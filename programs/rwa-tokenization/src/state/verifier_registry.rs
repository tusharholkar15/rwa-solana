use anchor_lang::prelude::*;

/// On-chain verifier registry entry — tracks reputation and stake of each verifier
/// PDA seeds: [b"verifier", verifier.key()]
///
/// Verifiers are approved entities (law firms, title companies, auditors) who
/// stake collateral and sign legal attestations for asset verification.
/// Multi-sig: 2-of-3 independent verifiers must approve before an asset activates.
#[account]
#[derive(InitSpace)]
pub struct VerifierRegistry {
    /// The verifier's wallet pubkey
    pub verifier: Pubkey,

    /// Human-readable name (e.g., "DLA Piper LLP")
    #[max_len(64)]
    pub name: String,

    /// Jurisdiction this verifier is licensed in (bitmask, matches asset.allowed_jurisdictions)
    pub jurisdiction_bitmask: u32,

    /// Reputation score (0–1000). New verifiers start at 500. Slashed on fraud.
    pub reputation_score: u16,

    /// Total assets verified by this verifier
    pub total_verified: u32,

    /// Total verifications disputed/flagged as fraudulent
    pub total_disputed: u32,

    /// USDC staked as collateral (slashed 50% if verified asset found fraudulent)
    pub stake_amount: u64,

    /// Whether the verifier is currently active on the platform
    pub is_active: bool,

    /// Unix timestamp when this verifier was registered
    pub registered_at: i64,

    /// Unix timestamp of most recent verification action
    pub last_active_at: i64,

    /// Admin who approved this verifier's registration
    pub approved_by: Pubkey,

    /// PDA bump seed
    pub bump: u8,
}

impl VerifierRegistry {
    pub const SEED_PREFIX: &'static [u8] = b"verifier";

    /// Minimum reputation to participate in verification (out of 1000)
    pub const MIN_REPUTATION: u16 = 400;

    /// Minimum USDC stake required (500 USDC = 500_000_000 micro-USDC)
    pub const MIN_STAKE_USDC: u64 = 500_000_000;

    /// Reputation penalty for a disputed verification
    pub const DISPUTE_REPUTATION_PENALTY: u16 = 100;

    /// Stake slash percentage on confirmed fraud (50%)
    pub const FRAUD_SLASH_BPS: u16 = 5000;

    pub fn can_verify(&self) -> bool {
        self.is_active
            && self.reputation_score >= Self::MIN_REPUTATION
            && self.stake_amount >= Self::MIN_STAKE_USDC
    }
}

/// Multi-verifier approval record for a specific asset
/// PDA seeds: [b"multi_verify", asset.key()]
///
/// Tracks the 2-of-3 verifier council approval process.
/// Once 2 verifiers sign, the asset transitions to Verified status.
#[account]
#[derive(InitSpace)]
pub struct MultiVerification {
    /// Asset being verified
    pub asset: Pubkey,

    /// First verifier (optional until they sign)
    pub verifier_1: Pubkey,

    /// Second verifier (optional until they sign)
    pub verifier_2: Pubkey,

    /// Third verifier (optional, acts as tiebreaker)
    pub verifier_3: Pubkey,

    /// Bitmask: bit 0 = verifier_1 signed, bit 1 = verifier_2 signed, bit 2 = verifier_3 signed
    pub approval_bitmask: u8,

    /// Number of approvals received so far
    pub approval_count: u8,

    /// Required approvals threshold (default: 2)
    pub threshold: u8,

    /// SHA-256 hash of the legal document package uploaded to IPFS
    pub legal_doc_hash: [u8; 32],

    /// SHA-256 hash of the signed legal attestation (notarized off-chain)
    pub attestation_hash: [u8; 32],

    /// IPFS CID where the legal package is pinned (encoded as bytes)
    #[max_len(59)]
    pub ipfs_cid: String,

    /// Unix timestamp when the multi-verification was initiated
    pub initiated_at: i64,

    /// Unix timestamp when threshold was met (0 = not yet met)
    pub completed_at: i64,

    /// Whether this verification has been superseded (e.g., re-verification after update)
    pub is_superseded: bool,

    /// PDA bump seed
    pub bump: u8,
}

impl MultiVerification {
    pub const SEED_PREFIX: &'static [u8] = b"multi_verify";

    /// Default threshold: 2-of-3 verifiers must approve
    pub const DEFAULT_THRESHOLD: u8 = 2;

    /// Maximum verification window: 30 days
    pub const MAX_VERIFICATION_WINDOW: i64 = 30 * 24 * 60 * 60;

    pub fn is_approved(&self) -> bool {
        self.approval_count >= self.threshold
    }

    pub fn has_verifier_signed(&self, slot: u8) -> bool {
        (self.approval_bitmask >> slot) & 1 == 1
    }

    pub fn add_approval(&mut self, slot: u8) {
        self.approval_bitmask |= 1 << slot;
        self.approval_count = self.approval_count.saturating_add(1);
    }
}
