'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Droplets, 
  TrendingUp, 
  ArrowUpRight, 
  Users, 
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/constants';

interface LiquidityPoolCardProps {
  asset: any;
  index: number;
}

export default function LiquidityPoolCard({ asset, index }: LiquidityPoolCardProps) {
  // Mock liquidity data
  const totalLiquidity = asset.propertyValue * 0.12; // 12% of asset value
  const volume24h = totalLiquidity * 0.05; // 5% daily turnover
  const apy = 8.5 + (Math.random() * 4); // 8.5% - 12.5%

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="institutional-glass p-8 bg-white/[0.01] hover:bg-white/[0.03] transition-all border-white/5 hover:border-emerald-500/20 group"
    >
      <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
               <Droplets size={24} className="text-emerald-400" />
            </div>
            <div>
               <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-display font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-wide">
                    {asset.symbol} / SOL
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black uppercase text-white/40 tracking-widest">
                     V1 POOL
                  </span>
               </div>
               <div className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">Secondary Liquidity Pool</div>
            </div>
         </div>
         <button className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/40 group-hover:text-white transition-all">
            <ArrowUpRight size={20} />
         </button>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
         <div>
            <div className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2">Pool Liquidation Value</div>
            <div className="text-2xl font-display font-bold text-white">{formatCurrency(totalLiquidity)}</div>
         </div>
         <div className="text-right">
            <div className="text-[10px] text-emerald-400/60 uppercase font-black tracking-widest mb-2">Liquidity Yield (LP)</div>
            <div className="text-2xl font-display font-bold text-emerald-400">{apy.toFixed(1)}% APY</div>
         </div>
      </div>

      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
         <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
            <span className="text-white/20">24H Volume</span>
            <span className="text-white">{formatCurrency(volume24h)}</span>
         </div>
         <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
            <span className="text-white/20">LP Participants</span>
            <span className="text-white flex items-center gap-1"><Users size={10} /> 128 Institutionals</span>
         </div>
         <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
            <span className="text-white/20">Pool Health</span>
            <span className="text-emerald-500 flex items-center gap-1"><Activity size={10} /> 99.9% Robust</span>
         </div>
      </div>

      <div className="mt-8 flex gap-4">
         <button className="flex-1 py-4 rounded-xl institutional-glass bg-emerald-500 hover:bg-emerald-400 text-white font-display font-black uppercase tracking-[0.2em] text-xs transition-all shadow-lg shadow-emerald-500/10">
           Add Liquidity
         </button>
         <button className="flex-1 py-4 rounded-xl institutional-glass bg-white/5 border border-white/10 text-white/60 hover:text-white font-display font-black uppercase tracking-[0.2em] text-xs transition-all">
           Manage LP
         </button>
      </div>

      {/* Progress to next tranche */}
      <div className="mt-8 pt-6 border-t border-white/5">
         <div className="flex justify-between items-center mb-3 text-[8px] font-black uppercase tracking-widest">
            <span className="text-white/20">Liquidity Depth Focus</span>
            <span className="text-white/40">10,000 / 12,000 SOL</span>
         </div>
         <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
               initial={{ width: 0 }}
               animate={{ width: "83%" }}
               className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]" 
            />
         </div>
      </div>
    </motion.div>
  );
}
