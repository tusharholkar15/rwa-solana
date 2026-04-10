# SolanaEstate — Tokenized Real World Assets Platform

A production-grade decentralized application for fractional real estate ownership on the Solana blockchain using the Anchor framework.

![Solana](https://img.shields.io/badge/Solana-Devnet-green) ![Anchor](https://img.shields.io/badge/Anchor-0.30.1-blue) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![Express](https://img.shields.io/badge/Express-4.21-lightgrey)

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   Frontend       │────▶│   Backend API     │────▶│  Solana Blockchain  │
│   (Next.js 14)   │     │   (Express.js)    │     │  (Anchor Program)   │
│   Port: 3000     │     │   Port: 5000      │     │  Devnet / Mainnet   │
└─────────────────┘     └──────────────────┘     └────────────────────┘
         │                       │                         │
    Phantom Wallet          MongoDB                  SPL Tokens
    Tailwind CSS            Mongoose                 PDAs / Vaults
    Framer Motion           Pyth Oracle              Whitelist / KYC
    Recharts                KYC Service              Yield Distribution
```

---

## 📂 Project Structure

```
rwa-solana/
├── programs/rwa-tokenization/     # Anchor smart contracts (Rust)
│   └── src/
│       ├── lib.rs                 # Program entry point
│       ├── instructions/          # 7 instruction handlers
│       ├── state/                 # 4 PDA account types
│       └── errors.rs              # Custom error codes
├── tests/                         # Anchor integration tests (TypeScript)
├── backend/                       # Express.js API server
│   └── src/
│       ├── models/                # MongoDB schemas
│       ├── routes/                # API endpoints
│       ├── services/              # Solana, Price, KYC services
│       └── middleware/            # Auth & validation
├── frontend/                      # Next.js 14 application
│   └── src/
│       ├── app/                   # Pages (App Router)
│       ├── components/            # UI components
│       ├── lib/                   # API client, constants
│       └── types/                 # TypeScript definitions
├── Anchor.toml                    # Anchor workspace config
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+
- **MongoDB** running locally (or Atlas URI)
- **Rust** + **Solana CLI** + **Anchor CLI** (for smart contract compilation)
- **Phantom Wallet** browser extension

### 1. Clone & Install

```bash
# Install root dependencies (Anchor tests)
cd rwa-solana
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Start MongoDB

```bash
# If using local MongoDB
mongod --dbname rwa-solana
```

### 3. Seed the Database

```bash
cd backend
npm run seed
```

This creates 6 sample tokenized properties and a demo admin user.

### 4. Start the Backend

```bash
cd backend
npm run dev
```

Server starts at `http://localhost:5000`

### 5. Start the Frontend

```bash
cd frontend
npm run dev
```

App available at `http://localhost:3000`

### 6. (Optional) Build & Deploy Smart Contracts

```bash
# Build the Anchor program
anchor build

# Deploy to Devnet
solana config set --url devnet
anchor deploy --provider.cluster devnet

# Run tests
anchor test
```

> **Note:** Update the program ID in `Anchor.toml`, `lib.rs`, and `backend/.env` after deployment.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/assets` | List all properties (filterable) |
| `GET` | `/api/assets/:id` | Get asset details + price history |
| `POST` | `/api/assets` | Admin: Create new asset |
| `DELETE` | `/api/assets/:id` | Admin: Delist asset |
| `POST` | `/api/buy` | Buy fractional shares |
| `POST` | `/api/sell` | Sell fractional shares |
| `GET` | `/api/portfolio/:wallet` | Get user portfolio |
| `GET` | `/api/portfolio/:wallet/transactions` | Transaction history |
| `POST` | `/api/kyc/verify` | Submit KYC documents |
| `GET` | `/api/kyc/status/:wallet` | Check KYC status |
| `POST` | `/api/kyc/approve` | Admin: Approve KYC |
| `GET` | `/api/admin/stats` | Platform analytics |

---

## ⛓️ Smart Contract Instructions

| Instruction | Description |
|-------------|-------------|
| `initialize_asset` | Create tokenized property with SPL mint & treasury |
| `whitelist_user` | KYC-verify a user for on-chain trading |
| `remove_whitelist` | Remove user from whitelist |
| `buy_shares` | Purchase fractional tokens (SOL → Treasury) |
| `sell_shares` | Sell tokens back (Treasury → SOL) |
| `transfer_shares` | P2P transfer between whitelisted users |
| `distribute_yield` | Admin distributes rental income to holders |
| `update_price` | Update price from Pyth oracle feed |

### PDA Account Types

| Account | Seeds | Purpose |
|---------|-------|---------|
| `AssetAccount` | `["asset", authority, name]` | Property metadata, supply, pricing |
| `UserOwnership` | `["ownership", asset, owner]` | Per-user share tracking |
| `TreasuryVault` | `["treasury", asset]` | Holds sale proceeds, manages yield |
| `WhitelistEntry` | `["whitelist", user]` | KYC verification status |

---

## 🎨 Frontend Pages

| Page | Route | Features |
|------|-------|----------|
| Landing | `/` | Hero animation, stats, features, CTA |
| Dashboard | `/dashboard` | Portfolio chart, distribution pie, stats |
| Marketplace | `/marketplace` | Property grid, search, filters, sort |
| Asset Detail | `/asset/:id` | Gallery, metrics, price chart, buy/sell |
| Portfolio | `/portfolio` | Holdings table, P&L tracking |
| Transactions | `/transactions` | Filtered history with pagination |
| Admin | `/admin` | Platform stats, add asset, KYC management |

---

## 🔐 Security Features

- **On-chain whitelist** — Only KYC-verified users can trade
- **Overflow-safe math** — All arithmetic uses `checked_*` operations
- **PDA validation** — Deterministic account derivation with bump verification
- **Supply caps** — Cannot oversell tokens beyond total supply
- **Ownership verification** — Must own shares to sell
- **Rate limiting** — API rate limiting (100 req/15min)
- **Helmet.js** — Security headers on all responses
- **CORS** — Restricted to frontend origin
- **Input validation** — Middleware validates all requests

---

## 🏦 Oracle Integration

Uses **Pyth Network** for real-time price feeds:

- Pull-based architecture via Hermes API
- `PriceUpdateV2` account verification in Anchor
- Staleness check (max 60s age)
- SOL/USD conversion for property valuations
- Mock fallback for properties without oracle feeds

---

## 📦 Deployment

### Smart Contract → Solana Devnet

```bash
solana config set --url devnet
solana airdrop 5  # Get devnet SOL
anchor build
anchor deploy --provider.cluster devnet
```

### Backend → Render / Railway

```bash
# Set environment variables in your hosting platform
# Build & start
npm start
```

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Solana, Anchor 0.30.1, SPL Token |
| Smart Contract | Rust |
| Oracle | Pyth Network |
| Backend | Node.js, Express.js, MongoDB, Mongoose |
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS 3, Framer Motion |
| Charts | Recharts |
| Wallet | @solana/wallet-adapter (Phantom) |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
