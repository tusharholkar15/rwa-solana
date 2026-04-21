'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Briefcase, TrendingUp, TrendingDown, DollarSign, Wallet,
  ArrowUpRight, ArrowDownRight, Building2, ExternalLink,
  ShieldCheck, PieChart as PieIcon, Activity, Clock,
  ChevronRight, AlertCircle, FileText, CheckCircle2,
  Zap, RefreshCcw, List, ArrowRight, Globe,
} from 'lucide-react';
import Link from 'next/link';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  CartesianGrid
} from 'recharts';
import { api } from '@/lib/api';
import { formatCurrency, lamportsToSol, shortenAddress, getAssetTypeBadgeColor } from '@/lib/constants';
import KYCWizard from '@/components/wallet/KYCWizard';
import ReportsModal from '@/components/shared/ReportsModal';
import AuthGate from '@/components/shared/AuthGate';
import { useCurrency } from '@/context/CurrencyContext';

// Mock data for charts
const performanceData = [
  { date: '2026-01', yield: 4200, value: 124000 },
  { date: '2026-02', yield: 4800, value: 128500 },
  { date: '2026-03', yield: 5100, value: 135000 },
  { date: '2026-04', yield: 5400, value: 142000 },
];

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4'];

export default function PortfolioPage() {
  const { formatPrice } = useCurrency();
  const { connected, publicKey } = useWallet();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [solPrice, setSolPrice] = useState(145);
  const [kycStatus, setKycStatus] = useState<string>('not_started');
  const [isKycOpen, setIsKycOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isAutoCompound, setIsAutoCompound] = useState(false);
  const [activeTab, setActiveTab] = useState<'holdings' | 'tax'>('holdings');
  const [taxLots, setTaxLots] = useState<any[]>([]);

  useEffect(() => {
    if (connected && publicKey) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey]);

  async function loadData() {
    try {
      setLoading(true);
      const [portRes, kycRes, taxRes] = await Promise.all([
        api.getPortfolio(publicKey!.toBase58()),
        api.getKycStatus(publicKey!.toBase58()),
        api.getTaxLots(publicKey!.toBase58())
      ]);
      setPortfolio(portRes.portfolio);
      setSolPrice(portRes.solPrice);
      setKycStatus(kycRes.status);
      setTaxLots(taxRes.lots);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleAutoCompound = async (assetId: string, currentEnabled: boolean) => {
    try {
      await api.updateCompoundingPreference(publicKey!.toBase58(), {
        assetId,
        enabled: !currentEnabled
      });
      loadData(); // Refresh portfolio state
    } catch (e) {
      console.error("Failed to update compounding preference:", e);
    }
  };

  const allocationData = useMemo(() => {
    if (!portfolio || !portfolio.holdings.length) return [];
    const types: Record<string, number> = {};
    portfolio.holdings.forEach((h: any) => {
      const type = h.asset?.assetType || 'Other';
      types[type] = (types[type] || 0) + (lamportsToSol(h.shares * (h.asset?.currentPrice || 0)) * solPrice);
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [portfolio, solPrice]);

  const continentData = useMemo(() => {
    if (!portfolio || !portfolio.holdings.length) return [];
    const regions: Record<string, number> = {};
    portfolio.holdings.forEach((h: any) => {
      // Mock continent mapping based on common cities
      const city = h.asset?.location?.city || '';
      const country = h.asset?.location?.country || '';
      let continent = 'Other';
      if (['London', 'Berlin', 'Paris'].includes(city) || country === 'Germany') continent = 'EMEA';
      else if (['New York', 'Miami', 'Austin'].includes(city) || country === 'USA') continent = 'North America';
      else if (['Singapore', 'Tokyo', 'Mumbai', 'Shenzhen'].includes(city)) continent = 'APAC';
      else if (['Sao Paulo', 'Lagos'].includes(city)) continent = 'Emerging Markets';
      
      regions[continent] = (regions[continent] || 0) + (lamportsToSol(h.shares * (h.asset?.currentPrice || 0)) * solPrice);
    });
    return Object.entries(regions).map(([name, value]) => ({ name, value }));
  }, [portfolio, solPrice]);

  if (!connected) {
    return (
      <AuthGate 
        title="Investor Holdings Vault" 
        description="Connect your verified institutional wallet to view your asset allocations, primary market holdings, and yield accrual history."
        icon={<Briefcase size={48} className="text-white/20 group-hover:text-emerald-400 transition-colors" />}
      />
    );
  }

  const totalValue = portfolio ? lamportsToSol(portfolio.totalValue) * solPrice : 0;
  const totalNavValue = portfolio ? lamportsToSol(portfolio.totalNavValue || 0) * solPrice : 0;
  const totalInvested = portfolio ? lamportsToSol(portfolio.totalInvested) * solPrice : 0;
  const unrealizedPnl = totalValue - totalInvested;
  const pnlPercent = totalInvested > 0 ? (unrealizedPnl / totalInvested) * 100 : 0;

  return (
    <div className="min-h-screen bg-surface-950 pb-32 pt-10">
      <div className="max-w-7xl mx-auto px-4 sm:6 lg:px-8">
        
        {/* ─── Institutional Header ───────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Briefcase size={20} className="text-emerald-400" />
               </div>
               <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Portfolio Management Center</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-2">
              Investor<span className="text-emerald-400">Hub</span>
            </h1>
            <div className="flex items-center gap-4 text-sm font-medium">
               <span className="text-white/30">Wallet ID:</span>
               <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/60 font-mono text-xs">
                 {shortenAddress(publicKey!.toBase58(), 6)}
               </span>
               <div className="h-4 w-px bg-white/10 mx-1" />
               <div className={`flex items-center gap-1.5 font-bold uppercase tracking-tighter text-[10px] ${kycStatus === 'verified' ? 'text-emerald-400' : 'text-amber-400'}`}>
                 {kycStatus === 'verified' ? <ShieldCheck size={12} /> : <AlertCircle size={12} />}
                 {kycStatus === 'verified' ? 'Institutional Verified' : 'KYC Required'}
               </div>
            </div>
          </motion.div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsKycOpen(true)}
              className={`btn-institutional !py-2.5 !px-5 text-sm flex items-center gap-2 ${kycStatus === 'verified' ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {kycStatus === 'verified' ? 'KYC Completed' : 'Complete Verification'}
              <ChevronRight size={16} />
            </button>
            <Link 
               href="/oracle"
               className="btn-secondary-institutional !py-2.5 !px-5 text-sm flex items-center gap-2 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5"
            >
              Network Health
              <ShieldCheck size={16} />
            </Link>
            <button 
               onClick={() => setIsReportsOpen(true)}
               className="btn-secondary-institutional !py-2.5 !px-5 text-sm flex items-center gap-2"
            >
              Institutional Reports
              <FileText size={16} />
            </button>
          </div>
        </div>

        {/* ─── High-Level Metrics ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Total Value */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="institutional-glass p-8 bg-white/[0.02]">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <DollarSign size={24} className="text-emerald-400" />
               </div>
               <div className="text-right">
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Market Balance</span>
                  <div className="text-3xl font-display font-black text-white">{formatPrice(totalValue)}</div>
                  {totalNavValue > 0 && (
                     <div className="text-xs font-bold text-indigo-400 mt-1 uppercase tracking-wider flex items-center justify-end gap-1">
                        <Zap size={10} className="animate-[pulse_3s_ease-in-out_infinite]" /> Oracle NAV: {formatPrice(totalNavValue)}
                     </div>
                  )}
               </div>
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-white/5">
               <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Performance</div>
               <div className="flex items-center gap-1 font-bold text-emerald-400">
                  <ArrowUpRight size={14} />
                  <span>+12.4%</span>
               </div>
            </div>
          </motion.div>

          {/* Invested vs P&L */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="institutional-glass p-8 bg-white/[0.02] md:col-span-2">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-8 h-full">
               <div className="flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1 block">Total Principal</span>
                    <div className="text-2xl font-display font-bold text-white">{formatPrice(totalInvested)}</div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between group cursor-pointer" onClick={() => setIsAutoCompound(!isAutoCompound)}>
                    <div>
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1 block group-hover:text-emerald-400 transition-colors">Yield Accrued</span>
                      <div className="text-xl font-display font-bold text-emerald-400">$4,291.50</div>
                    </div>
                    <div className={`p-2 rounded-lg border transition-all cursor-not-allowed ${isAutoCompound ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-white/20'}`}>
                       <RefreshCcw size={14} className={isAutoCompound ? 'animate-spin-slow' : ''} />
                    </div>
                  </div>
               </div>
               <div className="flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1 block">Unrealized Net</span>
                    <div className={`text-2xl font-display font-bold ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {unrealizedPnl >= 0 ? '+' : ''}{formatPrice(unrealizedPnl)}
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                       <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1 block">Yield Strategy</span>
                       <div className="text-sm font-bold text-white uppercase tracking-widest">{isAutoCompound ? 'Auto-Compound' : 'Manual Claim'}</div>
                    </div>
                    {isAutoCompound && (
                       <div className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                          +2.4% APY Boost
                       </div>
                    )}
                  </div>
               </div>
               <div className="hidden lg:flex flex-col justify-center items-center h-full bg-white/[0.03] rounded-2xl border border-white/5 p-4">
                  <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-3">Portfolio Alpha</div>
                  <div className="relative w-20 h-20">
                     <svg className="w-20 h-20 transform -rotate-90">
                        <circle cx="40" cy="40" r="36" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                        <circle cx="40" cy="40" r="36" stroke="#10b981" strokeWidth="6" fill="transparent" strokeDasharray="226" strokeDashoffset="45" strokeLinecap="round" />
                     </svg>
                     <div className="absolute inset-0 flex items-center justify-center font-black text-white text-sm">82%</div>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>

        {/* ─── Visual Analytics ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Main Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="institutional-glass p-8 lg:col-span-2 bg-white/[0.01]">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <Activity size={20} className="text-emerald-400" />
                  <h3 className="font-display font-bold text-xl text-white">Yield Performance</h3>
               </div>
               <div className="flex bg-white/5 rounded-lg p-1 border border-white/10 text-[10px] font-bold text-white/40">
                  <button className="px-3 py-1 rounded-md bg-white/10 text-white">6M</button>
                  <button className="px-3 py-1 hover:text-white">1Y</button>
                  <button className="px-3 py-1 hover:text-white">ALL</button>
               </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.2)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => val.split('-')[1] + ' APR'} 
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.2)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `$${val/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                    labelStyle={{ opacity: 0.4, textTransform: 'uppercase', fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorYield)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Asset Allocation */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="institutional-glass p-8 bg-white/[0.01]">
            <div className="flex items-center gap-3 mb-8">
               <PieIcon size={20} className="text-indigo-400" />
               <h3 className="font-display font-bold text-xl text-white">Asset Allocation</h3>
            </div>
            <div className="h-[240px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData.length ? allocationData : [{ name: 'Empty', value: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    {!allocationData.length && <Cell fill="rgba(255,255,255,0.05)" />}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4 mt-4">
               {allocationData.map((d, i) => (
                 <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                       <span className="text-xs text-white/60 font-bold uppercase tracking-wider">{d.name}</span>
                    </div>
                    <span className="text-xs text-white font-bold">{((d.value/totalValue)*100).toFixed(1)}%</span>
                 </div>
               ))}
               {!allocationData.length && <div className="text-center text-white/20 text-xs font-bold uppercase tracking-widest mt-8">No Holdings to breakdown</div>}
            </div>
          </motion.div>

          {/* New: Global Exposure */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="institutional-glass p-8 bg-white/[0.01]">
            <div className="flex items-center gap-3 mb-8">
               <Globe size={20} className="text-emerald-400" />
               <h3 className="font-display font-bold text-xl text-white">Geographic Exposure</h3>
            </div>
            <div className="h-[240px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={continentData.length ? continentData : [{ name: 'Neutral', value: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {continentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#6366f1', '#f59e0b', '#ec4899'][index % 4]} />
                    ))}
                    {!continentData.length && <Cell fill="rgba(255,255,255,0.05)" />}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4 mt-4">
               {continentData.map((d, i) => (
                 <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#ec4899'][i % 4] }} />
                       <span className="text-xs text-white/60 font-bold uppercase tracking-wider">{d.name}</span>
                    </div>
                    <span className="text-xs text-white font-bold">{((d.value/totalValue)*100).toFixed(1)}%</span>
                 </div>
               ))}
               {!continentData.length && <div className="text-center text-white/20 text-xs font-bold uppercase tracking-widest mt-8">Global nodes unassigned</div>}
            </div>
          </motion.div>
        </div>

        {/* ─── Portfolio Tabs ────────────────────────────── */}
        <div className="flex items-center gap-8 mb-8 border-b border-white/5">
          <button 
            onClick={() => setActiveTab('holdings')}
            className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'holdings' ? 'text-emerald-400' : 'text-white/30 hover:text-white/60'}`}
          >
            Active Holdings
            {activeTab === 'holdings' && <motion.div layoutId="active-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
          </button>
          <button 
            onClick={() => setActiveTab('tax')}
            className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'tax' ? 'text-indigo-400' : 'text-white/30 hover:text-white/60'}`}
          >
            Tax & Accounting (FIFO)
            {activeTab === 'tax' && <motion.div layoutId="active-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'holdings' ? (
            <motion.div 
              key="holdings"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, x: -10 }}
              className="institutional-glass overflow-hidden bg-white/[0.01]"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-display font-bold text-xl text-white flex items-center gap-3">
                  <List size={20} className="text-white/40" />
                  Institutional Holdings
                </h3>
                <div className="flex items-center gap-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      Oracle Priced
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      Positive P&L
                   </div>
                </div>
              </div>
              
              {!portfolio || portfolio.holdings.length === 0 ? (
                <div className="p-24 text-center">
                  <Building2 size={64} className="text-white/5 mx-auto mb-8" />
                  <h4 className="text-2xl font-display font-bold text-white mb-3">Institutional Vault Empty</h4>
                  <p className="text-white/40 mb-10 max-w-sm mx-auto font-medium">Your secondary and primary market holdings will appear here once your account is activated.</p>
                  <Link href="/marketplace" className="btn-institutional inline-flex items-center gap-3">
                    Browse Marketplace <ArrowRight size={20} />
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-[10px] text-white/20 uppercase tracking-[0.25em] font-black">
                        <th className="px-8 py-6">Asset Specification</th>
                        <th className="px-8 py-6">Holdings</th>
                        <th className="px-8 py-6">Market Value</th>
                        <th className="px-8 py-6">Oracle NAV Diff</th>
                        <th className="px-8 py-6">Performance</th>
                        <th className="px-8 py-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {portfolio.holdings.map((h: any, i: number) => {
                        const currentVal = lamportsToSol(h.currentValue || 0) * solPrice;
                        const unitPrice = lamportsToSol(h.asset?.currentPrice || 0) * solPrice;
                        const navUnitPrice = lamportsToSol(h.asset?.navPrice || 0) * solPrice;
                        const premiumDiscount = navUnitPrice > 0 && unitPrice !== navUnitPrice ? ((unitPrice - navUnitPrice) / navUnitPrice) * 100 : 0;

                        const invested = lamportsToSol(h.totalInvested || 0) * solPrice;
                        const pnl = currentVal - invested;
                        const pnlPct = h.pnlPercentage || 0;
                        return (
                          <tr key={i} className="hover:bg-white/[0.03] transition-all duration-300 group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                  <Building2 size={24} className="text-white/40 group-hover:text-emerald-400" />
                                </div>
                                <div>
                                   <div className="flex items-center gap-2 mb-1">
                                      <span className="font-display font-bold text-white group-hover:text-emerald-400 transition-colors">
                                        {h.asset?.name || 'Unknown'}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider ${getAssetTypeBadgeColor(h.asset?.assetType)}`}>
                                         {h.asset?.assetType}
                                      </span>
                                   </div>
                                   <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest flex items-center gap-2">
                                     {h.asset?.symbol} • <span className="opacity-50">#{h._id?.substring(18) || i}</span>
                                   </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                                <div className="text-sm font-bold text-white">{h.shares.toLocaleString()}</div>
                                <div className={`flex items-center gap-1.5 mt-1 text-[10px] font-black uppercase tracking-tighter ${h.autoCompoundEnabled ? 'text-emerald-400' : 'text-white/20'}`}>
                                  <RefreshCcw size={10} className={h.autoCompoundEnabled ? 'animate-spin-slow' : ''} />
                                  {h.autoCompoundEnabled ? 'Auto-Compounding' : 'Sync Paused'}
                                  <button onClick={() => handleToggleAutoCompound(h.assetId, h.autoCompoundEnabled)} className="ml-1 hover:text-white underline decoration-white/20">Change</button>
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                <div className="text-sm font-bold text-white">{formatCurrency(unitPrice)}</div>
                                <div className="flex items-center gap-1.5 mt-1">
                                   <div className={`w-1.5 h-1.5 rounded-full ${h.asset?.circuitBreaker?.isTripped ? 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'}`} />
                                   <span className={`text-[9px] font-black uppercase tracking-widest ${h.asset?.circuitBreaker?.isTripped ? 'text-rose-400' : 'text-emerald-400/60'}`}>
                                      {h.asset?.circuitBreaker?.isTripped ? 'Breaker Tripped' : 'Price Protection Active'}
                                   </span>
                                </div>
                                <div className="text-sm font-display font-black text-white mt-2">{formatCurrency(currentVal)}</div>
                                <div className="text-[10px] text-emerald-400/60 font-bold uppercase tracking-tight">Total Market Value</div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="text-sm font-bold text-indigo-400">{formatCurrency(navUnitPrice)}</div>
                               {premiumDiscount !== 0 ? (
                                 <div className={`text-[10px] font-bold mt-1 uppercase tracking-tight ${premiumDiscount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                   {premiumDiscount > 0 ? '+' : ''}{premiumDiscount.toFixed(2)}% {premiumDiscount > 0 ? 'Premium' : 'Discount'}
                                 </div>
                               ) : (
                                 <div className="text-[10px] text-white/30 font-bold mt-1 uppercase tracking-tight">At Parity</div>
                               )}
                            </td>
                            <td className="px-8 py-6">
                              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-xs ${pnl >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                {pnl >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {pnlPct.toFixed(1)}%
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <Link href={`/asset/${h.assetId}`} className="inline-flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] hover:text-white transition-colors">
                                 View Docs
                                 <ExternalLink size={12} />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="tax"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, x: 10 }}
              className="space-y-8"
            >
              <div className="institutional-glass p-10 bg-indigo-500/5 border-indigo-500/20">
                 <div className="flex items-center gap-4 mb-4">
                    <ShieldCheck className="text-indigo-400" />
                    <h3 className="text-2xl font-display font-bold text-white">Institutional FIFO Ledger</h3>
                 </div>
                 <p className="text-white/40 text-sm max-w-2xl leading-relaxed">
                   Comprehensive lot-level tracking for capital gains calculations. This ledger follows the 
                   <span className="text-white"> First-In-First-Out (FIFO)</span> methodology to determine cost basis 
                   for each individual share held in your institutional vault.
                 </p>
              </div>

              <div className="institutional-glass overflow-hidden bg-white/[0.01]">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[10px] text-white/20 uppercase tracking-[0.25em] font-black border-b border-white/5">
                      <th className="px-8 py-6">Date Acquired</th>
                      <th className="px-8 py-6">Asset Specification</th>
                      <th className="px-8 py-6">Lot Size</th>
                      <th className="px-8 py-6">Cost Basis (Unit)</th>
                      <th className="px-8 py-6">Holding Period</th>
                      <th className="px-8 py-6 text-right">Unrealized P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-xs">
                    {taxLots.map((lot: any, i: number) => {
                      const isLongTerm = lot.holdingPeriodDays > 365;
                      return (
                        <tr key={i} className="hover:bg-white/[0.03] transition-all">
                          <td className="px-8 py-6 text-white/60">
                            {new Date(lot.purchaseDate).toLocaleDateString()}
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-2">
                                <span className="font-bold text-white uppercase">{lot.assetId?.symbol}</span>
                                <span className="text-[10px] text-white/20">#{lot._id?.substring(18) || i}</span>
                             </div>
                          </td>
                          <td className="px-8 py-6 text-white font-bold">
                            {lot.sharesRemaining.toLocaleString()} units
                          </td>
                          <td className="px-8 py-6 text-white/80">
                            {formatCurrency(lamportsToSol(lot.purchasePrice) * solPrice)}
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${isLongTerm ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                              {lot.holdingPeriodDays}d ({isLongTerm ? 'Long Term' : 'Short Term'})
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right font-bold">
                            <div className={lot.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                               {lot.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(lot.unrealizedPnlUsd)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {taxLots.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-8 py-24 text-center text-white/20 uppercase tracking-widest font-black">
                           No recorded tax lots in vault
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <KYCWizard 
        isOpen={isKycOpen} 
        onClose={() => setIsKycOpen(false)} 
        walletAddress={publicKey?.toBase58() || ''}
        onSuccess={loadData}
      />

      <ReportsModal 
        isOpen={isReportsOpen} 
        onClose={() => setIsReportsOpen(false)}
      />
    </div>
  );
}
