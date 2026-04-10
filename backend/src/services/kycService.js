const User = require("../models/User");

/**
 * Mock KYC verification service
 * In production, integrate with a real KYC provider (Jumio, Onfido, etc.)
 */
class KycService {
  /**
   * Submit KYC documents for verification
   * Simulates async verification process
   */
  async submitVerification(walletAddress, documentType, documentId, name, email) {
    // Find or create user
    let user = await User.findOne({ walletAddress });

    if (!user) {
      user = new User({
        walletAddress,
        name: name || "",
        email: email || "",
        kycStatus: "pending",
      });
    }

    // Add document
    user.kycDocuments.push({
      type: documentType,
      documentId,
      status: "pending",
      submittedAt: new Date(),
    });

    user.kycStatus = "pending";
    user.kycSubmittedAt = new Date();

    await user.save();

    // Simulate async verification (auto-approve after delay in dev)
    if (process.env.NODE_ENV === "development") {
      setTimeout(async () => {
        await this.approveVerification(walletAddress);
      }, 3000); // Auto-approve after 3 seconds in dev
    }

    return {
      status: "pending",
      message: "KYC documents submitted for verification",
      estimatedTime: "24-48 hours",
    };
  }

  /**
   * Approve KYC verification (admin action)
   */
  async approveVerification(walletAddress) {
    const user = await User.findOne({ walletAddress });

    if (!user) {
      throw new Error("User not found");
    }

    user.kycStatus = "approved";
    user.kycApprovedAt = new Date();
    user.isWhitelisted = true;

    // Mark all pending documents as verified
    user.kycDocuments.forEach((doc) => {
      if (doc.status === "pending") {
        doc.status = "verified";
      }
    });

    await user.save();

    return {
      status: "approved",
      walletAddress,
      approvedAt: user.kycApprovedAt,
    };
  }

  /**
   * Reject KYC verification (admin action)
   */
  async rejectVerification(walletAddress, reason) {
    const user = await User.findOne({ walletAddress });

    if (!user) {
      throw new Error("User not found");
    }

    user.kycStatus = "rejected";

    // Mark all pending documents as rejected
    user.kycDocuments.forEach((doc) => {
      if (doc.status === "pending") {
        doc.status = "rejected";
      }
    });

    await user.save();

    return {
      status: "rejected",
      walletAddress,
      reason: reason || "Documents could not be verified",
    };
  }

  /**
   * Check KYC status for a wallet
   */
  async getStatus(walletAddress) {
    const user = await User.findOne({ walletAddress });

    if (!user) {
      return {
        status: "none",
        isWhitelisted: false,
        message: "No KYC records found. Please submit verification.",
      };
    }

    return {
      status: user.kycStatus,
      isWhitelisted: user.isWhitelisted,
      submittedAt: user.kycSubmittedAt,
      approvedAt: user.kycApprovedAt,
      documentsCount: user.kycDocuments.length,
      documents: user.kycDocuments.map((d) => ({
        type: d.type,
        status: d.status,
        submittedAt: d.submittedAt,
      })),
    };
  }

  /**
   * Get all pending KYC applications (admin)
   */
  async getPendingApplications() {
    const users = await User.find({ kycStatus: "pending" })
      .select("walletAddress name email kycStatus kycSubmittedAt kycDocuments")
      .sort({ kycSubmittedAt: -1 });

    return users;
  }
}

module.exports = new KycService();
