/**
 * Enhanced Database Seed Script — Phase 2
 * Seeds 20 global real-world assets, demo users, community posts, and reviews
 * Run with: node scripts/seed.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Asset = require("../src/models/Asset");
const User = require("../src/models/User");
const Portfolio = require("../src/models/Portfolio");
const Transaction = require("../src/models/Transaction");
const LiquidityPool = require("../src/models/LiquidityPool");
const OTCOrder = require("../src/models/OTCOrder");
const liquidityService = require("../src/services/liquidityService");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/rwa-solana";

// ─── 20 Global Real-World Assets ─────────────────────────────────

const sampleAssets = [
  // ─── USA ───────────────────────────────────────────────────────
  {
    name: "432 Park Avenue, Apt 82A",
    symbol: "432PARK",
    description: "Ultra-luxury half-floor penthouse in one of the tallest residential towers in the Western Hemisphere. Features 10-foot by 10-foot windows offering breathtaking panoramic views of Central Park, the Hudson and East Rivers, and the Manhattan skyline.",
    location: { address: "432 Park Ave", city: "New York", state: "New York", country: "USA", coordinates: { lat: 40.7616, lng: -73.9719 } },
    assetType: "residential",
    images: [
      "https://images.unsplash.com/photo-1541194577687-8c63bf9e7ee3?w=800",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
    ],
    propertyValue: 18500000,
    totalSupply: 100000,
    availableSupply: 62000,
    pricePerToken: 1850000000,
    annualYieldBps: 210,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 142,
  },
  {
    name: "Prologis Logistics Center — Tracy",
    symbol: "PLGDST",
    description: "A Class-A, 500,000 sq ft industrial fulfillment center located in California's Central Valley. Fully leased to a Fortune 100 e-commerce tenant with a 15-year triple net (NNN) lease agreement, offering stable and predictable dividend yields.",
    location: { address: "100 Prologis Way", city: "Tracy", state: "California", country: "USA", coordinates: { lat: 37.7397, lng: -121.4252 } },
    assetType: "industrial",
    images: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800",
      "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800",
    ],
    propertyValue: 45000000,
    totalSupply: 500000,
    availableSupply: 120000,
    pricePerToken: 900000000,
    annualYieldBps: 640,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 840,
  },
  {
    name: "Austin Tech Hub Campus",
    symbol: "ATXTEC",
    description: "A newly developed mixed-use campus in Downtown Austin, catering exclusively to tech startups and incubators. Combines collaborative workspaces with ground-floor organic cafes and wellness centers.",
    location: { address: "Silicon Hills Blvd", city: "Austin", state: "Texas", country: "USA", coordinates: { lat: 30.2672, lng: -97.7431 } },
    assetType: "mixed-use",
    images: [
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800",
      "https://images.unsplash.com/photo-1556888286-9a2c1f4e0c8b?w=800",
    ],
    propertyValue: 15000000,
    totalSupply: 150000,
    availableSupply: 45000,
    pricePerToken: 1000000000,
    annualYieldBps: 710,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 330,
  },
  {
    name: "Heartland Prime Farmland 250A",
    symbol: "IOWAFRM",
    description: "250 acres of prime, fertile agricultural land in the American Midwest. The land is leased to commercial farming operations producing corn and soybeans, offering a stable hedge against inflation and uncorrelated returns to traditional markets.",
    location: { address: "CR-400 Agricultural Corridor", city: "Des Moines", state: "Iowa", country: "USA", coordinates: { lat: 41.6005, lng: -93.6091 } },
    assetType: "land",
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
      "https://images.unsplash.com/photo-1586771107445-d3af9e173e04?w=800",
    ],
    propertyValue: 2800000,
    totalSupply: 28000,
    availableSupply: 5000,
    pricePerToken: 1000000000,
    annualYieldBps: 410,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 260,
  },
  {
    name: "Miami Wynwood Arts District Lofts",
    symbol: "WYNLFT",
    description: "A boutique residential complex of 24 luxury artist lofts in the heart of Miami's Wynwood district. Features curated gallery spaces, rooftop pool with Biscayne Bay views, and proximity to Art Basel venues. High rental demand from creative professionals.",
    location: { address: "2750 NW 3rd Ave", city: "Miami", state: "Florida", country: "USA", coordinates: { lat: 25.8049, lng: -80.1990 } },
    assetType: "residential",
    images: [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    ],
    propertyValue: 9200000,
    totalSupply: 92000,
    availableSupply: 34000,
    pricePerToken: 1000000000,
    annualYieldBps: 580,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 195,
  },

  // ─── UK & Europe ───────────────────────────────────────────────
  {
    name: "The Shard — Office Level 42",
    symbol: "SHARD42",
    description: "Premium fractionalized office space within London's iconic architectural landmark. BREEAM Excellent sustainability ratings and panoramic views of the River Thames. Fully tenanted by a multinational law firm.",
    location: { address: "32 London Bridge St", city: "London", state: "England", country: "UK", coordinates: { lat: 51.5045, lng: -0.0865 } },
    assetType: "commercial",
    images: [
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
    ],
    propertyValue: 32000000,
    totalSupply: 200000,
    availableSupply: 50000,
    pricePerToken: 1600000000,
    annualYieldBps: 520,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 650,
  },
  {
    name: "Zurich Bahnhofstrasse Retail Suite",
    symbol: "ZRHRET",
    description: "Prime street-level retail on the world's most exclusive shopping avenue. Leased to a Swiss luxury watchmaker on a 12-year term. Switzerland's stable economy and AAA sovereign rating make this an ultra-safe store of value.",
    location: { address: "Bahnhofstrasse 45", city: "Zurich", state: "Zurich", country: "Switzerland", coordinates: { lat: 47.3769, lng: 8.5417 } },
    assetType: "commercial",
    images: [
      "https://images.unsplash.com/photo-1611095567365-38b3281a26a3?w=800",
      "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800",
    ],
    propertyValue: 28000000,
    totalSupply: 140000,
    availableSupply: 28000,
    pricePerToken: 2000000000,
    annualYieldBps: 340,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 420,
  },
  {
    name: "Berlin Mitte Co-Living Complex",
    symbol: "BRLNLV",
    description: "A 150-unit modern co-living complex in Berlin's central Mitte district. Designed for digital nomads and young professionals. Features communal workspaces, gym, and rooftop terrace. 98% average occupancy with flexible lease terms.",
    location: { address: "Friedrichstraße 120", city: "Berlin", state: "Berlin", country: "Germany", coordinates: { lat: 52.5200, lng: 13.4050 } },
    assetType: "residential",
    images: [
      "https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db?w=800",
      "https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=800",
    ],
    propertyValue: 12000000,
    totalSupply: 120000,
    availableSupply: 48000,
    pricePerToken: 1000000000,
    annualYieldBps: 620,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 310,
  },

  // ─── Middle East ───────────────────────────────────────────────
  {
    name: "Burj Khalifa Armani Suite 104",
    symbol: "ARMBRJ",
    description: "An exclusive hospitality asset residing within the world's tallest building. The Giorgio Armani-designed hotel suite is part of a rental pool, allowing token holders to earn daily fractional revenue from high-net-worth guests.",
    location: { address: "1 Sheikh Mohammed bin Rashid Blvd", city: "Dubai", state: "Dubai", country: "UAE", coordinates: { lat: 25.1972, lng: 55.2744 } },
    assetType: "hospitality",
    images: [
      "https://images.unsplash.com/photo-1597659800260-8488e05c879d?w=800",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800",
    ],
    propertyValue: 8500000,
    totalSupply: 50000,
    availableSupply: 15000,
    pricePerToken: 1700000000,
    annualYieldBps: 850,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 312,
  },
  {
    name: "Abu Dhabi ADGM Office Tower",
    symbol: "ADGMOF",
    description: "Grade-A office floors in Abu Dhabi Global Market's financial free zone on Al Maryah Island. Tenanted by a multinational bank. Tax-free jurisdiction with English common law framework ideal for institutional investors.",
    location: { address: "Al Maryah Island", city: "Abu Dhabi", state: "Abu Dhabi", country: "UAE", coordinates: { lat: 24.4949, lng: 54.3900 } },
    assetType: "commercial",
    images: [
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800",
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
    ],
    propertyValue: 22000000,
    totalSupply: 220000,
    availableSupply: 66000,
    pricePerToken: 1000000000,
    annualYieldBps: 560,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 275,
  },

  // ─── Asia Pacific ──────────────────────────────────────────────
  {
    name: "Omotesando Retail Flagship",
    symbol: "TKYSNDO",
    description: "Prime street-level retail property located on Omotesando Avenue, often referred to as Tokyo's Champs-Élysées. Currently leased to an international luxury fashion house on a 10-year term with built-in rent escalations.",
    location: { address: "5-Chome Jingumae", city: "Tokyo", state: "Tokyo", country: "Japan", coordinates: { lat: 35.6661, lng: 139.7107 } },
    assetType: "commercial",
    images: [
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800",
      "https://images.unsplash.com/photo-1600812166548-c8402db08e2f?w=800",
    ],
    propertyValue: 24000000,
    totalSupply: 120000,
    availableSupply: 32000,
    pricePerToken: 2000000000,
    annualYieldBps: 480,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 415,
  },
  {
    name: "The Residences at Marina Bay",
    symbol: "MBSRES",
    description: "A luxury 3-bedroom condominium in Singapore's central business district. Unobstructed views of the Marina Bay waterfront. High demand from expatriate executives maintains near 100% historical occupancy.",
    location: { address: "Marina Boulevard", city: "Singapore", state: "Singapore", country: "Singapore", coordinates: { lat: 1.2825, lng: 103.8536 } },
    assetType: "residential",
    images: [
      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    ],
    propertyValue: 5500000,
    totalSupply: 55000,
    availableSupply: 20000,
    pricePerToken: 1000000000,
    annualYieldBps: 320,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 185,
  },
  {
    name: "Sydney Harbour View Penthouse",
    symbol: "SYDHBR",
    description: "A stunning 4-bedroom penthouse overlooking Sydney Harbour and the Opera House. Part of a premium residential tower with concierge, infinity pool, and private marina access. One of Australia's most sought-after addresses.",
    location: { address: "Circular Quay", city: "Sydney", state: "NSW", country: "Australia", coordinates: { lat: -33.8568, lng: 151.2153 } },
    assetType: "residential",
    images: [
      "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800",
      "https://images.unsplash.com/photo-1613545325278-f24b0cae1224?w=800",
    ],
    propertyValue: 14500000,
    totalSupply: 145000,
    availableSupply: 58000,
    pricePerToken: 1000000000,
    annualYieldBps: 280,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 220,
  },

  // ─── India ─────────────────────────────────────────────────────
  {
    name: "One Vanderbilt, BKC Mumbai",
    symbol: "BKCMUM",
    description: "Premium Grade-A commercial office space in Mumbai's Bandra Kurla Complex, India's premier financial district. Leased to a Big 4 consulting firm. Strategic location near MMRDA, SEBI, and Diamond Bourse ensures sustained institutional demand.",
    location: { address: "G Block, BKC", city: "Mumbai", state: "Maharashtra", country: "India", coordinates: { lat: 19.0596, lng: 72.8656 } },
    assetType: "commercial",
    images: [
      "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
    ],
    propertyValue: 35000000,
    totalSupply: 350000,
    availableSupply: 140000,
    pricePerToken: 1000000000,
    annualYieldBps: 720,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 580,
  },
  {
    name: "DLF Cyber City Office Tower",
    symbol: "DLFGUR",
    description: "100,000 sq ft office floor in DLF Cyber City Phase 3, Gurgaon — India's largest office ecosystem. Leased to a Fortune 500 tech company with 10-year lock-in. Consistently ranked as India's top commercial micro-market.",
    location: { address: "DLF Cyber City, Phase 3", city: "Gurgaon", state: "Haryana", country: "India", coordinates: { lat: 28.4941, lng: 77.0875 } },
    assetType: "commercial",
    images: [
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
      "https://images.unsplash.com/photo-1462396881884-de2c07cb95ed?w=800",
    ],
    propertyValue: 18000000,
    totalSupply: 180000,
    availableSupply: 72000,
    pricePerToken: 1000000000,
    annualYieldBps: 780,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 450,
  },
  {
    name: "Prestige Lakeside Habitat Villas",
    symbol: "BLRVLA",
    description: "A cluster of 4 luxury villas within Prestige Lakeside Habitat, Bengaluru's most coveted gated community. Each villa spans 5,000 sq ft with private gardens and lake access. Home to senior executives of India's top tech companies.",
    location: { address: "Varthur Road", city: "Bengaluru", state: "Karnataka", country: "India", coordinates: { lat: 12.9352, lng: 77.7315 } },
    assetType: "residential",
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    ],
    propertyValue: 6500000,
    totalSupply: 65000,
    availableSupply: 26000,
    pricePerToken: 1000000000,
    annualYieldBps: 450,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 165,
  },
  {
    name: "Taj Connemara Heritage Suite — Chennai",
    symbol: "TAJCHN",
    description: "An exclusive hospitality asset — a heritage suite within the iconic 19th-century Taj Connemara hotel in Chennai. One of India's oldest luxury hotels, recently restored. Token holders earn revenue from the suite's high-demand booking pool.",
    location: { address: "2 Binny Rd", city: "Chennai", state: "Tamil Nadu", country: "India", coordinates: { lat: 13.0627, lng: 80.2707 } },
    assetType: "hospitality",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800",
    ],
    propertyValue: 3800000,
    totalSupply: 38000,
    availableSupply: 12000,
    pricePerToken: 1000000000,
    annualYieldBps: 920,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 198,
  },

  // ─── Brazil & Emerging Markets ─────────────────────────────────
  {
    name: "São Paulo Vila Olímpia Office",
    symbol: "SPVILO",
    description: "Modern 20-story Class-A office tower in Vila Olímpia, São Paulo's premier tech and finance district. Fully leased to a Brazilian fintech unicorn. Green building certification (LEED Gold) and smart building automation.",
    location: { address: "Rua Funchal, 418", city: "São Paulo", state: "São Paulo", country: "Brazil", coordinates: { lat: -23.5947, lng: -46.6870 } },
    assetType: "commercial",
    images: [
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800",
    ],
    propertyValue: 11000000,
    totalSupply: 110000,
    availableSupply: 44000,
    pricePerToken: 1000000000,
    annualYieldBps: 880,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 290,
  },
  {
    name: "Palm Jumeirah Royal Villa",
    symbol: "PALMVL",
    description: "A beachfront royal villa on the iconic Palm Jumeirah with private beach, infinity pool, and 180-degree Arabian Gulf views. 12,000 sq ft of living space. Generates premium short-term rental income from ultra-high-net-worth guests.",
    location: { address: "Frond M, Palm Jumeirah", city: "Dubai", state: "Dubai", country: "UAE", coordinates: { lat: 25.1124, lng: 55.1390 } },
    assetType: "hospitality",
    images: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800",
    ],
    propertyValue: 25000000,
    totalSupply: 250000,
    availableSupply: 75000,
    pricePerToken: 1000000000,
    annualYieldBps: 760,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 380,
  },
  {
    name: "Rajasthan Solar Farm — Jaisalmer",
    symbol: "RJSOLAR",
    description: "500-acre operational solar farm in Rajasthan's Thar Desert, one of the world's highest solar irradiance zones. 200 MW capacity with a 25-year power purchase agreement (PPA) with the state grid. Clean energy infrastructure with government-backed revenue.",
    location: { address: "Bada Bagh Road", city: "Jaisalmer", state: "Rajasthan", country: "India", coordinates: { lat: 26.9124, lng: 70.9160 } },
    assetType: "industrial",
    images: [
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800",
      "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800",
    ],
    propertyValue: 42000000,
    totalSupply: 420000,
    availableSupply: 168000,
    pricePerToken: 1000000000,
    annualYieldBps: 950,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 720,
  },
  {
    name: "Swiss Vaulted Gold (1 KG)",
    symbol: "AU999",
    description: "LBMA-certified 1 KG gold bar held in a high-security private vault in Zurich, Switzerland. Fully insured and regularly audited by tier-1 accounting firms. Token holders have legal title to the physical bullion.",
    location: { address: "Private Vault", city: "Zurich", state: "Zurich", country: "Switzerland", coordinates: { lat: 47.3769, lng: 8.5417 } },
    assetType: "gold",
    images: ["https://images.unsplash.com/photo-1581091215367-9b6c00b3035a?w=800"],
    propertyValue: 72000,
    totalSupply: 1000,
    availableSupply: 400,
    pricePerToken: 72000000,
    annualYieldBps: 0,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 85,
  },
  {
    name: "Picasso — Tête de Femme",
    symbol: "ARTPICA",
    description: "A fractionalized masterpiece by Pablo Picasso. This rare artwork is professionally curated and stored in a temperature-controlled gallery environment. Tokenization allows retail access to high-value blue-chip fine art.",
    location: { address: "Gallery Row", city: "Paris", state: "Île-de-France", country: "France", coordinates: { lat: 48.8566, lng: 2.3522 } },
    assetType: "art",
    images: ["https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800"],
    propertyValue: 4500000,
    totalSupply: 50000,
    availableSupply: 15000,
    pricePerToken: 90000000,
    annualYieldBps: 0,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 540,
  },
  {
    name: "US Treasury 10Y Bond Pool",
    symbol: "UST10Y",
    description: "A managed pool of 10-year US Treasury Notes, providing institutional-grade fixed income with sovereign security. Ideal for low-risk yield management in a digital-native portfolio.",
    location: { address: "Federal Reserve Bank", city: "New York", state: "NY", country: "USA", coordinates: { lat: 40.7128, lng: -74.0060 } },
    assetType: "bond",
    images: ["https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800"],
    propertyValue: 10000000,
    totalSupply: 100000,
    availableSupply: 25000,
    pricePerToken: 100000000,
    annualYieldBps: 425,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 1200,
  },
  {
    name: "Pre-IPO SpaceX Equity",
    symbol: "SPXEQ",
    description: "Fractionalized secondary market shares in SpaceX. Provides exposure to private tech unicorn growth before traditional liquidity events. Managed via a Special Purpose Vehicle (SPV) with audited unit ownership.",
    location: { address: "Boca Chica St", city: "Brownsville", state: "Texas", country: "USA", coordinates: { lat: 25.9017, lng: -97.4975 } },
    assetType: "stock",
    images: ["https://images.unsplash.com/photo-1517976487492-5750f3195933?w=800"],
    propertyValue: 2500000,
    totalSupply: 5000,
    availableSupply: 1200,
    pricePerToken: 500000000,
    annualYieldBps: 0,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 820,
  },
  {
    name: "1962 Ferrari 250 GTO Portfolio",
    symbol: "FERGTO",
    description: "Co-ownership of one of the world's most valuable classic cars. Professionally maintained and stored in a private automotive museum. This asset class has historically outperformed global equity markets over multi-decade horizons.",
    location: { address: "Ferrari Hub", city: "Maranello", state: "MO", country: "Italy", coordinates: { lat: 44.5323, lng: 10.8640 } },
    assetType: "vehicle",
    images: ["https://images.unsplash.com/photo-1592193660027-2900257e1030?w=800"],
    propertyValue: 48000000,
    totalSupply: 100000,
    availableSupply: 65000,
    pricePerToken: 480000000,
    annualYieldBps: 0,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 140,
  },
  {
    name: "WTI Crude Oil Futures Pool",
    symbol: "WTICRU",
    description: "Strategic exposure to WTI Crude Oil via a managed futures rolling contract pool. Direct commodity exposure for inflation hedging and diversification, settled and reconciled on-chain at every contract expiration.",
    location: { address: "Cushing Hub", city: "Cushing", state: "Oklahoma", country: "USA", coordinates: { lat: 35.9845, lng: -96.7678 } },
    assetType: "commodity",
    images: ["https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800"],
    propertyValue: 12000000,
    totalSupply: 120000,
    availableSupply: 98000,
    pricePerToken: 100000000,
    annualYieldBps: 0,
    authority: "admin",
    status: "active",
    isActive: true,
    totalInvestors: 650,
  },
];

// ─── Demo Users ──────────────────────────────────────────────────

const sampleUsers = [
  {
    walletAddress: "DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    name: "Arjun Mehta",
    email: "arjun@assetverse.io",
    kycStatus: "approved",
    kycApprovedAt: new Date(),
    isWhitelisted: true,
    role: "admin",
  },
  {
    walletAddress: "InvestorWa11et2XXXXXXXXXXXXXXXXXXXXXXXXXX",
    name: "Sarah Chen",
    email: "sarah.chen@globalfund.com",
    kycStatus: "approved",
    kycApprovedAt: new Date(),
    isWhitelisted: true,
    role: "user",
  },
  {
    walletAddress: "InvestorWa11et3XXXXXXXXXXXXXXXXXXXXXXXXXX",
    name: "James Morrison",
    email: "morrison@londonventures.co.uk",
    kycStatus: "approved",
    kycApprovedAt: new Date(),
    isWhitelisted: true,
    role: "user",
  },
  {
    walletAddress: "InvestorWa11et4XXXXXXXXXXXXXXXXXXXXXXXXXX",
    name: "Priya Sharma",
    email: "priya@fintech.in",
    kycStatus: "approved",
    kycApprovedAt: new Date(),
    isWhitelisted: true,
    role: "user",
  },
  {
    walletAddress: "InvestorWa11et5XXXXXXXXXXXXXXXXXXXXXXXXXX",
    name: "Yuki Tanaka",
    email: "tanaka@tokyoassets.jp",
    kycStatus: "pending",
    isWhitelisted: false,
    role: "user",
  },
];

// ─── Community Posts ─────────────────────────────────────────────

const samplePosts = [
  {
    walletAddress: "InvestorWa11et2XXXXXXXXXXXXXXXXXXXXXXXXXX",
    authorName: "Sarah Chen",
    type: "analysis",
    title: "Why Indian Commercial Real Estate is the Best RWA Play in 2026",
    content: "After analyzing yield data across 15 markets, Mumbai BKC and Gurgaon DLF consistently outperform global benchmarks. India's office sector is delivering 7-8% yields while Singapore and London are under 4%. The rupee risk is offset by India's GDP growth rate differential. Here's my full breakdown...\n\nKey factors:\n1. India's office absorption hit record levels in 2025\n2. Rental escalations of 10-15% every 3 years are contractual\n3. Global Capability Centers (GCCs) are expanding aggressively\n4. REIT regulations have matured significantly\n\nI've allocated 35% of my portfolio to Indian commercial assets on this basis.",
    tags: ["India", "Commercial", "Yield Analysis"],
    likes: 47,
    likedBy: ["DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", "InvestorWa11et4XXXXXXXXXXXXXXXXXXXXXXXXXX"],
    isPinned: true,
  },
  {
    walletAddress: "DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authorName: "Arjun Mehta",
    type: "insight",
    title: "Solar Farm Tokenization: The Untapped 9.5% Yield Opportunity",
    content: "The Rajasthan Solar Farm (RJSOLAR) is quietly one of the best risk-adjusted opportunities on the platform. Government-backed 25-year PPA means near-zero revenue risk, and the Thar Desert has some of the highest solar irradiance on Earth.\n\nComparison with traditional energy infrastructure REITs shows a 200-300bps yield premium. The tokenization layer on Solana adds 24/7 liquidity that traditional infrastructure funds simply can't offer.",
    tags: ["Solar", "Infrastructure", "Yield"],
    likes: 32,
    likedBy: ["InvestorWa11et2XXXXXXXXXXXXXXXXXXXXXXXXXX"],
    isPinned: false,
  },
  {
    walletAddress: "InvestorWa11et3XXXXXXXXXXXXXXXXXXXXXXXXXX",
    authorName: "James Morrison",
    type: "discussion",
    title: "European Luxury Retail: Is Zurich Overpriced or Undervalued?",
    content: "The ZRHRET token represents arguably the safest real estate in the world — Swiss luxury retail. But at 3.4% yield, is it worth it? My take: Yes, but only as a defensive allocation.\n\nPros: AAA sovereign, zero vacancy risk, CHF denomination hedge\nCons: Low yield, limited upside, strong franc makes it expensive\n\nI treat it as my 'digital gold' allocation. Thoughts?",
    tags: ["Europe", "Retail", "Discussion"],
    likes: 18,
    likedBy: [],
    isPinned: false,
  },
  {
    walletAddress: "InvestorWa11et4XXXXXXXXXXXXXXXXXXXXXXXXXX",
    authorName: "Priya Sharma",
    type: "news",
    title: "India's SEBI Approves New Framework for Tokenized Real Estate",
    content: "Breaking: SEBI has released a consultation paper on Digital Asset-backed Securities (DABS), which effectively creates a regulatory pathway for tokenized real estate in India. This is massive for platforms like Assetverse.\n\nKey highlights:\n- REITs and InvITs can now issue fractional digital units\n- Minimum investment threshold reduced to ₹10,000\n- KYC via DigiLocker integration approved\n- Secondary trading on recognized stock exchanges and DeFi platforms\n\nThis could unlock $200B+ of Indian real estate for retail investors.",
    tags: ["India", "Regulation", "SEBI"],
    likes: 85,
    likedBy: ["DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", "InvestorWa11et2XXXXXXXXXXXXXXXXXXXXXXXXXX", "InvestorWa11et3XXXXXXXXXXXXXXXXXXXXXXXXXX"],
    isPinned: true,
  },
  {
    walletAddress: "InvestorWa11et2XXXXXXXXXXXXXXXXXXXXXXXXXX",
    authorName: "Sarah Chen",
    type: "analysis",
    title: "Portfolio Construction: The 40/30/20/10 RWA Allocation Model",
    content: "After extensive backtesting, here's the allocation model I recommend for RWA portfolios:\n\n40% — Commercial Office (BKC Mumbai, DLF, Shard)\n30% — Industrial/Infrastructure (Prologis, Solar Farm)\n20% — Hospitality (Burj Khalifa, Taj, Palm Villa)\n10% — Residential (432 Park, Marina Bay, Sydney)\n\nThis blend delivers:\n- Weighted yield: ~6.2%\n- Diversification across 8 countries\n- Mix of growth and income\n- Inflation hedge via rental escalation clauses\n\nKey risk: Currency exposure. Mitigated by multi-currency denomination.",
    tags: ["Portfolio", "Strategy", "Diversification"],
    likes: 63,
    likedBy: [],
    isPinned: false,
  },
];

// ─── Community Reviews ───────────────────────────────────────────

const sampleReviews = [
  {
    rating: 5,
    authorName: "Sarah Chen",
    walletAddress: "InvestorWa11et2XXXXXXXXXXXXXXXXXXXXXXXXXX",
    title: "Best commercial RWA on the platform",
    content: "The BKC Mumbai asset has been incredible. Yields arrived exactly on schedule, and the property value has appreciated 12% since I bought in. India commercial is the real deal.",
    tags: ["Commercial", "India"],
    helpfulCount: 14,
  },
  {
    rating: 4,
    authorName: "James Morrison",
    walletAddress: "InvestorWa11et3XXXXXXXXXXXXXXXXXXXXXXXXXX",
    title: "Solid defensive holding",
    content: "The Shard office is the definition of 'blue chip' real estate. Low yield but I sleep well at night. London is London.",
    tags: ["Commercial", "UK"],
    helpfulCount: 8,
  },
  {
    rating: 5,
    authorName: "Priya Sharma",
    walletAddress: "InvestorWa11et4XXXXXXXXXXXXXXXXXXXXXXXXXX",
    title: "9.5% yield is not a typo!",
    content: "The solar farm is printing money. Government-backed PPA means no revenue risk, and the yield is almost 10%. This should be in everyone's portfolio.",
    tags: ["Infrastructure", "India", "Solar"],
    helpfulCount: 22,
  },
  {
    rating: 4,
    authorName: "Arjun Mehta",
    walletAddress: "DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    title: "Strong hospitality play in Dubai",
    content: "The Burj Khalifa suite generates excellent short-term rental revenue. 8.5% yield on what is essentially the most iconic address in the world. Only giving 4 stars because Dubai real estate can be volatile.",
    tags: ["Hospitality", "Dubai"],
    helpfulCount: 11,
  },
];

// ─── Seed Function ───────────────────────────────────────────────

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("📦 Connected to MongoDB");

    // Clear existing data
    await Asset.deleteMany({});
    await User.deleteMany({});
    await Portfolio.deleteMany({});
    await Transaction.deleteMany({});
    await LiquidityPool.deleteMany({});
    await OTCOrder.deleteMany({});

    // Clear community collections if they exist
    try {
      await mongoose.connection.collection("reviews").drop();
    } catch (e) { /* collection may not exist */ }
    try {
      await mongoose.connection.collection("posts").drop();
    } catch (e) { /* collection may not exist */ }

    console.log("🗑️  Cleared existing data");

    // Generate price histories for all assets
    const assetsWithHistory = sampleAssets.map((asset) => {
      const history = [];
      const basePrice = asset.propertyValue / asset.totalSupply;
      let price = basePrice;

      for (let i = 90; i >= 0; i--) {
        const volatility =
          asset.assetType === "residential" ? 0.005 :
          asset.assetType === "land" ? 0.002 :
          asset.assetType === "industrial" ? 0.003 :
          asset.assetType === "hospitality" ? 0.008 :
          asset.assetType === "gold" ? 0.002 :
          asset.assetType === "art" ? 0.012 :
          asset.assetType === "bond" ? 0.001 :
          asset.assetType === "stock" ? 0.015 :
          asset.assetType === "vehicle" ? 0.006 :
          asset.assetType === "commodity" ? 0.025 : 0.006;
        const change = (Math.random() - 0.48) * volatility;
        price = price * (1 + change);
        history.push({
          price: Math.round(price * 100) / 100,
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        });
      }

      return { ...asset, priceHistory: history };
    });

    // Insert assets
    const assets = await Asset.insertMany(assetsWithHistory);
    console.log(`✅ Seeded ${assets.length} real-world assets across ${new Set(assets.map(a => a.location?.country)).size} countries`);

    // Insert users
    const users = [];
    for (const u of sampleUsers) {
      const user = await User.create(u);
      users.push(user);
    }
    console.log(`✅ Seeded ${users.length} demo users`);

    // Create demo portfolio for primary user
    const demoPortfolio = await Portfolio.create({
      walletAddress: sampleUsers[0].walletAddress,
      holdings: [
        {
          assetId: assets[13]._id, // BKC Mumbai
          shares: 500,
          avgBuyPrice: assets[13].pricePerToken,
          totalInvested: 500 * assets[13].pricePerToken,
          firstPurchaseAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          lastTransactionAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          assetId: assets[19]._id, // Solar Farm
          shares: 300,
          avgBuyPrice: assets[19].pricePerToken,
          totalInvested: 300 * assets[19].pricePerToken,
          firstPurchaseAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          lastTransactionAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          assetId: assets[8]._id, // Burj Khalifa
          shares: 200,
          avgBuyPrice: assets[8].pricePerToken,
          totalInvested: 200 * assets[8].pricePerToken,
          firstPurchaseAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lastTransactionAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
      ],
      totalInvested: 500 * assets[13].pricePerToken + 300 * assets[19].pricePerToken + 200 * assets[8].pricePerToken,
      totalValue: 500 * assets[13].pricePerToken + 300 * assets[19].pricePerToken + 200 * assets[8].pricePerToken,
    });

    // Create demo transactions
    const demoTransactions = [
      { walletAddress: sampleUsers[0].walletAddress, assetId: assets[13]._id, assetName: assets[13].name, type: "buy", shares: 500, pricePerToken: assets[13].pricePerToken, totalAmount: 500 * assets[13].pricePerToken, fee: 50000000, status: "confirmed", txHash: `sim_seed_tx_001` },
      { walletAddress: sampleUsers[0].walletAddress, assetId: assets[19]._id, assetName: assets[19].name, type: "buy", shares: 300, pricePerToken: assets[19].pricePerToken, totalAmount: 300 * assets[19].pricePerToken, fee: 30000000, status: "confirmed", txHash: `sim_seed_tx_002` },
      { walletAddress: sampleUsers[0].walletAddress, assetId: assets[8]._id, assetName: assets[8].name, type: "buy", shares: 200, pricePerToken: assets[8].pricePerToken, totalAmount: 200 * assets[8].pricePerToken, fee: 34000000, status: "confirmed", txHash: `sim_seed_tx_003` },
      { walletAddress: sampleUsers[1].walletAddress, assetId: assets[0]._id, assetName: assets[0].name, type: "buy", shares: 1000, pricePerToken: assets[0].pricePerToken, totalAmount: 1000 * assets[0].pricePerToken, fee: 185000000, status: "confirmed", txHash: `sim_seed_tx_004` },
      { walletAddress: sampleUsers[1].walletAddress, assetId: assets[13]._id, assetName: assets[13].name, type: "buy", shares: 800, pricePerToken: assets[13].pricePerToken, totalAmount: 800 * assets[13].pricePerToken, fee: 80000000, status: "confirmed", txHash: `sim_seed_tx_005` },
    ];
    await Transaction.insertMany(demoTransactions);
    console.log(`✅ Seeded ${demoTransactions.length} demo transactions`);

    // Seed community posts (using direct MongoDB insert to handle the inline model)
    const Post = mongoose.models.Post || mongoose.model("Post", new mongoose.Schema({
      walletAddress: String, authorName: String, type: String, title: String, content: String,
      tags: [String], assetMentions: [mongoose.Schema.Types.ObjectId], likes: Number,
      likedBy: [String], commentsCount: Number, comments: [mongoose.Schema.Types.Mixed], isPinned: Boolean,
    }, { timestamps: true }));

    const posts = await Post.insertMany(samplePosts.map(p => ({
      ...p,
      commentsCount: 0,
      comments: [],
    })));
    console.log(`✅ Seeded ${posts.length} community posts`);

    // Seed reviews (attach to specific assets)
    const Review = mongoose.models.Review || mongoose.model("Review", new mongoose.Schema({
      assetId: mongoose.Schema.Types.ObjectId, walletAddress: String, authorName: String,
      rating: Number, title: String, content: String, tags: [String], helpfulCount: Number,
    }, { timestamps: true }));

    const reviewAssetIndices = [13, 5, 19, 8]; // BKC, Shard, Solar, Burj
    const reviews = await Review.insertMany(
      sampleReviews.map((r, i) => ({ ...r, assetId: assets[reviewAssetIndices[i]]._id }))
    );
    console.log(`✅ Seeded ${reviews.length} asset reviews`);

    // ─── Seed Liquidity Pools ─────────────────────────────────────
    const topAssets = [
      { index: 13, tokenReserve: 10000, solReserve: 1000 }, // BKC Mumbai
      { index: 19, tokenReserve: 5000, solReserve: 2500 },  // Solar Farm
      { index: 8, tokenReserve: 2000, solReserve: 1500 },  // Burj Khalifa
      { index: 21, tokenReserve: 1000, solReserve: 500 },   // Picasso
      { index: 20, tokenReserve: 100, solReserve: 200 },    // Gold
    ];

    for (const poolData of topAssets) {
      const asset = assets[poolData.index];
      await liquidityService.createPool({
        assetId: asset._id,
        assetSymbol: asset.symbol,
        initialTokenReserve: poolData.tokenReserve,
        initialSolReserve: poolData.solReserve,
        creator: "DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      });
    }
    console.log(`✅ Seeded ${topAssets.length} liquidity pools`);

    // ─── Seed OTC Orders ──────────────────────────────────────────
    const otcAssets = [13, 19, 8, 21, 20];
    for (const index of otcAssets) {
      const asset = assets[index];
      const solValue = asset.pricePerToken / 1000000000;
      
      // Place a few buy and sell orders
      await liquidityService.placeOTCOrder({
        assetId: asset._id,
        walletAddress: "InvestorWa11et2XXXXXXXXXXXXXXXXXXXXXXXXXX",
        side: "bid",
        shares: 50,
        pricePerShare: solValue * 0.95,
      });
      await liquidityService.placeOTCOrder({
        assetId: asset._id,
        walletAddress: "InvestorWa11et3XXXXXXXXXXXXXXXXXXXXXXXXXX",
        side: "ask",
        shares: 30,
        pricePerShare: solValue * 1.05,
      });
    }
    console.log(`✅ Seeded ${otcAssets.length * 2} OTC limit orders`);

    // Summary
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║         🎉 Database Seeded Successfully — Phase 2          ║
╠══════════════════════════════════════════════════════════════╣
║  Assets:       ${String(assets.length).padEnd(6)} across ${String(new Set(assets.map(a => a.location?.country)).size).padEnd(2)} countries              ║
║  Users:        ${String(users.length).padEnd(44)}  ║
║  Transactions: ${String(demoTransactions.length).padEnd(44)}  ║
║  Posts:        ${String(posts.length).padEnd(44)}  ║
║  Reviews:      ${String(reviews.length).padEnd(44)}  ║
╚══════════════════════════════════════════════════════════════╝
`);

    console.log("\nSeeded Assets:");
    assets.forEach((a) => {
      console.log(
        `  ${a.location?.country?.padEnd(12) || "N/A".padEnd(12)} | ${a.name.padEnd(42)} | ${a.symbol.padEnd(8)} | $${(a.propertyValue / 1e6).toFixed(1)}M | Yield: ${(a.annualYieldBps / 100).toFixed(2)}%`
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
