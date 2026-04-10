/**
 * Institutional Mock Asset Data
 * Used as a fallback when MongoDB is disconnected to ensure the Marketplace is never empty.
 */

const mockAssets = [
  {
    _id: "mock_asset_001",
    name: "432 Park Avenue, Apt 82A",
    symbol: "432PARK",
    description: "Ultra-luxury half-floor penthouse in one of the tallest residential towers in the Western Hemisphere. Features 10-foot by 10-foot windows offering breathtaking panoramic views of Central Park.",
    location: { address: "432 Park Ave", city: "New York", state: "NY", country: "USA", coordinates: { lat: 40.7616, lng: -73.9719 } },
    assetType: "residential",
    images: ["https://images.unsplash.com/photo-1541194577687-8c63bf9e7ee3?w=800"],
    propertyValue: 18500000,
    totalSupply: 100000,
    availableSupply: 62000,
    pricePerToken: 1850000000, // in lamports (simulated)
    annualYieldBps: 210,
    status: "active",
    isActive: true,
    totalInvestors: 142,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: "mock_asset_002",
    name: "Prologis Logistics Center",
    symbol: "PLGDST",
    description: "Class-A, 500,000 sq ft industrial fulfillment center. Fully leased to a Fortune 100 e-commerce tenant with a 15-year triple net lease.",
    location: { address: "100 Prologis Way", city: "Tracy", state: "CA", country: "USA", coordinates: { lat: 37.7397, lng: -121.4252 } },
    assetType: "industrial",
    images: ["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800"],
    propertyValue: 45000000,
    totalSupply: 500000,
    availableSupply: 120000,
    pricePerToken: 900000000,
    annualYieldBps: 640,
    status: "active",
    isActive: true,
    totalInvestors: 840,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: "mock_asset_006",
    name: "The Shard — Level 42",
    symbol: "SHARD42",
    description: "Premium fractionalized office space within London's iconic architectural landmark. Fully tenanted by a multinational law firm.",
    location: { address: "32 London Bridge St", city: "London", state: "London", country: "UK", coordinates: { lat: 51.5045, lng: -0.0865 } },
    assetType: "commercial",
    images: ["https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800"],
    propertyValue: 32000000,
    totalSupply: 200000,
    availableSupply: 50000,
    pricePerToken: 1600000000,
    annualYieldBps: 520,
    status: "active",
    isActive: true,
    totalInvestors: 650,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: "mock_asset_009",
    name: "Burj Khalifa Armani Suite",
    symbol: "ARMBRJ",
    description: "An exclusive hospitality asset residing within the world's tallest building. Part of a rental pool for high-net-worth guests.",
    location: { address: "1 Sheikh Mohammed bin Rashid Blvd", city: "Dubai", state: "Dubai", country: "UAE", coordinates: { lat: 25.1972, lng: 55.2744 } },
    assetType: "hospitality",
    images: ["https://images.unsplash.com/photo-1597659800260-8488e05c879d?w=800"],
    propertyValue: 8500000,
    totalSupply: 50000,
    availableSupply: 15000,
    pricePerToken: 1700000000,
    annualYieldBps: 850,
    status: "active",
    isActive: true,
    totalInvestors: 312,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: "mock_asset_014",
    name: "One Vanderbilt, BKC Mumbai",
    symbol: "BKCMUM",
    description: "Premium Grade-A commercial office space in Mumbai's Bandra Kurla Complex. Leased to a Big 4 consulting firm.",
    location: { address: "G Block, BKC", city: "Mumbai", state: "Maharashtra", country: "India", coordinates: { lat: 19.0596, lng: 72.8656 } },
    assetType: "commercial",
    images: ["https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800"],
    propertyValue: 35000000,
    totalSupply: 350000,
    availableSupply: 140000,
    pricePerToken: 1000000000,
    annualYieldBps: 720,
    status: "active",
    isActive: true,
    totalInvestors: 580,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: "mock_asset_020",
    name: "Rajasthan Solar Farm",
    symbol: "RJSOLAR",
    description: "500-acre operational solar farm in Jaisalmer. 200 MW capacity with a 25-year government-backed power purchase agreement.",
    location: { address: "Bada Bagh Road", city: "Jaisalmer", state: "Rajasthan", country: "India", coordinates: { lat: 26.9124, lng: 70.9160 } },
    assetType: "industrial",
    images: ["https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800"],
    propertyValue: 42000000,
    totalSupply: 420000,
    availableSupply: 168000,
    pricePerToken: 1000000000,
    annualYieldBps: 950,
    status: "active",
    isActive: true,
    totalInvestors: 720,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Helper to generate a consistent price history for mocks
function generateMockHistory(basePriceUsd) {
  const history = [];
  for (let i = 30; i >= 0; i--) {
    const change = (Math.random() - 0.48) * 0.01;
    history.push({
      price: basePriceUsd * (1 + change),
      timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  return history;
}

module.exports = {
  getMockAssets: () => mockAssets.map(a => ({
    ...a,
    priceHistory: generateMockHistory(a.propertyValue / a.totalSupply)
  })),
  getMockAsset: (id) => {
    const asset = mockAssets.find(a => a._id === id);
    if (!asset) return null;
    return {
      ...asset,
      priceHistory: generateMockHistory(asset.propertyValue / asset.totalSupply)
    };
  }
};
