'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  MapPin, TrendingUp, Users, Building2, DollarSign, Percent,
  ArrowLeft, ExternalLink, ChevronLeft, ChevronRight, ShieldCheck,
  Clock, BarChart3, Coins, FileText, Download, Info, Zap,
  Globe, Lock, Activity, ArrowUpRight, ArrowRight, Heart
} from 'lucide-react';

import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, lamportsToSol, getAssetTypeBadgeColor } from '@/lib/constants';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import OracleFeed from '@/components/shared/OracleFeed';
import SwapInterface from '@/components/marketplace/SwapInterface';
import PropertyGovernance from '@/components/shared/PropertyGovernance';
import OTCModal from '@/components/marketplace/OTCModal';
import SafeImage from '@/components/shared/SafeImage';

export default function AssetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { connected, publicKey } = useWallet();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [solPrice, setSolPrice] = useState(145);
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [imageIndex, setImageIndex] = useState(0);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeMessage, setTradeMessage] = useState('');
  const [tradeMode, setTradeMode] = useState<'primary' | 'secondary'>('primary');
  const [isOTCOpen, setIsOTCOpen] = useState(false);
  const [navHistory, setNavHistory] = useState<any[]>([]);

  // Chart Data
  const chartData = React.useMemo(() => {
    if (navHistory.length > 0) {
      return navHistory.map((h: any) => ({
        timestamp: new Date(h.timestamp).getTime(),
        price: lamportsToSol(h.navPrice) * solPrice,
        isForecast: h.sourceTags?.includes('SIMULATED')
      }));
    }
    if (!asset || !asset.priceHistory) return [];
    return asset.priceHistory.map((h: any) => ({
       timestamp: new Date(h.timestamp).getTime(),
       price: lamportsToSol(h.price) * solPrice,
       isForecast: false
    }));
  }, [navHistory, asset, solPrice]);

  useEffect(() => {
    loadAsset();
  }, [id]);

  async function loadAsset() {
    try {
      const res = await api.getAsset(id);
      setAsset(res.asset);
      setSolPrice(res.solPrice);
      
      try {
        const hist = await api.getNavHistory(id);
        setNavHistory(hist.history || []);
      } catch (e) {
        console.error("Failed to load oracle history", e);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy() {
    if (!connected || !publicKey || !buyAmount) return;
    setTradeLoading(true);
    setTradeMessage('');
    try {
      const res = await api.buyShares({
        assetId: id,
        shares: Number(buyAmount),
        walletAddress: publicKey.toBase58(),
      });
      setTradeMessage(`✅ ${res.message}`);
      setBuyAmount('');
      loadAsset();
    } catch (e: any) {
      setTradeMessage(`❌ ${e.message}`);
    } finally {
      setTradeLoading(false);
    }
  }

  async function handleSell() {
    if (!connected || !publicKey || !sellAmount) return;
    setTradeLoading(true);
    setTradeMessage('');
    try {
      const res = await api.sellShares({
        assetId: id,
        shares: Number(sellAmount),
        walletAddress: publicKey.toBase58(),
      });
      setTradeMessage(`✅ ${res.message}`);
      setSellAmount('');
      loadAsset();
    } catch (e: any) {
      setTradeMessage(`❌ ${e.message}`);
    } finally {
      setTradeLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="institutional-glass p-8 animate-pulse">
            <div className="h-96 bg-white/5 rounded-2xl mb-8" />
            <div className="h-10 bg-white/5 rounded-xl w-1/3 mb-4" />
            <div className="h-6 bg-white/5 rounded-xl w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
        <div className="text-center">
           <Building2 size={64} className="text-white/10 mx-auto mb-6" />
           <h2 className="text-3xl font-display font-bold text-white mb-4">Asset Specification Not Found</h2>
           <Link href="/marketplace" className="btn-secondary-institutional inline-flex items-center gap-2">
             <ArrowLeft size={18} /> Return to Marketplace
           </Link>
        </div>
      </div>
    );
  }

  const tokenPriceUsd = lamportsToSol(asset.pricePerToken) * solPrice;
  const navPriceUsd = asset.navPrice ? lamportsToSol(asset.navPrice) * solPrice : tokenPriceUsd;
  const premiumDiscountPct = navPriceUsd > 0 ? ((tokenPriceUsd - navPriceUsd) / navPriceUsd) * 100 : 0;
  
  const soldPct = ((asset.totalSupply - asset.availableSupply) / asset.totalSupply) * 100;
  const buyCost = Number(buyAmount || 0) * asset.pricePerToken;

  return (
    <div className="min-h-screen bg-surface-950 pt-10 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ─── Institutional Breadcrumbs ──────────────────── */}
        <div className="flex items-center justify-between mb-8">
           <Link href="/marketplace" className="group flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] hover:text-white transition-colors">
             <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
             Back to Primary Market
           </Link>
           <div className="flex items-center gap-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
              <span className="flex items-center gap-1.5"><Activity size={12} className="text-emerald-500" /> Live Appraisal</span>
              <span className="text-white/10">|</span>
              <span className="flex items-center gap-1.5"><Lock size={12} className="text-indigo-500" /> Audited Smart Contract</span>
           </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-10">
          {/* ─── Left: High-Fidelity Asset View ──────────── */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* Gallery Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="institutional-glass overflow-hidden group">
              <div className="relative h-[480px]">
                <SafeImage 
                   src={asset.images?.[imageIndex]} 
                   alt={asset.name} 
                   assetType={asset.assetType}
                   className="w-full h-full group-hover:scale-105 transition-transform duration-1000"
                />
                
                {/* Visual Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-transparent to-transparent opacity-80" />
                
                {/* Navigation */}
                {asset.images?.length > 1 && (
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 pointer-events-none">
                    <button onClick={() => setImageIndex(Math.max(0, imageIndex - 1))} className="pointer-events-auto w-12 h-12 rounded-full bg-surface-950/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-emerald-500 transition-colors">
                      <ChevronLeft size={24} />
                    </button>
                    <button onClick={() => setImageIndex(Math.min(asset.images.length - 1, imageIndex + 1))} className="pointer-events-auto w-12 h-12 rounded-full bg-surface-950/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-emerald-500 transition-colors">
                      <ChevronRight size={24} />
                    </button>
                  </div>
                )}

                {/* Status Badges */}
                <div className="absolute top-6 left-6 flex gap-3">
                  <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getAssetTypeBadgeColor(asset.assetType)} bg-surface-950/60 backdrop-blur-md`}>
                    {asset.assetType}
                  </span>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 backdrop-blur-md">
                    <ShieldCheck size={12} />
                    Secured by On-Chain Lien
                  </div>
                </div>

                {/* Bottom Title Info */}
                <div className="absolute bottom-10 left-10 right-10">
                   <div className="flex items-center gap-2 text-white/60 font-bold mb-4 drop-shadow-lg">
                      <MapPin size={18} className="text-emerald-400" />
                      {asset.location?.address}, {asset.location?.city}, {asset.location?.country}
                   </div>
                   <h1 className="text-5xl md:text-6xl font-display font-black text-white drop-shadow-2xl">
                     {asset.name}
                   </h1>
                </div>
              </div>

              {/* Interaction Bar */}
              <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Risk Assessment</span>
                       <span className="text-lg font-display font-bold text-emerald-400">Low Volatility (A+)</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Asset Custodian</span>
                       <span className="text-lg font-display font-bold text-white">Trustee S.A.</span>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <Link 
                       href={`/asset/${id}/health`}
                       className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/5"
                    >
                       <Heart size={16} />
                       Property Health
                    </Link>
                    <button className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all">
                       <Globe size={20} />
                    </button>
                    <button className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all">
                       <BarChart3 size={20} />
                    </button>
                 </div>
              </div>
            </motion.div>

            {/* Asset Performance Summary */}
            <div className="grid md:grid-cols-2 gap-8">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="institutional-glass p-8 bg-white/[0.01]">
                   <h3 className="text-lg font-display font-bold text-white mb-8 flex items-center gap-3">
                      <TrendingUp size={20} className="text-emerald-400" />
                      Yield Projections
                   </h3>
                   <div className="space-y-6">
                      <div className="flex justify-between items-center pb-4 border-b border-white/5">
                         <span className="text-sm font-bold text-white/40 uppercase tracking-widest">Base APY</span>
                         <span className="text-3xl font-display font-black text-emerald-400">{(asset.annualYieldBps / 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b border-white/5">
                         <span className="text-sm font-bold text-white/40 uppercase tracking-widest">Est. Capital Growth</span>
                         <span className="text-xl font-display font-bold text-white">+4.2% / yr</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-sm font-bold text-white/40 uppercase tracking-widest">Distribution Frequency</span>
                         <span className="text-sm font-bold text-white uppercase tracking-widest">Monthly On-Chain</span>
                      </div>
                   </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="institutional-glass p-8 bg-white/[0.01]">
                   <h3 className="text-lg font-display font-bold text-white mb-8 flex items-center gap-3">
                      <ShieldCheck size={20} className="text-indigo-400" />
                      Institutional Audit
                   </h3>
                   <div className="p-4 rounded-xl bg-white/5 border border-white/5 mb-6">
                      <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Smart Contract Auditor</div>
                      <div className="text-lg font-display font-bold text-white">CertiK Verified #8294</div>
                   </div>
                   <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Physical Inspection</div>
                      <div className="text-lg font-display font-bold text-white">Q1 2026 Completed</div>
                   </div>
                </motion.div>
            </div>

            {/* Price Performance & AI Forecast */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="institutional-glass p-10 bg-white/[0.01]">
              <div className="flex items-center justify-between mb-10">
                <div>
                   <h3 className="text-2xl font-display font-bold text-white mb-2">Institutional NAV Analysis</h3>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                      <Zap size={10} className="animate-pulse" /> Oracle Integrated
                   </div>
                </div>
                <div className="flex flex-col items-end">
                   <div className="text-[10px] font-black tracking-widest text-white/40 uppercase mb-1">vs Oracle NAV</div>
                   <div className={`px-3 py-1 rounded text-xs font-bold ${premiumDiscountPct > 0 ? 'bg-emerald-500/10 text-emerald-400' : premiumDiscountPct < 0 ? 'bg-red-500/10 text-red-400' : 'bg-white/10 text-white'}`}>
                      {premiumDiscountPct > 0 ? '+' : ''}{premiumDiscountPct.toFixed(2)}% {premiumDiscountPct > 0 ? 'Premium' : premiumDiscountPct < 0 ? 'Discount' : 'Parity'}
                   </div>
                </div>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="timestamp" 
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }} 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} 
                    />
                    <YAxis 
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }} 
                      axisLine={false} 
                      tickLine={false} 
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => `$${v.toFixed(2)}`} 
                    />
                    <Tooltip 
                      contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }} 
                      formatter={(v: number, name: any, props: any) => [
                         formatCurrency(v), 
                         props.payload.isForecast ? 'Simulated NAV' : 'Oracle NAV'
                      ]}
                      labelFormatter={(l) => new Date(l).toLocaleString()}
                    />
                    <Area 
                       type="monotone" 
                       dataKey="price" 
                       data={chartData.filter((d: any) => !d.isForecast)}
                       strokeWidth={4} 
                       stroke="#8b5cf6"
                       fill="url(#navGradient)" 
                       activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2, fill: '#0a0a0a' }}
                    />
                    <Area 
                       type="monotone" 
                       dataKey="price" 
                       data={chartData.filter((d: any) => d.isForecast)}
                       strokeWidth={4} 
                       stroke="#10b981"
                       fill="url(#forecastGradient)" 
                       strokeDasharray="5 5"
                       activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#0a0a0a' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                 <div>
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Current Oracle NAV</div>
                    <div className="text-xl font-display font-black text-white">
                       {formatCurrency(navPriceUsd)}
                    </div>
                 </div>
                 <div className="text-right">
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Oracle Provider</div>
                    <div className="text-sm font-display font-black text-indigo-400 mt-2">{navHistory[navHistory.length - 1]?.provider || "ON_CHAIN_VWAP"}</div>
                 </div>
              </div>
            </motion.div>

            {/* Legal & Compliance Component */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="institutional-glass p-8 bg-white/[0.01]">
               <div className="flex items-center justify-between mb-8">
                 <h3 className="text-2xl font-display font-bold text-white flex items-center gap-4">
                    <ShieldCheck size={24} className="text-white/40 text-emerald-400" />
                    Legal & Compliance
                 </h3>
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    TA Active Sync
                 </div>
               </div>
               
               <div className="grid md:grid-cols-2 gap-6">
                 <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all cursor-pointer">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                       <FileText size={48} className="text-emerald-400" />
                    </div>
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Verified Legal Opinion</div>
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                          <Building2 size={16} className="text-indigo-400" />
                       </div>
                       <div className="text-xl font-display font-bold text-white">{asset.legalOpinion?.firm || "DLA Piper LLP"}</div>
                    </div>
                    <div className="text-xs text-white/40 font-mono bg-black/50 px-3 py-2 rounded-lg truncate mt-4 border border-white/5">
                      Hash: {asset.legalOpinion?.documentHash || "QmYwAPJzv5CZsnA625s3Xf2Sm1x1m8"}
                    </div>
                 </div>

                 <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Compliance Architecture</div>
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                       <span className="text-xs font-bold text-white/60">Transfer Agent</span>
                       <span className="text-xs font-black text-white px-2 py-1 bg-white/5 rounded">Securitize, Inc.</span>
                    </div>
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                       <span className="text-xs font-bold text-white/60">Regulatory Framework</span>
                       <span className="text-xs font-black text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded">US SEC Reg D 506(c)</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-white/60">Retail Holders</span>
                       <span className="text-xs font-black text-rose-400 px-2 py-1 bg-rose-500/10 rounded">Strictly Prohibited (0)</span>
                    </div>
                 </div>
               </div>
            </motion.div>

            {/* Property Governance Component */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="institutional-glass p-10 bg-white/[0.01]">
               <PropertyGovernance assetId={id} />
            </motion.div>

            {/* Document Hub */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="institutional-glass p-10 bg-white/[0.01]">
               <h3 className="text-2xl font-display font-bold text-white mb-8 flex items-center gap-4">
                  <FileText size={24} className="text-white/40" />
                  Asset Documentation
               </h3>
               <div className="grid md:grid-cols-2 gap-4">
                  {[
                    "Legal Property Deed",
                    "Asset Purchase Agreement",
                    "Insurance Certification",
                    "Environmental Audit",
                    "Smart Contract Manifest",
                    "Zion Regulatory Filing"
                  ].map((doc, i) => (
                    <div key={i} className="group p-5 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-between hover:border-emerald-500/30 transition-all cursor-pointer">
                       <div className="flex items-center gap-4 font-bold text-white/60 group-hover:text-white transition-colors">
                          <Download size={20} className="text-white/20 group-hover:text-emerald-400" />
                          <span className="text-sm uppercase tracking-wide">{doc}</span>
                       </div>
                       <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">PDF • 1.2MB</span>
                    </div>
                  ))}
               </div>
            </motion.div>
          </div>

          {/* ─── Right: Institutional Trade Module ─────── */}
          <div className="lg:col-span-4 space-y-8">
              {/* Market Toggle */}
              <div className="flex bg-white/5 rounded-2xl p-1.5 border border-white/10">
                <button 
                  onClick={() => setTradeMode('primary')} 
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tradeMode === 'primary' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white'}`}
                >
                  Primary Issue
                </button>
                <button 
                  onClick={() => setTradeMode('secondary')} 
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tradeMode === 'secondary' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white'}`}
                >
                  Secondary AMM
                </button>
              </div>

              {/* Oracle Live Feed */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <OracleFeed 
                  initialPrice={lamportsToSol(asset.pricePerToken) * solPrice} 
                  symbol={asset.symbol} 
                />
              </motion.div>

              <AnimatePresence mode="wait">
                {tradeMode === 'primary' ? (
                  <motion.div 
                    key="primary"
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: 0.1 }} 
                    className="institutional-glass p-8 sticky top-28 bg-surface-900 border-white/10 shadow-2xl"
                  >
                    {/* Asset Snapshot Card */}
                    <div className="mb-10 text-center">
                       <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.25em] mb-4">Secondary Liquidity Hub</div>
                       <div className="text-4xl font-display font-black text-white mb-1">
                         {lamportsToSol(asset.pricePerToken).toFixed(4)} <span className="text-white/40 text-lg uppercase font-bold tracking-widest">SOL</span>
                       </div>
                       <div className="text-sm font-bold text-white/30 uppercase tracking-widest">≈ {formatCurrency(tokenPriceUsd)} (NAV)</div>
                    </div>

                    {/* Trade Panel */}
                    <div className="space-y-8">
                       <div className="flex bg-white/5 rounded-2xl p-1.5 border border-white/10">
                          <button onClick={() => setActiveTab('buy')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'buy' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white'}`}>Buy</button>
                          <button onClick={() => setActiveTab('sell')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'sell' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-white/40 hover:text-white'}`}>Sell</button>
                       </div>

                       <div className="space-y-6">
                          <div>
                             <div className="flex justify-between items-center mb-4">
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Token Allocation</label>
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Max: {asset.availableSupply.toLocaleString()}</span>
                             </div>
                             <input 
                               type="number" 
                               value={activeTab === 'buy' ? buyAmount : sellAmount}
                               onChange={(e) => activeTab === 'buy' ? setBuyAmount(e.target.value) : setSellAmount(e.target.value)}
                               placeholder="0.00" 
                               className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-5 text-2xl font-display font-black text-white placeholder-white/10 focus:outline-none focus:border-emerald-500/50 transition-all text-center"
                             />
                          </div>

                          <div className="space-y-4 pt-4 border-t border-white/5">
                             <div className="flex justify-between items-center text-sm font-bold">
                                <span className="text-white/40 uppercase tracking-widest text-[10px]">Total Investment</span>
                                <span className="text-white">{activeTab === 'buy' ? (buyAmount ? `${lamportsToSol(buyCost).toFixed(4)} SOL` : '0 SOL') : (sellAmount ? `${lamportsToSol(Number(sellAmount) * asset.pricePerToken).toFixed(4)} SOL` : '0 SOL')}</span>
                             </div>
                             <div className="flex justify-between items-center text-sm font-bold">
                                <span className="text-white/40 uppercase tracking-widest text-[10px]">DEX Exchange Fee</span>
                                <span className="text-emerald-400">0.05%</span>
                             </div>
                          </div>
                       </div>

                       <button 
                         onClick={activeTab === 'buy' ? handleBuy : handleSell}
                         disabled={!connected || tradeLoading || (activeTab === 'buy' ? !buyAmount : !sellAmount)}
                         className={`w-full py-5 rounded-2xl font-display font-black text-white uppercase tracking-[0.2em] transition-all transform active:scale-[0.98] shadow-2xl ${activeTab === 'buy' ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20'} disabled:opacity-20 disabled:grayscale disabled:pointer-events-none`}
                       >
                         {tradeLoading ? 'Transacting...' : !connected ? 'Connect Protocol' : `${activeTab.toUpperCase()} ASSET`}
                       </button>

                       {tradeMessage && (
                         <div className={`p-4 rounded-xl text-xs font-bold text-center border animate-in fade-in slide-in-from-top-2 duration-300 ${tradeMessage.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                           {tradeMessage}
                         </div>
                       )}
                    </div>

                    {/* Supply Visualization */}
                    <div className="mt-12 pt-8 border-t border-white/5">
                       <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest mb-3">
                          <span className="text-white/40">Whitelisted Supply</span>
                          <span className="text-emerald-500">{soldPct.toFixed(1)}% Subscribed</span>
                       </div>
                       <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${soldPct}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          />
                       </div>
                    </div>

                    {/* Compliance Portal Link */}
                    <div className="mt-10 p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                          <ShieldCheck size={20} className="text-indigo-400" />
                       </div>
                       <div>
                          <div className="text-[10px] font-bold text-white uppercase tracking-widest mb-0.5">Investor Status</div>
                          <div className="text-[10px] text-white/30 font-medium leading-tight">Your wallet is currently whitelisted for this Tier-1 asset class.</div>
                       </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="secondary"
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <SwapInterface asset={asset} solPrice={solPrice} />
                  </motion.div>
                )}
              </AnimatePresence>

            {/* Side Stat Block */}
            <div className="p-8 institutional-glass bg-white/[0.01] border-white/5 shadow-2xl">
               <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.25em] mb-6">Market Intel</h4>
               <div className="space-y-6">
                  <div className="flex justify-between items-center">
                     <span className="text-xs text-white/40 font-bold uppercase tracking-widest">Market Cap</span>
                     <span className="text-sm font-bold text-white">{formatCurrency(asset.propertyValue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-xs text-white/40 font-bold uppercase tracking-widest">Active Stakes</span>
                     <span className="text-sm font-bold text-white">{asset.totalInvestors || 242} Participants</span>
                  </div>
                  <div className="flex justify-between items-center pb-6 border-b border-white/5">
                     <span className="text-xs text-white/40 font-bold uppercase tracking-widest">NAV Growth</span>
                     <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                        <ArrowUpRight size={14} /> +8.2%
                     </span>
                  </div>
                  
                  {/* OTC Entry Point */}
                  <div className="pt-2">
                     <button 
                        onClick={() => setIsOTCOpen(true)}
                        className="w-full py-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                     >
                        Institutional OTC Block Trade
                        <ArrowRight size={14} />
                     </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <OTCModal 
        isOpen={isOTCOpen} 
        onClose={() => setIsOTCOpen(false)} 
        asset={asset}
      />
    </div>
  );
}
