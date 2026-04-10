'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, TrendingUp, TrendingDown, Shield, Clock,
  CheckCircle, AlertTriangle, Lock, Activity, Zap, BarChart3
} from 'lucide-react';
import { api } from '@/lib/api';

const SIDE_CONFIG = {
  bid: { label: 'BUY (Bid)', color: 'emerald', icon: TrendingUp },
  ask: { label: 'SELL (Ask)', color: 'red', icon: TrendingDown },
};

export default function DarkPoolPage() {
  const wallet = 'DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

  const [side, setSide] = useState<'bid' | 'ask'>('bid');
  const [price, setPrice] = useState('');
  const [shares, setShares] = useState('');
  const [minimumFill, setMinimumFill] = useState('');
  const [assetId, setAssetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      setOrdersLoading(true);
      try {
        const res = await api.getMyDarkOrders(wallet);
        setMyOrders(res.orders || []);
      } catch (e) { console.error(e); }
      setOrdersLoading(false);
    };
    loadOrders();
  }, [submitResult]);

  const handleSubmit = async () => {
    if (!assetId || !price || !shares) return;
    setLoading(true);
    setSubmitResult(null);
    try {
      const result = await api.placeDarkOrder({
        walletAddress: wallet,
        assetId,
        side,
        price: parseFloat(price),
        shares: parseInt(shares),
        minimumFill: minimumFill ? parseInt(minimumFill) : 0,
      });
      setSubmitResult({ success: true, order: result.order });
      setPrice('');
      setShares('');
      setMinimumFill('');
    } catch (e: any) {
      setSubmitResult({ success: false, error: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050B08] pb-20">
      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-white/10 flex items-center justify-center">
              <EyeOff size={24} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-white tracking-tight">Dark Pool Terminal</h1>
              <p className="text-white/40 text-sm mt-1">Institutional block trading with compliance-gated, midpoint-priced settlement.</p>
            </div>
          </div>
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2 text-xs text-white/30">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Matching Engine Online
            </div>
            <div className="flex items-center gap-2 text-xs text-white/30">
              <Shield size={12} /> Compliance V2 Enforced
            </div>
            <div className="flex items-center gap-2 text-xs text-white/30">
              <Lock size={12} /> Tier 3+ Required
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid lg:grid-cols-5 gap-8">
        {/* Order Entry — Left Panel */}
        <div className="lg:col-span-2">
          <div className="p-6 rounded-2xl bg-[#09110D] border border-white/5">
            <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-6 flex items-center gap-2">
              <Zap size={14} className="text-indigo-400" /> Place Block Order
            </h3>

            {/* Side Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {(['bid', 'ask'] as const).map(s => {
                const cfg = SIDE_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setSide(s)}
                    className={`py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      side === s
                        ? s === 'bid'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                        : 'bg-white/[0.02] text-white/30 border border-white/5 hover:border-white/10'
                    }`}
                  >
                    <cfg.icon size={16} /> {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2 block">Asset ID</label>
                <input
                  value={assetId}
                  onChange={e => setAssetId(e.target.value)}
                  placeholder="Enter Asset ObjectID or Symbol"
                  className="w-full bg-white/[0.02] border border-white/10 text-white font-mono text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2 block">Limit Price (SOL)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/[0.02] border border-white/10 text-white font-mono text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2 block">Shares</label>
                  <input
                    type="number"
                    value={shares}
                    onChange={e => setShares(e.target.value)}
                    placeholder="Block size"
                    className="w-full bg-white/[0.02] border border-white/10 text-white font-mono text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2 block">Minimum Fill (Optional)</label>
                <input
                  type="number"
                  value={minimumFill}
                  onChange={e => setMinimumFill(e.target.value)}
                  placeholder="0 = accept any partial fill"
                  className="w-full bg-white/[0.02] border border-white/10 text-white font-mono text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              {/* Total Value Preview */}
              {price && shares && (
                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40">Notional Value</span>
                    <span className="text-lg font-bold text-indigo-400 font-mono">
                      {(parseFloat(price) * parseInt(shares)).toLocaleString()} SOL
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !assetId || !price || !shares}
                className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-wider text-sm transition-all disabled:opacity-30 ${
                  side === 'bid'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {loading ? 'Routing to Matching Engine...' : `Submit Hidden ${side === 'bid' ? 'BUY' : 'SELL'} Order`}
              </button>
            </div>

            {/* Result Feedback */}
            {submitResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-4 rounded-xl border ${
                  submitResult.success
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}
              >
                {submitResult.success ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-400" />
                    <span className="text-emerald-400 text-sm font-bold">Order accepted. ID: {submitResult.order?.orderId}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-400" />
                    <span className="text-red-400 text-sm font-bold">{submitResult.error}</span>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Active Orders — Right Panel */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl bg-[#09110D] border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-sm font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
                <Activity size={14} className="text-indigo-400" /> My Hidden Orders
              </h3>
              <span className="text-xs text-white/20 font-mono">{myOrders.length} active</span>
            </div>

            {ordersLoading ? (
              <div className="p-12 text-center text-white/30 text-sm">Scanning dark book...</div>
            ) : myOrders.length === 0 ? (
              <div className="p-12 text-center">
                <EyeOff size={48} className="mx-auto text-white/10 mb-4" />
                <p className="text-white/30 text-sm">No active dark orders. Your block trades are completely private.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] uppercase font-black tracking-widest text-white/30">
                      <th className="p-4 px-6">Side</th>
                      <th className="p-4">Asset</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Size</th>
                      <th className="p-4">Filled</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Expires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {myOrders.map((order, i) => (
                      <motion.tr
                        key={order.orderId || i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="hover:bg-white/[0.01] transition-colors"
                      >
                        <td className="p-4 px-6">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                            order.side === 'bid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {order.side}
                          </span>
                        </td>
                        <td className="p-4 text-white/60 font-mono text-xs">{String(order.assetId).substring(0, 8)}...</td>
                        <td className="p-4 text-white font-mono">{order.pricePerShare} SOL</td>
                        <td className="p-4 text-white font-mono">{order.shares?.toLocaleString()}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${(order.filledShares / order.shares) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-white/40">{order.filledShares || 0}/{order.shares}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                            order.status === 'open' ? 'bg-blue-500/10 text-blue-400'
                              : order.status === 'filled' ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-white/5 text-white/30'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-4 text-white/30 text-xs">{new Date(order.expiresAt).toLocaleDateString()}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Protocol Info */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              { label: 'Execution', value: 'Midpoint', sub: 'Fair price between bid & ask', icon: BarChart3 },
              { label: 'Compliance', value: 'V2 Enforced', sub: 'Tier + jurisdiction validated', icon: Shield },
              { label: 'Settlement', value: 'Atomic', sub: 'Solana on-chain finality', icon: Zap },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-[#09110D] border border-white/5">
                <item.icon size={16} className="text-indigo-400 mb-2" />
                <div className="text-xs text-white/30 uppercase font-bold tracking-wider">{item.label}</div>
                <div className="text-sm text-white font-bold mt-1">{item.value}</div>
                <div className="text-[10px] text-white/20 mt-0.5">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
