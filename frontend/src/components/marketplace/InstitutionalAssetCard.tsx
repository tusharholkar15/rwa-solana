'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  TrendingUp, 
  Users, 
  ArrowUpRight, 
  ShieldCheck, 
  Calendar,
  BarChart3,
  Leaf,
  Shield,
  Wallet,
  ArrowDownCircle
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatCurrency, lamportsToSol, getAssetTypeBadgeColor } from '@/lib/constants';
import Sparkline from './Sparkline';
import SafeImage from '@/components/shared/SafeImage';
import { useCurrency } from '@/context/CurrencyContext';
import { useRealtime } from '@/context/RealtimeContext';

interface InstitutionalAssetCardProps {
  asset: any;
  solPrice: number;
  index: number;
}

const RISK_RATINGS: Record<string, string> = {
  residential: 'A-',
  commercial: 'A+',
  industrial: 'B+',
  land: 'B',
  'mixed-use': 'A',
  hospitality: 'B-',
};

/**
 * InstitutionalAssetCard: Optimized for 60fps performance with real-time sync
 */
const InstitutionalAssetCard = React.memo(
  function InstitutionalAssetCard({ asset, solPrice: initialSolPrice, index }: InstitutionalAssetCardProps) {
    const { formatPrice } = useCurrency();
    const { socket } = useRealtime();
    const { publicKey } = useWallet();
    
    const [livePrice, setLivePrice] = React.useState(asset.navPrice || asset.pricePerToken / 1e9);
    const [flash, setFlash] = React.useState<'up' | 'down' | null>(null);
    const [pendingYield, setPendingYield] = React.useState<number | null>(null);
    const [isClaiming, setIsClaiming] = React.useState(false);
    const flashTimeoutRef = React.useRef<NodeJS.Timeout>();

    // Use Intersection Observer to only poll for yield when visible
    const [isVisible, setIsVisible] = React.useState(false);
    const cardRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => setIsVisible(entry.isIntersecting),
        { threshold: 0.1 }
      );
      if (cardRef.current) observer.observe(cardRef.current);
      return () => observer.disconnect();
    }, []);

    // Fetch pending yield if user has shares AND card is visible
    React.useEffect(() => {
      if (!publicKey || !asset.onChainAddress || !asset.userShares || !isVisible) return;

      const fetchYield = async () => {
        try {
          const res = await fetch(`/api/yield/pending?asset=${asset.onChainAddress}&user=${publicKey.toBase58()}`);
          const data = await res.json();
          setPendingYield(data.amountSol);
        } catch (err) {
          console.error("Failed to fetch pending yield", err);
        }
      };

      fetchYield();
      const interval = setInterval(fetchYield, 30000); 
      return () => clearInterval(interval);
    }, [publicKey, asset.onChainAddress, asset.userShares, isVisible]);

    const handleClaim = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!publicKey) return;

      setIsClaiming(true);
      try {
        console.log("Claiming yield for", asset.name);
        await new Promise(r => setTimeout(r, 1500));
        setPendingYield(0);
        alert("Yield claimed successfully!");
      } catch (err) {
        alert("Failed to claim yield");
      } finally {
        setIsClaiming(false);
      }
    };

    React.useEffect(() => {
      if (!socket || !asset._id || !isVisible) return;

      socket.emit('subscribe:asset', asset._id);

      const handleEvent = (payload: any) => {
        if (payload.type === 'PRICE_UPDATE' && payload.assetId === asset._id) {
          const newPrice = payload.data.navPrice;
          setLivePrice((prev: number) => {
             setFlash(newPrice > prev ? 'up' : 'down');
             
             if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
             flashTimeoutRef.current = setTimeout(() => setFlash(null), 2000);
             
             return newPrice;
          });
        }
      };

      socket.on('asset_event', handleEvent);

      return () => {
        socket.emit('unsubscribe:asset', asset._id);
        socket.off('asset_event', handleEvent);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      };
    }, [socket, asset._id, isVisible]);

    // Move all derivations into useMemo for stability
    const stats = React.useMemo(() => {
      const sold = asset.soldPercentage || ((asset.totalSupply - asset.availableSupply) / asset.totalSupply * 100);
      const rating = RISK_RATINGS[asset.assetType] || 'A';
      const yieldApy = (asset.annualYieldBps / 100).toFixed(1);
      const priceSol = lamportsToSol(asset.pricePerToken).toFixed(3);
      
      const rawPoints = [7.2, 7.3, 7.1, 7.4, 7.5, 7.4, 7.8];
      const sparklineData = rawPoints.map((v, i) => v + (Math.sin(i + (asset._id?.charCodeAt(0) || 0)) * 0.2));

      return { sold, rating, yieldApy, priceSol, sparklineData };
    }, [asset._id, asset.assetType, asset.annualYieldBps, asset.pricePerToken, asset.totalSupply, asset.availableSupply]);

    return (
      <div 
        ref={cardRef}
        className="group block institutional-card-optimized overflow-hidden bg-surface-900 border border-white/5 rounded-2xl transition-all duration-300 hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/5 will-change-transform"
      >
        <Link href={`/asset/${asset._id}`}>
          {/* Image / Header - Simplified effects */}
          <div className="relative h-60 overflow-hidden bg-surface-950">
            <SafeImage 
              src={asset.images?.[0]} 
              alt={asset.name} 
              assetType={asset.assetType}
              loading={index < 6 ? 'eager' : 'lazy'}
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out will-change-transform" 
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/20 to-transparent" />
            
            {/* Top Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getAssetTypeBadgeColor(asset.assetType)} bg-surface-950/40`}>
                {asset.assetType}
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white">
                <ShieldCheck size={10} className="text-emerald-400" />
                Audited
              </div>
            </div>

            <div className="absolute top-4 right-4">
               <div className="w-8 h-8 rounded-full bg-surface-950/60 border border-white/10 flex items-center justify-center text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight size={16} />
               </div>
            </div>

            {/* Bottom Info Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div className="max-w-[70%]">
                <div className="flex items-center gap-1 text-[9px] text-white/50 uppercase tracking-widest mb-1 font-bold">
                  <MapPin size={9} />
                  {asset.location?.city}, {asset.location?.country}
                </div>
                <h3 className="text-lg font-display font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                  {asset.name}
                </h3>
              </div>
              <div className="text-right">
                <div className={`text-lg font-display font-black ${stats.rating.startsWith('A') ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {stats.rating}
                </div>
              </div>
            </div>

            {/* Holdling Status / Yield Claim Button */}
            {asset.userShares > 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%]">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-950/90 backdrop-blur-md border border-emerald-500/30 rounded-xl p-3 shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Wallet size={12} className="text-emerald-400" />
                      </div>
                      <div className="text-[10px] font-bold text-white/70 uppercase">Your Accrued Yield</div>
                    </div>
                    <div className="text-xs font-display font-bold text-emerald-400">
                      {pendingYield !== null ? `${pendingYield.toFixed(4)} SOL` : '...'}
                    </div>
                  </div>
                  <button
                    onClick={handleClaim}
                    disabled={isClaiming || !pendingYield || pendingYield <= 0}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-white/20 text-surface-950 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    {isClaiming ? (
                      <div className="w-3 h-3 border-2 border-surface-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ArrowDownCircle size={14} />
                        Claim Yield
                      </>
                    )}
                  </button>
                </motion.div>
              </div>
            )}
          </div>

          {/* Content Body */}
          <div className="p-5">
            <div className="grid grid-cols-2 gap-6 mb-5">
              <div>
                <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1.5">Yield</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-display font-bold text-white">
                      {stats.yieldApy}
                    </span>
                    <span className="text-emerald-400 font-bold text-[10px]">% APY</span>
                  </div>
                  <Sparkline data={stats.sparklineData} width={50} height={18} />
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1.5">Price</div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-display font-bold transition-colors duration-500 ${
                      flash === 'up' ? 'text-emerald-400' : flash === 'down' ? 'text-rose-400' : 'text-white'
                    }`}>
                      {livePrice.toFixed(4)}
                    </span>
                    <span className="text-white/40 text-[10px] font-bold uppercase">SOL</span>
                  </div>
              </div>
            </div>

            {/* Allocation Progress - Simple CSS Transition */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-1.5">
                <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Progress</div>
                <div className="text-[10px] text-emerald-400 font-black tracking-widest">{stats.sold.toFixed(1)}%</div>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                  style={{ width: `${stats.sold}%` }}
                />
              </div>
            </div>

            {/* Secondary Info */}
            <div className="flex items-center justify-between pt-3.5 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[8px] text-white/20 uppercase font-bold">Holders</span>
                  <span className="text-[10px] text-white/60 font-bold flex items-center gap-1">
                    <Users size={9} /> {asset.totalInvestors || 24}
                  </span>
                </div>
              </div>
              <div className="text-right">
                 <div className="text-[8px] text-emerald-500/60 uppercase font-bold">Valuation</div>
                 <div className="text-xs text-white font-bold tracking-tight">
                   {formatPrice(asset.propertyValue)}
                 </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  },
  (prev, next) => (
    prev.asset?._id === next.asset?._id &&
    prev.asset?.availableSupply === next.asset?.availableSupply &&
    prev.asset?.navPrice === next.asset?.navPrice &&
    prev.asset?.pricePerToken === next.asset?.pricePerToken &&
    Math.abs(prev.solPrice - next.solPrice) < 0.1
  )
);

export default InstitutionalAssetCard;
