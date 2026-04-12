# Institutional API Specification

This document provides a technical reference for the hardened AssetVerse API.

## 🧱 Auth & Security
- **Auth Scheme**: Wallet Signature (SIWS Protocol)
- **Headers**:
    - `x-wallet-address`: Public key of the user.
    - `x-wallet-signature`: Base58 encoded signature of a "Sign-In" message.
- **Rate Limits**:
    - Read: 200 req / 15 min
    - Write: 50 req / 15 min

---

## 🏥 Operational Management

### `GET /api/health`
**Description**: Deep cluster health check.
**Responses**:
- `200 OK`: System healthy or degraded.
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected",
    "solana": "connected",
    "oracle": "operational"
  }
}
```

---

## 🏘️ Asset Management

### `GET /api/assets`
**Description**: List tokenized assets.
**Query Params**:
- `category`: `Residential`, `Commercial`, `Industrial`.
- `minYield`: number.
- `limit`, `skip`: pagination.
**Cache**: TTL 60s (Redis).

### `GET /api/assets/:id`
**Description**: High-fidelity asset data + price history.
**Cache**: TTL 300s (Redis).

---

## 💹 Trading (ACID Guarded)

### `POST /api/buy`
**Description**: Execute a buy order.
**Body**:
```json
{
  "assetId": "string",
  "shares": "number",
  "walletAddress": "string"
}
```
**Notes**: 
- Validates KYC status.
- Atomically updates Asset, Portfolio, User, and AuditLog.

### `POST /api/sell`
**Description**: Execute a sell order using FIFO tax-lot logic.
**Body**:
```json
{
  "assetId": "string",
  "shares": "number",
  "walletAddress": "string"
}
```

---

## 💼 Portfolio & Compliance

### `GET /api/portfolio/:wallet`
**Description**: Real-time portfolio valuation summary.

### `GET /api/portfolio/:wallet/tax-lots`
**Description**: Unsold share inventory with cost-basis tracking.

### `POST /api/kyc/verify`
**Description**: Upload identity documents for whitelist approval.

---

## 📜 Audit & Analytics

### `GET /api/audit/logs` (Admin Only)
**Query Params**:
- `format`: `csv` or `json`.
- `startDate`, `endDate`: ISO Strings.
**Description**: Streaming export of compliance events.
