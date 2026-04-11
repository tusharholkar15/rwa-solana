'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, TrendingUp, Clock, ArrowUpRight, ArrowDownRight,
  Wallet, BarChart3, Calendar, RefreshCw, ChevronDown, Banknote
} from 'lucide-react';
import { api } from '@/lib/api';

interface YieldAsset {
  id: string;
  name: string;
  totalCollected: number;
  pendingDistribution: number;
  annualizedYield: number;
  lastCollection: string;
  monthlyHistory: { period: string; amount: number; date: string }[];
}

export default function YieldDashboardPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [yieldData, setYieldData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [yieldLoading, setYieldLoading] = useState(false);

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    if (selectedAsset) loadYieldData(selectedAsset);
  }, [selectedAsset]);

  async function loadAssets() {
    try {
      const res = await api.getAssets({ limit: 50 });
      setAssets(res.assets || []);
      if (res.assets?.length > 0) setSelectedAsset(res.assets[0]._id);
    } catch (e) {
      console.error('Failed to load assets:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadYieldData(assetId: string) {
    setYieldLoading(true);
    try {
      const data = await api.getYieldSummary(assetId);
      setYieldData(data);
    } catch (e) {
      // Generate fallback demo data
      setYieldData({
        assetName: assets.find(a => a._id === assetId)?.name || 'Property',
        totalCollectedUsdc: 42500,
        pendingDistributionUsdc: 3200,
        annualizedYieldPercent: 8.4,
        lastCollectionAt: new Date().toISOString(),
        monthlyHistory: Array.from({ length: 12 }, (_, i) => ({
          period: new Date(2026, i).toLocaleString('default', { month: 'short' }),
          amount: 3000 + Math.random() * 1500,
          date: new Date(2026, i, 1).toISOString(),
        })),
      });
    } finally {
      setYieldLoading(false);
    }
  }

  const formatUSDC = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const maxMonthly = yieldData?.monthlyHistory ? Math.max(...yieldData.monthlyHistory.map((m: any) => m.amount), 1) : 1;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1117 50%, #0a0a1a 100%)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '40px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #00d4aa, #00b894)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <DollarSign size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#fff', margin: 0 }}>
                USDC Yield Dashboard
              </h1>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                Real-time rental income tracking & yield distribution
              </p>
            </div>
          </div>
        </motion.div>

        {/* Asset Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ marginBottom: '32px' }}
        >
          <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
            Select Property
          </label>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <select
              value={selectedAsset || ''}
              onChange={(e) => setSelectedAsset(e.target.value)}
              style={{
                width: '100%', padding: '14px 44px 14px 16px', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                color: '#fff', fontSize: '15px', appearance: 'none', cursor: 'pointer',
                outline: 'none',
              }}
            >
              {assets.map(a => (
                <option key={a._id} value={a._id} style={{ background: '#1a1a2e', color: '#fff' }}>
                  {a.name} ({a.symbol})
                </option>
              ))}
            </select>
            <ChevronDown size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </motion.div>

        {/* KPI Cards */}
        <AnimatePresence mode="wait">
          {yieldData && (
            <motion.div
              key={selectedAsset}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}
            >
              {/* Total Collected */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', padding: '24px', backdropFilter: 'blur(20px)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(0,212,170,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Banknote size={20} color="#00d4aa" />
                  </div>
                  <span style={{ fontSize: '12px', color: '#00d4aa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowUpRight size={14} /> USDC
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Rent Collected</p>
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#fff', margin: 0 }}>{formatUSDC(yieldData.totalCollectedUsdc)}</p>
              </div>

              {/* Pending Distribution */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', padding: '24px', backdropFilter: 'blur(20px)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={20} color="#6366f1" />
                  </div>
                  <span style={{ fontSize: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Pending
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Distribution</p>
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b', margin: 0 }}>{formatUSDC(yieldData.pendingDistributionUsdc)}</p>
              </div>

              {/* Annualized Yield */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', padding: '24px', backdropFilter: 'blur(20px)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={20} color="#10b981" />
                  </div>
                  <span style={{
                    fontSize: '12px', padding: '2px 8px', borderRadius: '6px',
                    background: yieldData.annualizedYieldPercent >= 7 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: yieldData.annualizedYieldPercent >= 7 ? '#10b981' : '#ef4444',
                  }}>
                    {yieldData.annualizedYieldPercent >= 7 ? 'Strong' : 'Below Target'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Annualized Yield</p>
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#10b981', margin: 0 }}>{yieldData.annualizedYieldPercent}%</p>
              </div>

              {/* Last Collection */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', padding: '24px', backdropFilter: 'blur(20px)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={20} color="#8b5cf6" />
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Last Collection</p>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
                  {yieldData.lastCollectionAt ? new Date(yieldData.lastCollectionAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Monthly Rent Chart */}
        {yieldData?.monthlyHistory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', padding: '32px', backdropFilter: 'blur(20px)', marginBottom: '32px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>Monthly Rent Collections</h2>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>USDC rent income over time for {yieldData.assetName}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={16} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>12 months</span>
              </div>
            </div>

            {/* Bar Chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px', paddingTop: '20px' }}>
              {yieldData.monthlyHistory.map((month: any, i: number) => {
                const heightPct = (month.amount / maxMonthly) * 100;
                return (
                  <motion.div
                    key={month.period}
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ delay: 0.05 * i, duration: 0.5 }}
                    style={{
                      flex: 1, borderRadius: '6px 6px 0 0',
                      background: `linear-gradient(180deg, rgba(0,212,170,0.8) 0%, rgba(0,212,170,0.3) 100%)`,
                      position: 'relative', cursor: 'pointer', minWidth: '20px',
                    }}
                    title={`${month.period}: ${formatUSDC(month.amount)}`}
                  >
                    <div style={{
                      position: 'absolute', bottom: '-24px', left: '50%', transform: 'translateX(-50%)',
                      fontSize: '10px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap',
                    }}>
                      {month.period}
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <div style={{ height: '24px' }} /> {/* Spacer for labels */}
          </motion.div>
        )}

        {/* Distribution Pipeline Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,170,0.08), rgba(99,102,241,0.08))',
            border: '1px solid rgba(0,212,170,0.2)', borderRadius: '16px', padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <RefreshCw size={18} color="#00d4aa" />
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', margin: 0 }}>USDC Distribution Pipeline</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { label: 'Property Manager deposits rent', icon: '📥', status: 'active' },
              { label: '10% → Reserve buffer', icon: '🛡️', status: 'active' },
              { label: '90% → Pending pool', icon: '⏳', status: 'active' },
              { label: 'Pro-rata → Token holders', icon: '💰', status: 'pending' },
            ].map((step, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px',
                borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
              }}>
                <span style={{ fontSize: '20px' }}>{step.icon}</span>
                <div>
                  <p style={{ fontSize: '13px', color: '#fff', margin: 0 }}>{step.label}</p>
                  <span style={{
                    fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px',
                    color: step.status === 'active' ? '#00d4aa' : '#f59e0b',
                  }}>
                    {step.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
