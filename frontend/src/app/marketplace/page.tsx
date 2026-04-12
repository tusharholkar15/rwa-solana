'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Building2,
  ChevronDown,
  LayoutGrid,
  List,
  TrendingUp,
  ShieldCheck,
  Activity,
  Globe,
  MapPin,
  Users,
  ArrowUpRight,
} from 'lucide-react';
import { Grid } from 'react-window';
import { api } from '@/lib/api';
import { ASSET_TYPES } from '@/lib/constants';
import { useWindowSize } from '@/hooks/useWindowSize';
import InstitutionalAssetCard from '@/components/marketplace/InstitutionalAssetCard';
import LiquidityPoolCard from '@/components/marketplace/LiquidityPoolCard';
import MarketMap from '@/components/marketplace/MarketMap';
import InstitutionalSkeleton from '@/components/marketplace/InstitutionalSkeleton';
import { useRealtime } from '@/context/RealtimeContext';

interface GridCellData {
  assets: any[];
  solPrice: number;
  gridConfig: {
    cols: number;
    gutter: number;
  };
}

/**
 * Stable Cell component defined outside of the parent to prevent unmount/remount cycles.
 * react-window v2 handles internal memoization via cellProps diffing — no React.memo needed.
 */
function GridCell({ columnIndex, rowIndex, style, assets, solPrice, gridConfig }: any) {
  const assetIndex = rowIndex * gridConfig.cols + columnIndex;
  const asset = assets[assetIndex];

  if (!asset) return null;

  return (
    <div style={{
      ...style,
      paddingLeft: columnIndex === 0 ? 0 : gridConfig.gutter / 2,
      paddingRight: columnIndex === gridConfig.cols - 1 ? 0 : gridConfig.gutter / 2,
      paddingBottom: gridConfig.gutter,
    }}>
      <InstitutionalAssetCard 
        asset={asset} 
        solPrice={solPrice} 
        index={assetIndex} 
      />
    </div>
  );
}

export default function MarketplacePage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [solPrice, setSolPrice] = useState(145);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const { width: windowWidth } = useWindowSize();
  const { marketEvents } = useRealtime();

  // Mock initial activity, will be prepended by live events
  const [liveEvents, setLiveEvents] = useState([
    { id: 1, type: 'MINT', msg: 'New Institutional Mint: Austin Resi-Portfolio [+540.2 SOL]', time: '2m ago' },
    { id: 2, type: 'SWAP', msg: 'Large Whale Swap: Miami Industrial v2 [1,200 ASSET]', time: '5m ago' },
  ]);

  useEffect(() => {
    if (marketEvents.length > 0) {
      setLiveEvents(prev => [...marketEvents, ...prev].slice(0, 10));
    }
  }, [marketEvents]);

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
        limit: 200, 
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

  const GRID_CONFIG = useMemo(() => {
    if (!windowWidth) return { cols: 1, width: 350, gutter: 16 };
    const containerWidth = Math.min(windowWidth - 64, 1280); 
    if (windowWidth >= 1024) return { cols: 3, width: containerWidth / 3, gutter: 32 };
    if (windowWidth >= 768) return { cols: 2, width: containerWidth / 2, gutter: 24 };
    return { cols: 1, width: containerWidth, gutter: 16 };
  }, [windowWidth]);


  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadAssets();
  }

  return (
    <div className="min-h-screen bg-surface-950 pt-10 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
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
            <div className="w-px h-10 bg-white/10 hidden xl:block" />
            <div className="hidden xl:block min-w-[300px]">
               <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
                 <Activity size={10} className="text-emerald-400 animate-pulse" />
                 Institutional Activity
               </div>
               <div className="h-8 overflow-hidden relative">
                 <AnimatePresence mode="popLayout">
                   {liveEvents.slice(0, 1).map((event) => (
                     <motion.div
                       key={event.id}
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -20 }}
                       className="text-[11px] font-bold text-white/70 truncate flex items-center gap-2"
                     >
                       <span className={`px-1.5 py-0.5 rounded-[3px] text-[8px] ${
                         event.type === 'MINT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                       }`}>
                         {event.type}
                       </span>
                       {event.msg}
                     </motion.div>
                   ))}
                 </AnimatePresence>
               </div>
            </div>
          </div>
        </div>

        <div className="sticky top-24 z-40 mb-10">
          <div className="p-2 institutional-glass bg-surface-950/80 backdrop-blur-3xl border-white/10 flex flex-col lg:flex-row gap-4 items-center">
            
            <form onSubmit={handleSearch} className="flex-1 relative w-full lg:w-auto">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assets..."
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
              />
            </form>

            <div className="flex items-center gap-2 w-full lg:w-auto">
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

              <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-emerald-500 text-white' : 'text-white/40'}`}>
                  <LayoutGrid size={18} />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-emerald-500 text-white' : 'text-white/40'}`}>
                  <List size={18} />
                </button>
                <button onClick={() => setViewMode('map')} className={`p-2 rounded-lg ${viewMode === 'map' ? 'bg-emerald-500 text-white' : 'text-white/40'}`}>
                  <Globe size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

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
                className="bg-transparent text-white/60 focus:outline-none cursor-pointer"
              >
                <option value="createdAt">Newest Arrival</option>
                <option value="annualYieldBps">Highest Yield</option>
                <option value="pricePerToken">Lowest Price</option>
              </select>
           </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => <InstitutionalSkeleton key={i} />)}
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="institutional-glass p-32 text-center">
            <h3 className="text-2xl font-display font-bold text-white">No Assets Found</h3>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === 'map' ? (
              <MarketMap assets={filteredAssets} />
            ) : (
              <Grid
                columnCount={GRID_CONFIG.cols}
                columnWidth={GRID_CONFIG.width}
                rowCount={Math.ceil(filteredAssets.length / GRID_CONFIG.cols)}
                rowHeight={580}
                cellComponent={GridCell}
                cellProps={{
                  assets: filteredAssets,
                  solPrice,
                  gridConfig: GRID_CONFIG
                }}
                style={{
                  height: 800,
                  width: Math.min(windowWidth || 1200, 1280)
                }}
                className="scrollbar-hide"
              />
            )}
          </AnimatePresence>
        )}

        {!loading && filteredAssets.length > 0 && (
          <div className="mt-32">
            <div className="flex flex-col md:flex-row justify-between mb-12 gap-6">
              <div>
                <h2 className="text-3xl font-display font-black text-white">Liquidity Pools</h2>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {filteredAssets.slice(0, 3).map((asset, i) => (
                <LiquidityPoolCard key={asset._id} asset={asset} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
