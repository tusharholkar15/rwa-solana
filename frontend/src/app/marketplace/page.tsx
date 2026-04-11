'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  Building2,
  ChevronDown,
  LayoutGrid,
  List,
  Filter,
  X,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Activity,
  Globe,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ASSET_TYPES } from '@/lib/constants';
import InstitutionalAssetCard from '@/components/marketplace/InstitutionalAssetCard';
import LiquidityPoolCard from '@/components/marketplace/LiquidityPoolCard';
import MarketMap from '@/components/marketplace/MarketMap';

export default function MarketplacePage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [solPrice, setSolPrice] = useState(145);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');

  // Mock Market Activity
  const marketActivity = [
    { id: 1, type: 'MINT', msg: 'New Institutional Mint: Austin Resi-Portfolio [+540.2 SOL]', time: '2m ago' },
    { id: 2, type: 'SWAP', msg: 'Large Whale Swap: Miami Industrial v2 [1,200 ASSET]', time: '5m ago' },
    { id: 3, type: 'KYC', msg: 'Tier-1 Institutional Onboarded: [Singapore Capital]', time: '12m ago' },
    { id: 4, type: 'TVL', msg: 'Platform Milestone: Total Value Locked reached $1.24B', time: '1h ago' },
  ];

  useEffect(() => {
    loadAssets();
  }, [typeFilter, sortBy]);

  async function loadAssets() {
    try {
      setLoading(true);
      const res = await api.getAssets({
        type: typeFilter || undefined,
        sortBy,
        search: search || undefined,
        limit: 50, // Fetch more for soft filtering
      });
      setAssets(res.assets);
      setSolPrice(res.solPrice);
    } catch (e) {
      console.error(e);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }

  // Soft filtering for Risk Grade (simulated since not in DB)
  const filteredAssets = useMemo(() => {
    let result = [...assets];
    
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(a => 
        a.name.toLowerCase().includes(s) || 
        a.location?.city.toLowerCase().includes(s) ||
        a.assetType.toLowerCase().includes(s)
      );
    }

    if (riskFilter) {
      // Mocked risk filtering logic
      const riskMap: Record<string, string> = {
        residential: 'A-', commercial: 'A+', industrial: 'B+', 
        land: 'B', 'mixed-use': 'A', hospitality: 'B-',
      };
      result = result.filter(a => {
        const rating = riskMap[a.assetType] || 'A';
        return rating.startsWith(riskFilter);
      });
    }

    return result;
  }, [assets, search, riskFilter]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadAssets();
  }

  return (
    <div className="min-h-screen bg-surface-950 pt-10 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ─── Institutional Header ───────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-3">
              <ShieldCheck size={12} />
              Verified Institutional Assets
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4">
              Market<span className="text-emerald-400">place</span>
            </h1>
            <p className="text-white/40 max-w-lg font-medium">
              Access curated high-yield real estate opportunities tokenized on the Solana blockchain.
            </p>
          </motion.div>

          {/* Stats Bar */}
          <div className="flex items-center gap-8 p-6 institutional-glass bg-white/[0.02]">
            <div>
               <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Live SOL Price</div>
               <div className="text-xl font-display font-bold text-white">${solPrice.toFixed(2)}</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
               <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Platform TVL</div>
               <div className="text-xl font-display font-bold text-emerald-400">$1.24B</div>
            </div>
          </div>
        </div>

        {/* ─── Controls ───────────────────────────────────── */}
        <div className="sticky top-24 z-40 mb-10">
          <div className="p-2 institutional-glass bg-surface-950/80 backdrop-blur-3xl border-white/10 flex flex-col lg:flex-row gap-4 items-center">
            
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 relative w-full lg:w-auto">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by asset name, location, or risk grade..."
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
              />
            </form>

            <div className="flex items-center gap-2 w-full lg:w-auto">
              {/* Type Filter */}
              <div className="relative group w-full lg:w-48">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full appearance-none px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white font-bold text-xs uppercase tracking-widest focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                >
                  <option value="">All Asset Classes</option>
                  {ASSET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label.toUpperCase()}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              </div>

              {/* Risk Filter */}
              <div className="relative group w-full lg:w-32">
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="w-full appearance-none px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white font-bold text-xs uppercase tracking-widest focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                >
                  <option value="">Risk: ALL</option>
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              </div>

              <div className="h-10 w-px bg-white/10 hidden lg:block mx-2" />

              {/* View Toggle */}
              <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white'}`}
                >
                  <List size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'map' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white'}`}
                >
                  <Globe size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Institutional Activity Tape ────────────────── */}
        <div className="mb-10 overflow-hidden relative">
          <div className="flex whitespace-nowrap animate-marquee-slower hover:pause pointer-events-auto [will-change:transform]">
             {[...marketActivity, ...marketActivity].map((act, i) => (
                <div key={i} className="flex items-center gap-3 px-8 text-[10px] font-bold tracking-widest uppercase">
                   <div className={`w-1.5 h-1.5 rounded-full ${act.type === 'MINT' ? 'bg-emerald-500' : act.type === 'SWAP' ? 'bg-indigo-500' : 'bg-amber-500'} shadow-[0_0_8px_currentColor]`} />
                   <span className="text-white/30">{act.type}</span>
                   <span className="text-white">{act.msg}</span>
                   <span className="text-white/10">{act.time}</span>
                </div>
             ))}
          </div>
          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-surface-950 to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-surface-950 to-transparent z-10" />
        </div>

        {/* ─── Results ────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-2 text-white/40 text-sm font-bold">
              <TrendingUp size={14} className="text-emerald-500" />
              Showing {filteredAssets.length} Institutional Assets
           </div>
           <div className="flex items-center gap-4 text-xs font-bold text-white/30 uppercase tracking-widest">
              <span>Sort By:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-white/60 hover:text-white focus:outline-none cursor-pointer"
              >
                <option value="createdAt">Newest Arrival</option>
                <option value="annualYieldBps">Highest Yield</option>
                <option value="pricePerToken">Lowest Price</option>
                <option value="propertyValue">Highest Value</option>
              </select>
           </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="institutional-glass h-96 animate-pulse bg-white/[0.02]" />
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="institutional-glass p-32 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-8">
               <Building2 size={40} className="text-white/10" />
            </div>
            <h3 className="text-2xl font-display font-bold text-white mb-3">No Institutional Assets Found</h3>
            <p className="text-white/40 mb-10 max-w-sm">Try adjusting your filters or contact your account manager for private placement opportunities.</p>
            <button onClick={() => {setSearch(''); setTypeFilter(''); setRiskFilter('');}} className="btn-secondary-institutional">
              Clear All Filters
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === 'map' ? (
              <motion.div
                key="map"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <MarketMap assets={filteredAssets} />
              </motion.div>
            ) : (
              <motion.div
                key={viewMode}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={viewMode === 'grid' ? "grid md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-6"}
              >
                {filteredAssets.map((asset, i) => (
                  <InstitutionalAssetCard 
                    key={asset._id} 
                    asset={asset} 
                    solPrice={solPrice} 
                    index={i} 
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* ─── Secondary Liquidity Pools ──────────────────── */}
        {!loading && filteredAssets.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-32"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-3">
                  <Activity size={12} />
                  AMM Secondary Market
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-black text-white mb-4">
                  Liquidity<span className="text-indigo-400">Pools</span>
                </h2>
                <p className="text-white/40 max-w-lg font-medium">
                  Provide liquidity to earn protocol fees and support 24/7 trading for high-quality real estate tokens.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-6">
                 <div>
                    <div className="text-[9px] text-white/20 uppercase font-bold tracking-widest mb-1">Total Pool TVL</div>
                    <div className="text-lg font-display font-bold text-white">$14.2M</div>
                 </div>
                 <div className="w-px h-8 bg-white/10" />
                 <div>
                    <div className="text-[9px] text-white/20 uppercase font-bold tracking-widest mb-1">Avg. LP APY</div>
                    <div className="text-lg font-display font-bold text-emerald-400">10.4%</div>
                 </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredAssets.slice(0, 3).map((asset, i) => (
                <LiquidityPoolCard key={asset._id} asset={asset} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
