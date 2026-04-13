/**
 * Compliance & Legal Service
 * Handles document verification, digital agreement signing, and AML screening
 */

const { v4: uuidv4 } = require("uuid");
const ComplianceIdentity = require("../models/ComplianceIdentity");
const Agreement = require("../models/Agreement");
const auditService = require("./auditService");

// Simulated watchlist for AML screening
const AML_WATCHLIST = [
  "BLOCKED_WALLET_TEST_1",
  "BLOCKED_WALLET_TEST_2",
];

// Document verification templates
const DOCUMENT_TYPES = {
  passport: { name: "Passport", verificationTime: "2-4 hours", requiredFields: ["fullName", "number", "expiry"] },
  drivers_license: { name: "Driver's License", verificationTime: "1-2 hours", requiredFields: ["fullName", "number", "state"] },
  national_id: { name: "National ID", verificationTime: "1-3 hours", requiredFields: ["fullName", "number"] },
  utility_bill: { name: "Utility Bill", verificationTime: "4-8 hours", requiredFields: ["fullName", "address"] },
  property_deed: { name: "Property Deed", verificationTime: "24-48 hours", requiredFields: ["propertyAddress", "registrationNumber"] },
  appraisal_report: { name: "Appraisal Report", verificationTime: "12-24 hours", requiredFields: ["appraiser", "valuationDate", "value"] },
  insurance_certificate: { name: "Insurance Certificate", verificationTime: "4-8 hours", requiredFields: ["provider", "policyNumber", "coverage"] },
};

class ComplianceService {
  /**
   * Verify a submitted document
   */
  async verifyDocument({ documentType, documentData, walletAddress }) {
    const docConfig = DOCUMENT_TYPES[documentType];
    if (!docConfig) {
      throw new Error(`Unsupported document type: ${documentType}`);
    }

    // Validate required fields
    const missingFields = docConfig.requiredFields.filter(
      (field) => !documentData[field]
    );
    if (missingFields.length > 0) {
      return {
        status: "rejected",
        reason: `Missing required fields: ${missingFields.join(", ")}`,
        documentType,
      };
    }

    // Simulate verification (in production: call a KYC provider like Jumio, Onfido)
    const verificationId = `ver_${uuidv4().slice(0, 12)}`;
    const isAutoApproved = process.env.NODE_ENV === "development";

    return {
      verificationId,
      documentType,
      documentName: docConfig.name,
      status: isAutoApproved ? "verified" : "pending",
      estimatedTime: docConfig.verificationTime,
      walletAddress,
      submittedAt: new Date().toISOString(),
      verifiedAt: isAutoApproved ? new Date().toISOString() : null,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    };
  }

  /**
   * Generate a digital investment agreement
   */
  async generateAgreement({ walletAddress, assetId, assetName, shares, pricePerToken, totalAmount }) {
    const agreementId = `agr_${uuidv4().slice(0, 12)}`;

    const agreement = new Agreement({
      agreementId,
      type: "investment_subscription",
      version: "2.0",
      walletAddress,
      assetId,
      assetName,
      terms: {
        shares,
        pricePerToken,
        totalAmount,
        platformFee: "0.1%",
        lockupPeriod: "None — secondary market trading available",
        yieldDistribution: "Quarterly, direct to wallet",
        governingLaw: "Republic of Singapore — Digital Securities Act",
        arbitration: "Singapore International Arbitration Centre (SIAC)",
      },
      riskDisclosures: [
        "Real estate values may fluctuate based on market conditions",
        "Tokenized assets are subject to blockchain network risks",
        "Past performance does not guarantee future results",
        "Regulatory changes may affect asset liquidity or valuation",
        "Insurance coverage may not protect against all loss scenarios",
      ],
      status: "pending_signature",
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days to sign
    });

    await agreement.save();
    return agreement;
  }

  /**
   * Sign a digital agreement
   */
  async signAgreement({ agreementId, walletAddress, signatureHash }) {
    const agreement = await Agreement.findOne({ agreementId });
    
    if (!agreement) {
      throw new Error("Agreement not found");
    }
    if (new Date() > agreement.expiresAt) {
      throw new Error("Agreement expired");
    }
    if (agreement.walletAddress !== walletAddress) {
      throw new Error("Wallet address mismatch");
    }
    if (agreement.status === "signed") {
      throw new Error("Agreement already signed");
    }

    agreement.status = "signed";
    agreement.signedAt = new Date();
    agreement.signatureHash = signatureHash || `sig_${uuidv4()}`;
    agreement.signatureMethod = signatureHash ? "wallet_signature" : "platform_signature";

    await agreement.save();

    await auditService.logEvent({
      eventType: "agreement_signed",
      walletAddress,
      details: { agreementId, assetId: agreement.assetId },
    });

    return agreement;
  }

  /**
   * AML screening
   */
  async screenWallet(walletAddress) {
    const isBlocked = AML_WATCHLIST.includes(walletAddress);

    return {
      walletAddress,
      screeningId: `aml_${uuidv4().slice(0, 8)}`,
      status: isBlocked ? "flagged" : "clear",
      riskLevel: isBlocked ? "high" : "low",
      checks: [
        { name: "OFAC SDN List", passed: !isBlocked },
        { name: "EU Sanctions List", passed: true },
        { name: "PEP Database", passed: true },
        { name: "Adverse Media", passed: true },
      ],
      screenedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    };
  }

  /**
   * Get user's agreements
   */
  async getAgreementsByWallet(walletAddress) {
    return await Agreement.find({ walletAddress }).sort({ generatedAt: -1 });
  }

  /**
   * Get asset legal document templates
   */
  getAssetDocuments(assetId) {
    // In production, these would be stored in IPFS or S3
    return [
      {
        name: "Property Title Deed",
        type: "deed",
        status: "verified",
        verifiedAt: "2025-11-15T10:00:00Z",
        hash: `ipfs_${assetId}_deed_${uuidv4().slice(0, 8)}`,
        size: "2.4 MB",
      },
      {
        name: "Independent Appraisal Report",
        type: "appraisal",
        status: "verified",
        verifiedAt: "2025-12-01T14:30:00Z",
        hash: `ipfs_${assetId}_appraisal_${uuidv4().slice(0, 8)}`,
        size: "5.1 MB",
      },
      {
        name: "Building Inspection Report",
        type: "inspection",
        status: "verified",
        verifiedAt: "2025-12-10T09:00:00Z",
        hash: `ipfs_${assetId}_inspection_${uuidv4().slice(0, 8)}`,
        size: "3.8 MB",
      },
      {
        name: "Insurance Policy Certificate",
        type: "insurance",
        status: "verified",
        verifiedAt: "2026-01-05T11:00:00Z",
        hash: `ipfs_${assetId}_insurance_${uuidv4().slice(0, 8)}`,
        size: "1.2 MB",
      },
      {
        name: "Token Offering Memorandum",
        type: "other",
        status: "verified",
        verifiedAt: "2026-01-20T16:00:00Z",
        hash: `ipfs_${assetId}_offering_${uuidv4().slice(0, 8)}`,
        size: "8.7 MB",
      },
    ];
  }

  // --- Institutional Compliance Identity ---

  /**
   * Create a new compliance identity
   */
  async createIdentity({ walletAddress, tier = 0, jurisdiction = "GLOBAL", accreditationType = "none", adminWallet = "system" }) {
    let identity = await ComplianceIdentity.findOne({ walletAddress });
    if (identity) {
      throw new Error("Identity already exists for this wallet");
    }

    identity = new ComplianceIdentity({
      walletAddress,
      complianceTier: tier,
      jurisdiction,
      accreditationType,
      expiryTimestamp: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    });

    await identity.save();

    await auditService.logEvent({
      eventType: "identity_created",
      walletAddress,
      details: { tier, jurisdiction, accreditationType },
      performedBy: adminWallet,
    });

    return identity;
  }

  /**
   * Update compliance tier
   */
  async updateTier({ walletAddress, newTier, adminWallet }) {
    const identity = await ComplianceIdentity.findOne({ walletAddress });
    if (!identity) {
      throw new Error("Identity not found");
    }

    const oldTier = identity.complianceTier;
    identity.complianceTier = newTier;
    await identity.save();

    await auditService.logEvent({
      eventType: "tier_upgraded",
      walletAddress,
      details: { oldTier, newTier },
      performedBy: adminWallet,
    });

    return identity;
  }

  /**
   * Freeze wallet
   */
  async freezeWallet({ walletAddress, reason, adminWallet }) {
    const identity = await ComplianceIdentity.findOne({ walletAddress });
    if (!identity) throw new Error("Identity not found");

    identity.isFrozen = true;
    identity.frozenReason = reason;
    identity.frozenAt = new Date();
    identity.frozenBy = adminWallet;
    await identity.save();

    await auditService.logEvent({
      eventType: "wallet_frozen",
      walletAddress,
      details: { reason },
      performedBy: adminWallet,
    });

    return identity;
  }

  /**
   * Unfreeze wallet
   */
  async unfreezeWallet({ walletAddress, adminWallet }) {
    const identity = await ComplianceIdentity.findOne({ walletAddress });
    if (!identity) throw new Error("Identity not found");

    identity.isFrozen = false;
    identity.frozenReason = undefined;
    identity.frozenAt = undefined;
    identity.frozenBy = undefined;
    await identity.save();

    await auditService.logEvent({
      eventType: "wallet_unfrozen",
      walletAddress,
      details: {},
      performedBy: adminWallet,
    });

    return identity;
  }

  /**
   * Get single identity (resolves Master Wallet inheritance)
   */
  async getIdentity(walletAddress) {
    let identity = await ComplianceIdentity.findOne({ walletAddress });
    
    // In dev mode, loosely create one if none exists so frontend works
    if (!identity && process.env.NODE_ENV === "development") {
      identity = await this.createIdentity({ walletAddress, tier: 1 });
    }

    if (!identity) return null;

    // Inherit from Master Wallet if linked
    if (identity.masterWallet) {
      const masterIdentity = await ComplianceIdentity.findOne({ walletAddress: identity.masterWallet });
      if (masterIdentity && !masterIdentity.isFrozen) {
        // Return a composite identity for validation purposes
        const composite = identity.toObject ? identity.toObject() : { ...identity };
        composite.complianceTier = Math.max(identity.complianceTier, masterIdentity.complianceTier);
        composite.jurisdiction = identity.jurisdiction !== "GLOBAL" && identity.jurisdiction ? identity.jurisdiction : masterIdentity.jurisdiction;
        composite.accreditationType = masterIdentity.accreditationType !== "none" ? masterIdentity.accreditationType : identity.accreditationType;
        composite.expiryTimestamp = masterIdentity.expiryTimestamp;
        return composite;
      }
    }

    return identity;
  }

  /**
   * List identities with filters
   */
  async listIdentities(filters = {}, options = { limit: 50, skip: 0 }) {
    const query = {};
    if (filters.isFrozen !== undefined) query.isFrozen = filters.isFrozen;
    if (filters.complianceTier !== undefined) query.complianceTier = filters.complianceTier;
    if (filters.jurisdiction) query.jurisdiction = filters.jurisdiction;

    const total = await ComplianceIdentity.countDocuments(query);
    const identities = await ComplianceIdentity.find(query)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit);

    return { total, identities };
  }

  /**
   * Validate a transfer between two wallets
   */
  async validateTransfer({ fromWallet, toWallet, assetId, amount }) {
    // 1. Get both identities (resolves Master inheritance seamlessly)
    let fromIdentity = await this.getIdentity(fromWallet);
    let toIdentity = await this.getIdentity(toWallet);

    if (!fromIdentity || !toIdentity) {
      await auditService.logEvent({
        eventType: "transfer_blocked",
        walletAddress: fromWallet,
        targetWallet: toWallet,
        details: { reason: "Missing compliance identity for one or both wallets" },
      });
      return { valid: false, reason: "Missing compliance identity for one or both wallets" };
    }

    // 2. Check freeze status
    if (fromIdentity.isFrozen || toIdentity.isFrozen) {
      await auditService.logEvent({
        eventType: "transfer_blocked",
        walletAddress: fromWallet,
        targetWallet: toWallet,
        details: { reason: "Wallet frozen" },
      });
      return { valid: false, reason: "One or both wallets are frozen" };
    }

    // 3. Asset requirements (simulated)
    // In production, fetch specific asset rules from Registry
    const assetTierRequired = 2; // e.g., Requires Accredited
    const assetAllowedJurisdictions = ["US", "GLOBAL", "SG", "EU"]; 
    
    if (fromIdentity.complianceTier < assetTierRequired || toIdentity.complianceTier < assetTierRequired) {
      await auditService.logEvent({
        eventType: "transfer_blocked",
        walletAddress: fromWallet,
        targetWallet: toWallet,
        details: { reason: `Asset requires tier ${assetTierRequired}` },
      });
      return { valid: false, reason: `Transfer blocked: Minimum tier ${assetTierRequired} required.` };
    }

    if (!assetAllowedJurisdictions.includes(toIdentity.jurisdiction)) {
      await auditService.logEvent({
        eventType: "transfer_blocked",
        walletAddress: fromWallet,
        targetWallet: toWallet,
        details: { reason: "Jurisdiction restriction" },
      });
      return { valid: false, reason: "Transfer blocked: Asset not allowed in receiver's jurisdiction." };
    }

    // 4. Expiry checks
    if (new Date() > fromIdentity.expiryTimestamp || new Date() > toIdentity.expiryTimestamp) {
        return { valid: false, reason: "Compliance identity expired. Re-verification required." };
    }

    // Pass
    await auditService.logEvent({
      eventType: "transfer_validated",
      walletAddress: fromWallet,
      targetWallet: toWallet,
      details: { assetId, amount },
    });

    return { valid: true };
  }

  /**
   * Validate an AMM swap against institutional rules
   */
  async validateSwap({ userWallet, assetId, amount, isBuying }) {
    const identity = await this.getIdentity(userWallet);
    if (!identity) {
      return { valid: false, reason: "Compliance identity not found. Please complete KYC." };
    }

    if (identity.isFrozen) {
      return { valid: false, reason: "Your wallet is currently frozen by compliance." };
    }

    // Check AML Flags (Instant Block)
    if (identity.amlFlags > 0) {
      return { valid: false, reason: "Regulatory block: AML screening required." };
    }

    // In a production environment, we would fetch the Asset's on-chain min_compliance_tier here.
    // Simulating with common rules:
    const assetTierRequired = 2; // Default for institutional assets
    
    if (identity.complianceTier < assetTierRequired) {
      return { 
        valid: false, 
        reason: `Institutional Asset: Minimum tier ${assetTierRequired} required. Your tier: ${identity.complianceTier}` 
      };
    }

    // Check Investment Limits (only on buying)
    if (isBuying && identity.investmentLimit > 0) {
      if (amount > identity.investmentLimit) {
        return { 
          valid: false, 
          reason: `Transaction exceeds your single-investment limit of ${identity.investmentLimit} lamports.` 
        };
      }

      if (identity.totalInvested + amount > identity.aggregateLimit) {
         return {
           valid: false,
           reason: "Transaction exceeds your aggregate investment limit. Portfolio rebalancing required."
         };
      }
    }

    return { valid: true };
  }

  /**
   * Link a child wallet to a master wallet
   */
  async linkSubAccount({ masterWallet, childWallet }) {
    if (masterWallet === childWallet) throw new Error("Cannot link wallet to itself");

    let master = await ComplianceIdentity.findOne({ walletAddress: masterWallet });
    if (!master) throw new Error("Master identity not found. Verify master wallet first.");
    if (master.masterWallet) throw new Error("Master wallet cannot be a child itself (nested sub-accounts not supported)");

    let child = await ComplianceIdentity.findOne({ walletAddress: childWallet });
    if (!child) {
      child = new ComplianceIdentity({ walletAddress: childWallet });
    }

    if (child.masterWallet && child.masterWallet !== masterWallet) {
      // Clean up previous master references
      let prevMaster = await ComplianceIdentity.findOne({ walletAddress: child.masterWallet });
      if (prevMaster) {
        prevMaster.subAccounts = prevMaster.subAccounts.filter(w => w !== childWallet);
        await prevMaster.save();
      }
    }

    child.masterWallet = masterWallet;
    await child.save();

    if (!master.subAccounts.includes(childWallet)) {
      master.subAccounts.push(childWallet);
      await master.save();
    }

    await auditService.logEvent({
      eventType: "subaccount_linked",
      walletAddress: masterWallet,
      details: { childWallet },
      performedBy: masterWallet,
    });

    return { master, child };
  }

  /**
   * Unlink a child wallet
   */
  async unlinkSubAccount({ masterWallet, childWallet }) {
    let master = await ComplianceIdentity.findOne({ walletAddress: masterWallet });
    if (!master) throw new Error("Master identity not found");

    let child = await ComplianceIdentity.findOne({ walletAddress: childWallet });
    if (!child) throw new Error("Child identity not found");
    if (child.masterWallet !== masterWallet) throw new Error("Child is not linked to this master");

    child.masterWallet = null;
    await child.save();

    master.subAccounts = master.subAccounts.filter(w => w !== childWallet);
    await master.save();

    await auditService.logEvent({
      eventType: "subaccount_unlinked",
      walletAddress: masterWallet,
      details: { childWallet },
      performedBy: masterWallet,
    });

    return { master, child };
  }
}

module.exports = new ComplianceService();
