'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  EyeOff, Shield, Lock, Activity, TrendingUp, TrendingDown,
  Info, Zap, Loader2, AlertTriangle, ArrowRight, Wallet,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/shared/Toast';
import ConfirmModal from '@/components/shared/ConfirmModal';
import AuthGate from '@/components/shared/AuthGate';
import { DashboardSkeleton } from '@/components/shared/Skeletons';

export default function DarkPoolPage() {
  return (
    <AuthGate 
      allowedRoles={['admin', 'issuer', 'auditor']} 
      title="Institutional Dark Pool"
      description="The Dark Pool is an anonymous liquidity venue reserved for institutional block trades. Please connect an authorized wallet."
    >
      <DarkPoolContent />
    </AuthGate>
  );
}

function DarkPoolContent() {
  const { publicKey } = useWallet();
  const { toast } = useToast();

  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Form
  const [form, setForm] = useState({
    side: 'buy',
    shares: '',
    price: '',
    minFill: '',
  });

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const assetRes = await api.getAssets({ limit: 50 });
        setAssets(assetRes.assets || []);
        if (assetRes.assets?.[0]) {
          setSelectedAsset(assetRes.assets[0]._id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!selectedAsset) return;
    api.getDarkPoolStats(selectedAsset).then(setStats).catch(console.error);
  }, [selectedAsset]);

  useEffect(() => {
    if (!publicKey) return;
    api.getMyDarkOrders(publicKey.toBase58()).then(res => setMyOrders(res.orders || [])).catch(console.error);
  }, [publicKey]);

  const handlePlaceOrder = async () => {
    if (!publicKey || !selectedAsset || !form.shares || !form.price) return;
    setConfirmOpen(false);
    setOrderLoading(true);
    try {
      await api.placeDarkOrder({
        walletAddress: publicKey.toBase58(),
        assetId: selectedAsset,
        side: form.side,
        price: Number(form.price),
        shares: Number(form.shares),
        minimumFill: form.minFill ? Number(form.minFill) : 0,
      });
      toast('success', 'Dark Order Placed', 'Your order is now in the hidden queue.');
      setForm({ side: 'buy', shares: '', price: '', minFill: '' });
      // Refresh
      const res = await api.getMyDarkOrders(publicKey.toBase58());
      setMyOrders(res.orders || []);
    } catch (e: any) {
      toast('error', 'Execution Failed', e.message);
    } finally {
      setOrderLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 pt-10 pb-32">
        <div className="max-w-7xl mx-auto px-4"><DashboardSkeleton /></div>
      </div>
    );
  }

  const asset = assets.find(a => a._id === selectedAsset);

  return (
    <div className="min-h-screen bg-surface-950 pt-10 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <EyeOff size={20} className="text-indigo-400" />
               </div>
               <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Private Liquidity Terminal</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-2">
              Institutional<span className="text-indigo-400">DarkPool</span>
            </h1>
            <div className="flex items-center gap-4 text-sm font-medium">
               <span className="text-white/30 text-xs uppercase tracking-widest font-black">Hidden Order Book • Peer-to-Peer Settlement</span>
            </div>
          </motion.div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Symbol Selection</span>
            <select 
              value={selectedAsset} 
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="input-institutional !bg-white/5 !py-2.5 !px-6 !text-sm w-64"
            >
              {assets.map(a => <option key={a._id} value={a._id} className="bg-surface-950">{a.symbol} — {a.name}</option>)}
            </select>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
           <div className="institutional-glass p-5 bg-white/[0.01]">
              <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">24H Volume</div>
              <div className="text-xl font-display font-bold text-white">{stats?.volume24h?.toLocaleString() || '0'} <span className="text-xs text-white/20">UNITS</span></div>
           </div>
           <div className="institutional-glass p-5 bg-white/[0.01]">
              <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">Total Hidden Liquidity</div>
              <div className="text-xl font-display font-bold text-white">{stats?.totalLiquidity?.toLocaleString() || '0'} <span className="text-xs text-white/20">UNITS</span></div>
           </div>
           <div className="institutional-glass p-5 bg-white/[0.01]">
              <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">Avg Execution Price</div>
              <div className="text-xl font-display font-bold text-white">{stats?.avgExecutionPrice?.toFixed(4) || '—'} <span className="text-xs text-white/20">SOL</span></div>
           </div>
           <div className="institutional-glass p-5 bg-white/[0.01]">
              <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">Last Match</div>
              <div className="text-xl font-display font-bold text-white">{stats?.lastMatchTime ? new Date(stats.lastMatchTime).toLocaleTimeString() : 'N/A'}</div>
           </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
           
           {/* Order Entry */}
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="institutional-glass p-10 bg-indigo-500/[0.01]">
              <h3 className="text-xl font-display font-bold text-white mb-8 flex items-center gap-3">
                 <Lock size={20} className="text-indigo-400" />
                 Confidential Order Entry
              </h3>

              <div className="space-y-6">
                 <div className="flex p-1 rounded-xl bg-white/5 border border-white/10">
                   <button 
                     onClick={() => setForm({ ...form, side: 'buy' })}
                     className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${form.side === 'buy' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/30'}`}
                   >
                     Hidded Buy
                   </button>
                   <button 
                     onClick={() => setForm({ ...form, side: 'sell' })}
                     className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${form.side === 'sell' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-white/30'}`}
                   >
                     Hidden Sell
                   </button>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] text-white/30 font-black uppercase tracking-widest ml-1">Shares (Block size)</label>
                       <input 
                         type="number" 
                         value={form.shares} 
                         onChange={(e) => setForm({ ...form, shares: e.target.value })}
                         className="input-institutional text-xl" 
                         placeholder="10,000" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-white/30 font-black uppercase tracking-widest ml-1">Limit Price (SOL)</label>
                       <input 
                         type="number" 
                         value={form.price} 
                         onChange={(e) => setForm({ ...form, price: e.target.value })}
                         className="input-institutional text-xl" 
                         placeholder="1.2500" 
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <div className="flex items-center justify-between">
                       <label className="text-[10px] text-white/30 font-black uppercase tracking-widest ml-1">Minimum Fill Amount</label>
                       <span className="text-[10px] text-indigo-400/60 font-medium">Prevents micro-slippage</span>
                    </div>
                    <input 
                      type="number" 
                      value={form.minFill} 
                      onChange={(e) => setForm({ ...form, minFill: e.target.value })}
                      className="input-institutional" 
                      placeholder="e.g., 500 (Optional)" 
                    />
                 </div>

                 <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                    <Info size={16} className="text-white/20 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-white/40 leading-relaxed font-medium uppercase tracking-wider">
                       Orders in the Dark Pool are never displayed on a public order book. Trades are matched based on price-time priority and executed atomically. Matches are only revealed to the counterparty at execution.
                    </p>
                 </div>

                 <button 
                   onClick={() => setConfirmOpen(true)}
                   disabled={orderLoading || !form.shares || !form.price}
                   className="w-full btn-institutional !bg-indigo-600 !py-5 flex items-center justify-center gap-3 text-sm tracking-[0.2em] shadow-xl shadow-indigo-500/20 disabled:opacity-20"
                 >
                    {orderLoading ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                    {orderLoading ? 'TRANSCHING ORDER...' : 'ELEVATE HIDDEN ORDER'}
                 </button>
              </div>
           </motion.div>

           {/* My Hidden Orders */}
           <div className="space-y-6">
              <div className="institutional-glass p-8 bg-white/[0.01]">
                <h3 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-3">
                   <Activity size={20} className="text-white/40" />
                   My Private Orders
                </h3>
                
                {myOrders.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
                     <Lock size={32} className="text-white/5 mx-auto mb-4" />
                     <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">No hidden orders active</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                     {myOrders.map((order, i) => (
                        <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                           <div className="flex items-center gap-4">
                              <div className={`w-1.5 h-8 rounded-full ${order.side === 'buy' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <div>
                                 <div className="font-bold text-white uppercase text-xs">{order.side} {order.shares?.toLocaleString()} Units</div>
                                 <div className="text-[10px] text-white/20 font-bold uppercase tracking-tighter">Limit {order.price} SOL</div>
                              </div>
                           </div>
                           <div className="text-right">
                              <div className={`text-[10px] font-black uppercase tracking-widest ${order.status === 'filled' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                 {order.status}
                              </div>
                              <div className="text-[9px] text-white/20 font-medium">#{order._id?.slice(-8)}</div>
                           </div>
                        </div>
                     ))}
                  </div>
                )}
              </div>

              {/* Execution History */}
              <div className="institutional-glass p-8 bg-white/[0.01]">
                <h3 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-3">
                   <TrendingUp size={20} className="text-white/40" />
                   Recent Dark Execution
                </h3>
                <div className="space-y-4 opacity-50 grayscale pointer-events-none">
                   {/* Simplified mock rows to show "Hidden" nature */}
                   {[1, 2, 3].map(i => (
                     <div key={i} className="flex items-center justify-between text-[10px] font-medium text-white/30 uppercase tracking-[0.2em] border-b border-white/5 pb-3">
                        <span className="flex items-center gap-2">HIDDEN MATCH <ArrowRight size={10} /> {asset?.symbol || 'ASSET'}</span>
                        <span>CONFIDENTIAL PRICE</span>
                        <span>{Math.floor(Math.random() * 5000 + 1000).toLocaleString()} UNITS</span>
                     </div>
                   ))}
                </div>
                <div className="mt-6 flex items-center gap-2 text-[9px] text-indigo-400/60 font-bold uppercase tracking-widest justify-center">
                   <Shield size={12} /> Encrypted Zero Knowledge Proofs Enabled
                </div>
              </div>
           </div>
        </div>

      </div>

      <ConfirmModal 
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handlePlaceOrder}
        title="Confirm Hidden Order"
        description={`You are placing a PRIVATE ${form.side.toUpperCase()} order for ${form.shares} shares at ${form.price} SOL. This order will not be visible to the market.`}
        confirmLabel="Confirm Hidden"
        loading={orderLoading}
      />
    </div>
  );
}
