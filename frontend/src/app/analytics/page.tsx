'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, Globe, PieChart, Activity,
  ArrowUpRight, ArrowDownRight, DollarSign, Users, Building2, Zap,
  Target, Layers, ChevronRight, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '@/lib/api';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function AnalyticsPage() {
  const [market, setMarket] = useState<any>(null);
  const [heatMap, setHeatMap] = useState<any[]>([]);
  const [topMovers, setTopMovers] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [marketData, heatData, moversData] = await Promise.all([
        api.getMarketAnalytics(),
        api.getHeatMap(),
        api.getTopMovers(),
      ]);
      setMarket(marketData);
      setHeatMap(heatData.assets || []);
      setTopMovers(moversData);
    } catch (error) {
      console.error('Analytics fetch error:', error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Prepare chart data from heat map
  const yieldData = heatMap
    .sort((a, b) => b.yield - a.yield)
    .slice(0, 10)
    .map(a => ({ name: a.symbol, yield: a.yield, value: a.value / 1e6 }));

  const typeData = market?.typeDistribution
    ? Object.entries(market.typeDistribution).map(([name, value]) => ({ name, value }))
    : [];

  const geoData = heatMap.reduce((acc: any[], a) => {
    const existing = acc.find(x => x.country === a.country);
    if (existing) {
      existing.count += 1;
      existing.totalValue += a.value;
    } else {
      acc.push({ country: a.country, count: 1, totalValue: a.value });
    }
    return acc;
  }, []).sort((a: any, b: any) => b.totalValue - a.totalValue);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <RefreshCw size={32} className="text-emerald-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 pb-20">
      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center">
                  <BarChart3 size={22} className="text-white" />
                </div>
                <h1 className="text-3xl font-display font-bold text-white">Market Analytics</h1>
              </div>
              <p className="text-white/40">Real-time market intelligence across all tokenized assets</p>
            </div>
            <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all">
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
        {/* ─── KPI Cards ───────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Value Locked', value: market?.totalTVLFormatted || '$0', icon: DollarSign, color: 'emerald', change: '+12.4%' },
            { label: 'Tokenized Assets', value: market?.totalTokenizedAssets || 0, icon: Building2, color: 'indigo', change: `${market?.totalTokenizedAssets || 0} active` },
            { label: 'Total Investors', value: market?.totalInvestors?.toLocaleString() || '0', icon: Users, color: 'violet', change: '+340 this month' },
            { label: 'Avg Annual Yield', value: `${market?.averageYieldPercent || 0}%`, icon: TrendingUp, color: 'amber', change: `${market?.averageYieldBps || 0} bps` },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-${kpi.color}-500/10 flex items-center justify-center`}>
                    <Icon size={20} className={`text-${kpi.color}-400`} />
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">{kpi.change}</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">{kpi.value}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider">{kpi.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* ─── SOL Price + Market Sentiment ──────────────── */}
        <div className="grid lg:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-1 p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-indigo-500/5 border border-emerald-500/10">
            <div className="text-xs text-emerald-400 uppercase tracking-wider mb-2 font-bold">SOL / USD</div>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-4xl font-bold text-white">${market?.solPrice?.toFixed(2) || '0.00'}</span>
              <span className={`text-sm font-bold flex items-center gap-1 ${(market?.solChange24h || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(market?.solChange24h || 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(market?.solChange24h || 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${market?.marketSentiment === 'Bullish' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
              <span className="text-sm text-white/50">Market Sentiment: <span className="text-white font-bold">{market?.marketSentiment || 'Neutral'}</span></span>
            </div>
          </motion.div>

          {/* 24h Volume + Top Investors */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-4 font-bold">24h Trading Volume</div>
            <div className="text-3xl font-bold text-white mb-2">{market?.volume24hFormatted || '0 SOL'}</div>
            <div className="text-sm text-white/40">Across all asset pools</div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-4 font-bold">Top Movers</div>
            <div className="space-y-3">
              {topMovers?.gainers?.slice(0, 3).map((m: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-white/70 font-medium">{m.symbol}</span>
                  <span className="text-sm text-emerald-400 font-bold flex items-center gap-1">
                    <ArrowUpRight size={12} /> {m.change > 0 ? '+' : ''}{m.change}%
                  </span>
                </div>
              ))}
              {topMovers?.losers?.slice(0, 2).map((m: any, i: number) => (
                <div key={`l-${i}`} className="flex items-center justify-between">
                  <span className="text-sm text-white/70 font-medium">{m.symbol}</span>
                  <span className="text-sm text-red-400 font-bold flex items-center gap-1">
                    <ArrowDownRight size={12} /> {m.change}%
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ─── Charts Row ──────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Yield Ranking */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Target size={18} className="text-emerald-400" /> Yield Ranking (Annual %)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yieldData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.2)" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} width={65} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  formatter={(value: number) => [`${value}%`, 'Annual Yield']}
                />
                <Bar dataKey="yield" radius={[0, 6, 6, 0]}>
                  {yieldData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Asset Type Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <PieChart size={18} className="text-indigo-400" /> Asset Type Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie>
                <Pie data={typeData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
              </RechartsPie>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* ─── Geographic Distribution ──────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Globe size={18} className="text-violet-400" /> Geographic Distribution
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {geoData.map((g: any, i: number) => (
              <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-center hover:border-emerald-500/30 transition-colors">
                <div className="text-lg font-bold text-white mb-1">{g.country}</div>
                <div className="text-2xl font-bold text-emerald-400">{g.count}</div>
                <div className="text-xs text-white/40 mt-1">assets • ${(g.totalValue / 1e6).toFixed(0)}M TVL</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─── Heat Map Table ───────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Layers size={18} className="text-amber-400" /> Asset Performance Overview
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/5">
                  <th className="text-left py-3 px-4">Asset</th>
                  <th className="text-left py-3 px-2">Type</th>
                  <th className="text-left py-3 px-2">Location</th>
                  <th className="text-right py-3 px-2">Value</th>
                  <th className="text-right py-3 px-2">Yield</th>
                  <th className="text-right py-3 px-2">Trend</th>
                  <th className="text-right py-3 px-2">Investors</th>
                </tr>
              </thead>
              <tbody>
                {heatMap.map((a, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{a.symbol}</div>
                      <div className="text-xs text-white/30 truncate max-w-[200px]">{a.name}</div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-1 rounded-md bg-white/5 text-xs text-white/60 capitalize">{a.type}</span>
                    </td>
                    <td className="py-3 px-2 text-white/50">{a.city}, {a.country}</td>
                    <td className="py-3 px-2 text-right text-white font-medium">${(a.value / 1e6).toFixed(1)}M</td>
                    <td className="py-3 px-2 text-right">
                      <span className="text-emerald-400 font-bold">{a.yield?.toFixed(2)}%</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={`font-bold flex items-center justify-end gap-1 ${a.trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {a.trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(a.trend).toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-white/60">{a.investors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
