'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Activity, ArrowUp, ArrowDown, Globe, Zap } from 'lucide-react';

interface OracleFeedProps {
  initialPrice: number;
  symbol: string;
}

export default function OracleFeed({ initialPrice, symbol }: OracleFeedProps) {
  const [price, setPrice] = useState(initialPrice);
  const [prevPrice, setPrevPrice] = useState(initialPrice);
  const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral');

  useEffect(() => {
    const interval = setInterval(() => {
      setPrevPrice(price);
      // Simulate real-time appraisal/oracle update
      const change = (Math.random() - 0.5) * 0.5; // +/- 0.25%
      const newPrice = price + change;
      setPrice(newPrice);
      setTrend(newPrice > price ? 'up' : 'down');
    }, 4000);

    return () => clearInterval(interval);
  }, [price]);

  return (
    <div className="institutional-glass p-6 bg-white/[0.01] border-white/5 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-2 opacity-5">
         <Globe size={80} />
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
           <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Real-Time NAV Oracle</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-black text-white/30 uppercase tracking-widest">
           <Zap size={10} className="text-amber-500" />
           Sub-Second Latency
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
           <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Estimated Unit Value</div>
           <div className="flex items-baseline gap-2">
              <AnimatePresence mode="wait">
                <motion.span 
                  key={price}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl font-display font-black text-white"
                >
                  ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </motion.span>
              </AnimatePresence>
              <span className="text-white/20 font-bold uppercase text-xs tracking-tighter">{symbol}</span>
           </div>
        </div>

        <div className={`flex flex-col items-end ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
           <div className="flex items-center gap-1 text-xs font-black">
              {trend === 'up' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              {Math.abs(((price - prevPrice) / prevPrice) * 100).toFixed(3)}%
           </div>
           <div className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-40">24h Variance</div>
        </div>
      </div>

      {/* Proof of Reserve Section */}
      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
               <ShieldCheck size={16} className="text-indigo-400" />
            </div>
            <div>
               <div className="text-[9px] font-bold text-white uppercase tracking-widest">Proof of Reserve</div>
               <div className="text-[9px] text-white/30 font-medium tracking-tight">Verified by Chainlink 3.0</div>
            </div>
         </div>
         <button className="text-[9px] font-black text-emerald-500 hover:text-emerald-400 uppercase tracking-widest underline decoration-emerald-500/30 underline-offset-4">
           Verify Receipt
         </button>
      </div>

      {/* Small Chart Visualization */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
         <motion.div 
           initial={{ width: "40%" }}
           animate={{ width: ["40%", "100%", "40%"] }}
           transition={{ duration: 4, repeat: Infinity }}
           className="h-full bg-emerald-500/20"
         />
      </div>
    </div>
  );
}
