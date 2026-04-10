'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowDown, 
  Settings2, 
  RefreshCcw, 
  Info, 
  Wallet, 
  Zap,
  ArrowRightLeft,
  ChevronDown,
} from 'lucide-react';
import { formatCurrency, lamportsToSol } from '@/lib/constants';

interface SwapInterfaceProps {
  asset: any;
  solPrice: number;
}

export default function SwapInterface({ asset, solPrice }: SwapInterfaceProps) {
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isSwapped, setIsSwapped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slippage, setSlippage] = useState(0.5);

  const tokenPriceInSol = lamportsToSol(asset.pricePerToken);
  
  useEffect(() => {
    if (!fromAmount) {
      setToAmount('');
      return;
    }

    const amount = parseFloat(fromAmount);
    if (isNaN(amount)) return;

    if (!isSwapped) {
      // SOL -> ASSET
      setToAmount((amount / tokenPriceInSol).toFixed(2));
    } else {
      // ASSET -> SOL
      setToAmount((amount * tokenPriceInSol).toFixed(4));
    }
  }, [fromAmount, isSwapped, tokenPriceInSol]);

  const handleSwap = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setFromAmount('');
      setToAmount('');
      alert('Swap executed successfully on the secondary market!');
    }, 1500);
  };

  return (
    <div className="institutional-glass p-8 bg-surface-900 border-white/10 shadow-2xl">
      <div className="flex items-center justify-between mb-8">
         <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <ArrowRightLeft size={20} className="text-emerald-400" />
            Secondary Market Swap
         </h3>
         <div className="flex gap-2">
            <button className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white transition-all">
               <Settings2 size={16} />
            </button>
            <button className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white transition-all">
               <RefreshCcw size={16} />
            </button>
         </div>
      </div>

      <div className="space-y-2 relative">
        {/* From Input */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
           <div className="flex justify-between items-center text-[10px] font-bold text-white/30 uppercase tracking-widest">
              <span>You Pay</span>
              <span>Balance: 12.45 {!isSwapped ? 'SOL' : asset.symbol}</span>
           </div>
           <div className="flex items-center justify-between gap-4">
              <input 
                type="number" 
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.00"
                className="bg-transparent text-3xl font-display font-black text-white focus:outline-none w-full placeholder-white/5"
              />
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all font-bold text-xs text-white">
                 <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    {!isSwapped ? <Zap size={12} className="text-emerald-400" /> : <div className="text-[10px]">{asset.symbol[0]}</div>}
                 </div>
                 {!isSwapped ? 'SOL' : asset.symbol}
                 <ChevronDown size={14} />
              </button>
           </div>
        </div>

        {/* Swap Switch Button */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
           <button 
             onClick={() => setIsSwapped(!isSwapped)}
             className="w-10 h-10 rounded-xl bg-surface-900 border border-white/10 flex items-center justify-center text-emerald-400 hover:scale-110 active:scale-95 transition-all shadow-xl"
           >
              <ArrowDown size={20} />
           </button>
        </div>

        {/* To Input */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
           <div className="flex justify-between items-center text-[10px] font-bold text-white/30 uppercase tracking-widest">
              <span>You Receive</span>
              <span>Est. Output</span>
           </div>
           <div className="flex items-center justify-between gap-4">
              <input 
                type="text" 
                value={toAmount}
                readOnly
                placeholder="0.00"
                className="bg-transparent text-3xl font-display font-black text-white focus:outline-none w-full placeholder-white/5"
              />
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all font-bold text-xs text-white">
                 <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    {isSwapped ? <Zap size={12} className="text-emerald-400" /> : <div className="text-[10px]">{asset.symbol[0]}</div>}
                 </div>
                 {isSwapped ? 'SOL' : asset.symbol}
                 <ChevronDown size={14} />
              </button>
           </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
         <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-white/30 uppercase tracking-widest">
               <span>Exchange Rate</span>
               <span className="text-white">1 {asset.symbol} = {tokenPriceInSol.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-white/30 uppercase tracking-widest">
               <span>Price Impact</span>
               <span className="text-emerald-400 tracking-tight">&lt; 0.01%</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-white/30 uppercase tracking-widest">
               <span>Liquidity Provider Fee</span>
               <span className="text-white">0.05%</span>
            </div>
         </div>

         <button 
           onClick={handleSwap}
           disabled={!fromAmount || loading}
           className="w-full py-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-display font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 disabled:opacity-20 disabled:grayscale transition-all"
         >
           {loading ? 'Routing Order...' : 'Confirm Market Swap'}
         </button>
      </div>

      <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
         <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
         <p className="text-[10px] text-indigo-200/40 leading-relaxed font-bold uppercase tracking-tight">
           Trading occurs via the Assetverse Secondary AMM. Liquidity is provided by institutional market makers and protocol vaults.
         </p>
      </div>
    </div>
  );
}
