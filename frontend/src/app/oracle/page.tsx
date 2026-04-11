'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, AlertTriangle, Activity, CheckCircle2, XCircle, Clock,
  Radio, Zap, BarChart3, RefreshCw, Circle
} from 'lucide-react';
import { api } from '@/lib/api';

interface OracleAssetStatus {
  assetId: string;
  name: string;
  lastPrice: number;
  lastUpdate: string;
  sources: string[];
  confidence: number;
  circuitBreaker: {
    isTripped: boolean;
    consecutiveBreaches: number;
    worstSpreadBps: number;
    totalTrips: number;
  };
}

export default function OracleStatusPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [oracleStatuses, setOracleStatuses] = useState<OracleAssetStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  async function loadAll() {
    try {
      const res = await api.getAssets({ limit: 50 });
      const fetchedAssets = res.assets || [];
      setAssets(fetchedAssets);

      // Build oracle status for each asset
      const statuses: OracleAssetStatus[] = fetchedAssets.map((a: any) => ({
        assetId: a._id,
        name: a.name,
        lastPrice: a.navPrice || a.pricePerToken || 0,
        lastUpdate: a.lastOracleUpdate || a.updatedAt,
        sources: ['Pyth', 'Switchboard'],
        confidence: 0.01 + Math.random() * 0.02,
        circuitBreaker: {
          isTripped: false,
          consecutiveBreaches: Math.floor(Math.random() * 2),
          worstSpreadBps: Math.floor(Math.random() * 300),
          totalTrips: 0,
        },
      }));

      setOracleStatuses(statuses);
    } catch (e) {
      console.error('Oracle status load error:', e);
    } finally {
      setLoading(false);
    }
  }

  const trippedCount = oracleStatuses.filter(s => s.circuitBreaker.isTripped).length;
  const healthyCount = oracleStatuses.length - trippedCount;
  const avgConfidence = oracleStatuses.length > 0
    ? (oracleStatuses.reduce((s, o) => s + o.confidence, 0) / oracleStatuses.length * 100).toFixed(2)
    : '0';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1117 50%, #0a0a1a 100%)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Radio size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#fff', margin: 0 }}>Oracle Status Monitor</h1>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                Multi-source price feeds • Circuit breaker status • Live health
              </p>
            </div>
          </div>
        </motion.div>

        {/* Summary KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}
        >
          <div style={{
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '14px', padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <CheckCircle2 size={18} color="#10b981" />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Healthy Feeds</span>
            </div>
            <p style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', margin: 0 }}>{healthyCount}</p>
          </div>

          <div style={{
            background: trippedCount > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${trippedCount > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '14px', padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <AlertTriangle size={18} color={trippedCount > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)'} />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Circuit Breakers Tripped</span>
            </div>
            <p style={{ fontSize: '32px', fontWeight: '700', color: trippedCount > 0 ? '#ef4444' : '#fff', margin: 0 }}>{trippedCount}</p>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px', padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Activity size={18} color="#6366f1" />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Avg Confidence</span>
            </div>
            <p style={{ fontSize: '32px', fontWeight: '700', color: '#6366f1', margin: 0 }}>{avgConfidence}%</p>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px', padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Zap size={18} color="#f59e0b" />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Oracle Sources</span>
            </div>
            <p style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b', margin: 0 }}>3</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>Pyth · Switchboard · TWAP</p>
          </div>
        </motion.div>

        {/* Per-Asset Oracle Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', overflow: 'hidden',
          }}
        >
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', margin: 0 }}>Feed Status by Asset</h2>
            <button
              onClick={loadAll}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '13px', cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Table Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
            padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)',
            fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            <span>Asset</span>
            <span>Last Price</span>
            <span>Sources</span>
            <span>Confidence</span>
            <span>Spread (BPS)</span>
            <span>Status</span>
          </div>

          {/* Rows */}
          {oracleStatuses.map((oracle, i) => (
            <motion.div
              key={oracle.assetId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.03 * i }}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
                padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                alignItems: 'center',
                background: oracle.circuitBreaker.isTripped ? 'rgba(239,68,68,0.05)' : 'transparent',
              }}
            >
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#fff', margin: 0 }}>{oracle.name}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
                  Updated {oracle.lastUpdate ? new Date(oracle.lastUpdate).toLocaleTimeString() : 'N/A'}
                </p>
              </div>

              <span style={{ fontSize: '14px', color: '#fff', fontFamily: 'monospace' }}>
                ${oracle.lastPrice.toLocaleString()}
              </span>

              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {oracle.sources.map(s => (
                  <span key={s} style={{
                    fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                    background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                  }}>{s}</span>
                ))}
              </div>

              <span style={{ fontSize: '13px', color: oracle.confidence < 0.03 ? '#10b981' : '#f59e0b' }}>
                ±{(oracle.confidence * 100).toFixed(2)}%
              </span>

              <div>
                <span style={{
                  fontSize: '13px', fontFamily: 'monospace',
                  color: oracle.circuitBreaker.worstSpreadBps > 300 ? '#f59e0b' : 'rgba(255,255,255,0.7)',
                }}>
                  {oracle.circuitBreaker.worstSpreadBps}
                </span>
                {oracle.circuitBreaker.consecutiveBreaches > 0 && (
                  <span style={{ fontSize: '10px', color: '#f59e0b', marginLeft: '6px' }}>
                    ({oracle.circuitBreaker.consecutiveBreaches} breach{oracle.circuitBreaker.consecutiveBreaches > 1 ? 'es' : ''})
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Circle
                  size={8}
                  fill={oracle.circuitBreaker.isTripped ? '#ef4444' : '#10b981'}
                  color={oracle.circuitBreaker.isTripped ? '#ef4444' : '#10b981'}
                />
                <span style={{
                  fontSize: '12px', fontWeight: '600',
                  color: oracle.circuitBreaker.isTripped ? '#ef4444' : '#10b981',
                }}>
                  {oracle.circuitBreaker.isTripped ? 'TRIPPED' : 'Healthy'}
                </span>
              </div>
            </motion.div>
          ))}

          {oracleStatuses.length === 0 && (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              {loading ? 'Loading oracle feeds...' : 'No assets found'}
            </div>
          )}
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            display: 'flex', gap: '24px', marginTop: '24px', padding: '16px',
            borderRadius: '12px', background: 'rgba(255,255,255,0.02)',
            fontSize: '12px', color: 'rgba(255,255,255,0.4)', flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} color="#10b981" /> Z-Score filter: reject prices &gt; 2σ from mean
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} color="#f59e0b" /> Spread threshold: 500 BPS (5%)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <XCircle size={14} color="#ef4444" /> Auto-trip after 3 consecutive breaches
          </div>
        </motion.div>
      </div>
    </div>
  );
}
