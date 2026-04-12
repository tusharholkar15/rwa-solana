# Institutional Operations Playbook

This document provides operational guidelines and incident response playbooks for the RWA Tokenization platform.

## 🤝 System Architecture Overview

The platform uses a 6-layer hardening strategy:
1. **Security**: SIWS, Helmet, Rate Limiting, Sanitization.
2. **Infrastructure**: Multi-stage Docker, Resource Limits, MongoDB Replica Sets.
3. **Data Integrity**: ACID Transactions, Atomic Audit Logging.
4. **Performance**: Redis Cache-Aside, React-Window Virtualization.
5. **Oracles**: Pyth Hermes Integration with Circuit Breakers.
6. **Observability**: Pino Structured Logging, Deep Health Checks.

---

## 🚨 Incident Response Playbooks

### 1. Stale Oracle Pricing
**Symptoms**: Frontend shows "Stale Data" warning. Market activity stops.
**Check**:
```bash
docker-compose logs -f backend | grep "Oracle"
```
**Resolution**:
- If Pyth Hermes is down, the system enters "Circuit Breaker" mode.
- Users can still view properties but trading is disabled to protect against arbitrage.
- Once Hermes returns, the `oracleService` will automatically resume updates within 60s.

### 2. Cache Inconsistency
**Symptoms**: Buying an asset doesn't immediately reflect in the "My Portfolio" view.
**Resolution**:
Manual cache purge:
```bash
docker-compose exec redis redis-cli FLUSHALL
```
*Note: The system implements automatic invalidation post-commit, so this should be rare.*

### 3. Database Replication Lag
**Symptoms**: Admin metrics show a lag between primary and secondary Mongo nodes.
**Check**:
```bash
docker-compose exec mongo mongosh --eval "rs.status()"
```
**Resolution**:
Ensure `mongo-rs-init` successfully completed. If not, restart it:
```bash
docker-compose restart mongo-rs-init
```

---

## 📊 Administration Tasks

### Triggering a Regulator Audit Export
To export all compliance events for a specific period:
```bash
# Export last 30 days of Audit Logs to CSV
curl -X GET "http://localhost:5000/api/audit/logs?format=csv&startDate=2024-03-01" \
     -H "Authorization: Bearer <ADMIN_JWT>"
```

### Seeding a New Staging Environment
```bash
docker-compose exec backend npm run seed
```

---

## 🛡️ Maintenance Commands

| Action | Command |
|--------|---------|
| View Real-time Logs | `docker-compose logs -f --tail=100` |
| Check Node Health | `curl http://localhost:5000/api/health` |
| Check Redis Usage | `docker-compose exec redis redis-cli info memory` |
| Rotate Logs Locally | `docker-compose kill -s SIGUSR1 backend` |

---

## 🔒 Security Posture
- **Private Keys**: NEVER store keys in logs. `pino` is configured to redact `walletSecret` and `privateKey`.
- **DDoS**: The platform uses `express-rate-limit`. If a legitimate institutional partner is being blocked, update the `WHITELISTED_IPS` in `.env`.
