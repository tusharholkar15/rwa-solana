'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  BarChart3, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Building2, 
  ShieldCheck, 
  Info,
  DollarSign,
  Activity,
  Zap,
  Lock,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, lamportsToSol, shortenAddress } from '@/lib/constants';
import AuthGate from '@/components/shared/AuthGate';

export default function LendingPage() {
  const { connected, publicKey } = useWallet();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [solPrice, setSolPrice] = useState(145);
  const [collateralAmount, setCollateralAmount] = useState<string>('');
  const [borrowAmount, setBorrowAmount] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'collateral' | 'borrow'>('collateral');

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
      const res = await api.getPortfolio(publicKey!.toBase58());
      setPortfolio(res.portfolio);
      setSolPrice(res.solPrice);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const totalValue = portfolio ? lamportsToSol(portfolio.totalValue) * solPrice : 0;
  const borrowLimit = totalValue * 0.6; // 60% LTV
  const currentBorrowed = 0; // Simulated

  if (!connected) {
    return (
      <AuthGate 
        title="Institutional Credit Facility" 
        description="Access over-collateralized borrowing and lending primitives. Connect your corporate wallet to view credit availability and LTV metrics."
        icon={<DollarSign size={48} className="text-white/20 group-hover:text-indigo-400 transition-colors" />}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 pb-32 pt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ─── Institutional Header ───────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <DollarSign size={20} />
               </div>
               <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Institutional Credit Protocol</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-2">
              RWA<span className="text-indigo-400">Lending</span>
            </h1>
            <p className="text-white/40 max-w-lg font-medium">Access over-collateralized loans using your real-estate tokens as security.</p>
          </motion.div>

          <div className="flex items-center gap-8 p-6 institutional-glass bg-white/[0.02]">
            <div>
               <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Total RWA Collateral</div>
               <div className="text-xl font-display font-bold text-white">{formatCurrency(totalValue)}</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
               <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Borrowing Capacity</div>
               <div className="text-xl font-display font-bold text-emerald-400">{formatCurrency(borrowLimit)}</div>
            </div>
          </div>
        </div>

        {/* ─── Main Interface ─────────────────────────────── */}
        <div className="grid lg:grid-cols-12 gap-10">
          
          {/* Left: Collateral Management */}
          <div className="lg:col-span-8 space-y-8">
             {/* Credit Health Gauge */}
             <div className="institutional-glass p-8 bg-white/[0.01]">
                <div className="flex justify-between items-center mb-8">
                   <div className="flex items-center gap-3">
                      <Activity size={20} className="text-indigo-400" />
                      <h3 className="font-display font-bold text-xl text-white">Credit Facility Status</h3>
                   </div>
                   <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest">Safe Margin</div>
                </div>
                
                <div className="space-y-6">
                   <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-1">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentBorrowed / borrowLimit) * 100 || 0}%` }}
                        className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
                      />
                   </div>
                   <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-white/30">Utilization: 0.0%</span>
                      <span className="text-white/30">Liquidation Threshold: 85%</span>
                   </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mt-12">
                   <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="text-[9px] text-white/20 uppercase font-bold tracking-[0.2em] mb-2">Net APY</div>
                      <div className="text-xl font-display font-bold text-white">-1.24%</div>
                   </div>
                   <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="text-[9px] text-white/20 uppercase font-bold tracking-[0.2em] mb-2">Interest Paid</div>
                      <div className="text-xl font-display font-bold text-rose-400">$0.00</div>
                   </div>
                   <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="text-[9px] text-white/20 uppercase font-bold tracking-[0.2em] mb-2">Security Tier</div>
                        <div className="text-xl font-display font-bold text-emerald-400">AAA</div>
                      </div>
                      <ShieldCheck size={28} className="text-emerald-400/20" />
                   </div>
                </div>
             </div>

             {/* Eligible Assets Table */}
             <div className="institutional-glass bg-white/[0.01]">
                <div className="p-8 border-b border-white/5">
                   <h3 className="font-display font-bold text-xl text-white flex items-center gap-3">
                      <Building2 size={20} className="text-white/40" />
                      Eligible Collateral
                   </h3>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full">
                      <thead className="text-[10px] text-white/20 uppercase tracking-[0.25em] font-black italic">
                         <tr>
                            <th className="px-8 py-6 text-left">Asset</th>
                            <th className="px-8 py-6 text-right">Balance</th>
                            <th className="px-8 py-6 text-right">LTV</th>
                            <th className="px-8 py-6 text-right">Action</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         {portfolio?.holdings.map((h: any, i: number) => (
                            <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                               <td className="px-8 py-6">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                                        <Building2 size={20} className="text-white/40 group-hover:text-indigo-400" />
                                     </div>
                                     <span className="font-bold text-white group-hover:text-indigo-400">{h.asset?.name}</span>
                                  </div>
                               </td>
                               <td className="px-8 py-6 text-right font-display text-white font-bold">
                                  {formatCurrency(lamportsToSol(h.shares * (h.asset?.currentPrice || 0)) * solPrice)}
                               </td>
                               <td className="px-8 py-6 text-right text-emerald-400 font-black">60%</td>
                               <td className="px-8 py-6 text-right">
                                  <button className="text-[10px] font-black text-indigo-400 hover:text-white transition-colors uppercase tracking-widest">Lock Portfolio</button>
                               </td>
                            </tr>
                         ))}
                         {!portfolio?.holdings.length && (
                            <tr>
                               <td colSpan={4} className="px-8 py-20 text-center text-white/20 font-bold uppercase tracking-widest">No assets found to use as collateral</td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>

          {/* Right: Actions & Info */}
          <div className="lg:col-span-4 space-y-8">
             <div className="institutional-glass p-8 bg-surface-900 border-white/10 shadow-2xl">
                <div className="flex bg-white/5 rounded-2xl p-1.5 border border-white/10 mb-8">
                   <button onClick={() => setActiveTab('collateral')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'collateral' ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>Stake Collateral</button>
                   <button onClick={() => setActiveTab('borrow')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'borrow' ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>Draw Debt</button>
                </div>

                <div className="space-y-6">
                   <div>
                      <div className="flex justify-between items-center mb-4">
                         <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{activeTab === 'collateral' ? 'Staking Value' : 'Debt Request'}</label>
                         <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Max: {activeTab === 'collateral' ? formatCurrency(totalValue) : formatCurrency(borrowLimit)}</span>
                      </div>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={activeTab === 'collateral' ? collateralAmount : borrowAmount}
                          onChange={(e) => activeTab === 'collateral' ? setCollateralAmount(e.target.value) : setBorrowAmount(e.target.value)}
                          placeholder="0.00" 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-2xl font-display font-black text-white focus:outline-none focus:border-indigo-500/50 transition-all text-center"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-bold text-white/20 uppercase">USDC</div>
                      </div>
                   </div>

                   <ul className="space-y-4 pt-6 border-t border-white/5">
                      <li className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                         <span className="text-white/40">Interest Rate (Fixed)</span>
                         <span className="text-white">4.2% APR</span>
                      </li>
                      <li className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                         <span className="text-white/40">Protocol Fee</span>
                         <span className="text-emerald-400">0.05%</span>
                      </li>
                   </ul>

                   <button className="w-full py-5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 font-display font-black text-white uppercase tracking-[0.2em] transition-all transform active:scale-[0.98] shadow-2xl shadow-indigo-500/20">
                     {activeTab === 'collateral' ? 'Lock Collateral' : 'Initialize Loan Request'}
                   </button>
                </div>
             </div>

             <div className="p-8 institutional-glass bg-white/[0.01] border-white/5">
                <div className="flex items-center gap-3 mb-6">
                   <Info size={16} className="text-indigo-400" />
                   <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">Protocol Intelligence</h4>
                </div>
                <div className="space-y-4">
                   <p className="text-xs text-white/30 leading-relaxed font-medium">Loans are backed by a basket of Institutional Grade properties. Liquidation is rare as real estate NAV is less volatile than native crypto tokens.</p>
                   <div className="pt-4 border-t border-white/10">
                      <div className="flex justify-between items-center mb-1">
                         <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Collateral Integrity</span>
                         <span className="text-[9px] font-bold text-emerald-400 tracking-widest">99.9%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full">
                         <div className="h-full w-[99.9%] bg-emerald-500 rounded-full" />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
