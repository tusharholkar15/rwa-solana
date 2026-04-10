const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");
const priceService = require("../services/priceService");
const { validateAssetCreation } = require("../middleware/validation");
const { requireAdmin } = require("../middleware/auth");
const { paginationMeta } = require("../utils/helpers");
const { isDatabaseConnected } = require("../config/database");
const { getMockAssets, getMockAsset } = require("../utils/mockAssets");

/**
 * GET /api/assets
 * List all active tokenized properties with filtering & pagination
 */
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      type,
      status,
      sortBy = "createdAt",
      order = "desc",
      search,
      minPrice,
      maxPrice,
    } = req.query;

    const filter = { isActive: true };

    if (type) filter.assetType = type;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "location.city": { $regex: search, $options: "i" } },
      ];
    }
    if (minPrice) filter.pricePerToken = { ...filter.pricePerToken, $gte: Number(minPrice) };
    if (maxPrice) filter.pricePerToken = { ...filter.pricePerToken, $lte: Number(maxPrice) };

    // Check for database connection
    if (!isDatabaseConnected()) {
      const mockData = getMockAssets();
      const solPrice = await priceService.getSolPrice();
      return res.json({
        assets: mockData.map(a => ({
          ...a,
          pricePerTokenUsd: (a.pricePerToken / 1e9) * solPrice.price,
          propertyValueUsd: a.propertyValue,
          soldPercentage: ((a.totalSupply - a.availableSupply) / a.totalSupply) * 100
        })),
        pagination: paginationMeta(mockData.length, 1, mockData.length),
        solPrice: solPrice.price,
        isMock: true
      });
    }

    const total = await Asset.countDocuments(filter);
    const assets = await Asset.find(filter)
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select("-priceHistory -documents");

    // Enrich with USD prices
    const solPrice = await priceService.getSolPrice();
    const enrichedAssets = assets.map((asset) => {
      const a = asset.toObject();
      a.pricePerTokenUsd = (a.pricePerToken / 1e9) * solPrice.price;
      a.propertyValueUsd = a.propertyValue;
      a.soldPercentage =
        ((a.totalSupply - a.availableSupply) / a.totalSupply) * 100;
      return a;
    });

    res.json({
      assets: enrichedAssets,
      pagination: paginationMeta(total, Number(page), Number(limit)),
      solPrice: solPrice.price,
    });
  } catch (error) {
    console.error("Error fetching assets:", error);
    res.status(500).json({ error: "Failed to fetch assets" });
  }
});

/**
 * GET /api/assets/:id
 * Get detailed asset information including price history
 */
router.get("/:id", async (req, res) => {
  try {
    // Check for database connection
    if (!isDatabaseConnected()) {
      const mockAsset = getMockAsset(req.params.id);
      if (!mockAsset) return res.status(404).json({ error: "Asset not found" });
      
      const solPrice = await priceService.getSolPrice();
      mockAsset.pricePerTokenUsd = (mockAsset.pricePerToken / 1e9) * solPrice.price;
      mockAsset.soldPercentage = ((mockAsset.totalSupply - mockAsset.availableSupply) / mockAsset.totalSupply) * 100;
      mockAsset.marketCap = mockAsset.pricePerToken * mockAsset.totalSupply;
      mockAsset.marketCapUsd = (mockAsset.marketCap / 1e9) * solPrice.price;

      return res.json({ asset: mockAsset, solPrice: solPrice.price, isMock: true });
    }

    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const solPrice = await priceService.getSolPrice();
    const assetObj = asset.toObject();

    // Enrich with computed fields
    assetObj.pricePerTokenUsd = (assetObj.pricePerToken / 1e9) * solPrice.price;
    assetObj.soldPercentage =
      ((assetObj.totalSupply - assetObj.availableSupply) / assetObj.totalSupply) * 100;
    assetObj.marketCap = assetObj.pricePerToken * assetObj.totalSupply;
    assetObj.marketCapUsd = (assetObj.marketCap / 1e9) * solPrice.price;

    // Generate price history if empty
    if (!assetObj.priceHistory || assetObj.priceHistory.length === 0) {
      assetObj.priceHistory = priceService.generatePriceHistory(
        assetObj.pricePerTokenUsd,
        30
      );
    }

    res.json({ asset: assetObj, solPrice: solPrice.price });
  } catch (error) {
    console.error("Error fetching asset:", error);
    res.status(500).json({ error: "Failed to fetch asset details" });
  }
});

/**
 * POST /api/assets
 * Admin: Create a new tokenized asset
 */
router.post("/", requireAdmin, validateAssetCreation, async (req, res) => {
  try {
    const {
      name,
      symbol,
      description,
      location,
      assetType,
      images,
      documents,
      propertyValue,
      totalSupply,
      pricePerToken,
      annualYieldBps,
      authority,
    } = req.body;

    const asset = new Asset({
      name,
      symbol,
      description,
      location: location || {},
      assetType: assetType || "residential",
      images: images || [],
      documents: documents || [],
      propertyValue,
      totalSupply,
      availableSupply: totalSupply,
      pricePerToken,
      annualYieldBps: annualYieldBps || 0,
      authority: authority || "admin",
      status: "active",
      isActive: true,
      priceHistory: priceService.generatePriceHistory(
        propertyValue / totalSupply,
        30
      ),
    });

    await asset.save();

    res.status(201).json({
      message: "Asset created successfully",
      asset,
    });
  } catch (error) {
    console.error("Error creating asset:", error);
    if (error.code === 11000) {
      return res.status(409).json({ error: "Asset with this name already exists" });
    }
    res.status(500).json({ error: "Failed to create asset" });
  }
});

/**
 * POST /api/assets/:id/legal-opinion
 * Admin: Attach a legal opinion to an asset
 */
router.post("/:id/legal-opinion", requireAdmin, async (req, res) => {
  try {
    const { firm, documentHash, status } = req.body;
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    asset.legalOpinion = {
      firm,
      documentHash,
      status: status || "verified",
      lastValidated: new Date()
    };
    
    await asset.save();
    
    res.json({ message: "Legal opinion attached successfully", asset });
  } catch (error) {
    console.error("Error attaching legal opinion:", error);
    res.status(500).json({ error: "Failed to attach legal opinion" });
  }
});

/**
 * DELETE /api/assets/:id
 * Admin: Delist an asset
 */
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    asset.isActive = false;
    asset.status = "delisted";
    await asset.save();

    res.json({ message: "Asset delisted successfully" });
  } catch (error) {
    console.error("Error delisting asset:", error);
    res.status(500).json({ error: "Failed to delist asset" });
  }
});

module.exports = router;
