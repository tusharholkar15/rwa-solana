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
} from 'lucide-react';
import { formatCurrency, lamportsToSol, getAssetTypeBadgeColor } from '@/lib/constants';
import Sparkline from './Sparkline';
import SafeImage from '@/components/shared/SafeImage';
import { useCurrency } from '@/context/CurrencyContext';

interface InstitutionalAssetCardProps {
  asset: any;
  solPrice: number;
  index: number;
}

// Static configurations moved outside component to prevent re-creation
const RISK_RATINGS: Record<string, string> = {
  residential: 'A-',
  commercial: 'A+',
  industrial: 'B+',
  land: 'B',
  'mixed-use': 'A',
  hospitality: 'B-',
};

const InstitutionalAssetCard = React.memo(
  function InstitutionalAssetCard({ asset, solPrice, index }: InstitutionalAssetCardProps) {
    const { formatPrice } = useCurrency();
    const soldPercentage = asset.soldPercentage || ((asset.totalSupply - asset.availableSupply) / asset.totalSupply * 100);
    
    // Mock Sparkline Data (simulated trend)
    const sparklineData = React.useMemo(() => [
      7.2, 7.3, 7.1, 7.4, 7.5, 7.4, 7.8
    ].map((v, i) => v + (Math.sin(i + (asset._id?.charCodeAt(0) || 0)) * 0.2)), [asset._id]);

    const rating = RISK_RATINGS[asset.assetType] || 'A';

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Link href={`/asset/${asset._id}`} className="group block institutional-glass-hover overflow-hidden">
          {/* Image / Header */}
          <div className="relative h-64 overflow-hidden">
            <SafeImage 
              src={asset.images?.[0]} 
              alt={asset.name} 
              assetType={asset.assetType}
              className="w-full h-full group-hover:scale-110 transition-transform duration-700" 
            />
            
            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/20 to-transparent" />
            
            {/* Top Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getAssetTypeBadgeColor(asset.assetType)}`}>
                {asset.assetType}
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/10 text-white">
                <ShieldCheck size={10} className="text-emerald-400" />
                Audited
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 backdrop-blur-md border border-indigo-500/20 text-indigo-400">
                <Shield size={10} />
                {asset.location?.country === 'USA' ? 'SEC-REG-D' : 
                 asset.location?.city === 'Dubai' ? 'VARA-APPROVED' : 
                 asset.location?.country === 'Germany' ? 'EU-MICA' : 
                 asset.location?.city === 'Singapore' ? 'MAS-VASP' : 'REG-S'}
              </div>
            </div>

            <div className="absolute top-4 right-4">
               <div className="w-10 h-10 rounded-full bg-surface-950/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-emerald-400">
                  <ArrowUpRight size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
               </div>
            </div>

            {/* Bottom Info Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-white/60 uppercase tracking-widest mb-1 font-bold">
                  <MapPin size={10} />
                  {asset.location?.city}, {asset.location?.country}
                </div>
                <h3 className="text-xl font-display font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {asset.name}
                </h3>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Risk Rating</div>
                <div className={`text-xl font-display font-black ${rating.startsWith('A') ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {rating}
                </div>
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6">
            {/* Primary Stats */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2">Target Yield</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-display font-bold text-white">
                      {(asset.annualYieldBps / 100).toFixed(1)}
                    </span>
                    <span className="text-emerald-400 font-bold">% APY</span>
                  </div>
                  {/* 7-Day Trend Sparkline */}
                  <Sparkline data={sparklineData} width={60} height={20} />
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2">Token Price</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-display font-bold text-white">
                    {lamportsToSol(asset.pricePerToken).toFixed(3)}
                  </span>
                  <span className="text-white/40 text-xs font-bold uppercase">SOL</span>
                </div>
                <div className="text-[10px] text-white/20 font-bold mt-0.5">
                  ≈ {formatPrice(asset.pricePerTokenUsd || (lamportsToSol(asset.pricePerToken) * solPrice))}
                </div>
              </div>
            </div>

            {/* Allocation Progress */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Capital Raised</div>
                <div className="text-[10px] text-emerald-400 font-black tracking-widest">{soldPercentage.toFixed(1)}%</div>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${soldPercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                />
              </div>
            </div>

            {/* Secondary Info */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] text-white/20 uppercase font-bold tracking-tighter">Maturity</span>
                  <span className="text-xs text-white/60 font-bold flex items-center gap-1">
                    <Calendar size={10} /> 5 Years
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-white/20 uppercase font-bold tracking-tighter">Investors</span>
                  <span className="text-xs text-white/60 font-bold flex items-center gap-1">
                    <Users size={10} /> {asset.totalInvestors || 24}
                  </span>
                </div>
              </div>
              <div className="text-right">
                 <div className="text-[9px] text-emerald-500/60 uppercase font-bold tracking-tighter">Market Cap</div>
                 <div className="text-sm text-white font-bold tracking-tight">
                   {formatPrice(asset.propertyValue)}
                 </div>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent re-renders unless meaningful data changes
    return (
      prevProps.asset._id === nextProps.asset._id &&
      prevProps.asset.availableSupply === nextProps.asset.availableSupply &&
      Math.abs(prevProps.solPrice - nextProps.solPrice) < 0.01 // Ignore tiny price fluctuations
    );
  }
);

export default InstitutionalAssetCard;
