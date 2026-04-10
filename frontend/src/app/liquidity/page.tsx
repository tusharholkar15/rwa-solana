'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Droplets, ArrowUpDown, TrendingUp, TrendingDown, Plus,
  RefreshCw, BarChart3, ArrowRight, ChevronDown, Zap,
  BookOpen, Activity,
} from 'lucide-react';
import { api } from '@/lib/api';

export default function LiquidityPage() {
  const [pools, setPools] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedPool, setSelectedPool] = useState<any>(null);
  const [orderbook, setOrderbook] = useState<any>(null);
  const [tab, setTab] = useState<'amm' | 'otc'>('amm');
  const [swapDirection, setSwapDirection] = useState<'buy' | 'sell'>('buy');
  const [swapAmount, setSwapAmount] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [swapResult, setSwapResult] = useState<any>(null);

  // OTC form
  const [otcSide, setOtcSide] = useState<'bid' | 'ask'>('bid');
  const [otcShares, setOtcShares] = useState('');
  const [otcPrice, setOtcPrice] = useState('');
  const [selectedAssetForOtc, setSelectedAssetForOtc] = useState('');
  const [otcResult, setOtcResult] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [poolsData, assetData] = await Promise.all([
          api.getLiquidityPools(),
          api.getAssets({ limit: 20 }),
        ]);
        setPools(poolsData.pools || []);
        setAssets(assetData.assets || []);
        if (poolsData.pools?.[0]) {
          setSelectedPool(poolsData.pools[0]);
        }
        if (assetData.assets?.[0]) {
          setSelectedAssetForOtc(assetData.assets[0]._id);
        }
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  // Fetch OTC orderbook when asset changes
  useEffect(() => {
    if (!selectedAssetForOtc) return;
    const load = async () => {
      try {
        const ob = await api.getOTCOrderbook(selectedAssetForOtc);
        setOrderbook(ob);
      } catch (e) { console.error(e); }
    };
    load();
  }, [selectedAssetForOtc]);

  // Preview swap
  useEffect(() => {
    if (!selectedPool || !swapAmount || Number(swapAmount) <= 0) {
      setPreview(null); return;
    }
    const timer = setTimeout(async () => {
      try {
        const p = await api.getSwapPreview(selectedPool.poolId, swapDirection, Number(swapAmount));
        setPreview(p);
      } catch (e) { setPreview(null); }
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedPool, swapDirection, swapAmount]);

  const handleSwap = async () => {
    if (!selectedPool || !swapAmount) return;
    setLoading(true);
    try {
      const result = await api.executeSwap({
        poolId: selectedPool.poolId,
        direction: swapDirection,
        amount: Number(swapAmount),
        walletAddress: 'DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        maxSlippage: 0.05,
      });
      setSwapResult(result.trade);
      setSwapAmount('');
      setPreview(null);
    } catch (e: any) {
      alert(e.message || 'Swap failed');
    }
    setLoading(false);
  };

  const handlePlaceOTC = async () => {
    if (!selectedAssetForOtc || !otcShares || !otcPrice) return;
    setLoading(true);
    try {
      const result = await api.placeOTCOrder({
        assetId: selectedAssetForOtc,
        walletAddress: 'DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        side: otcSide,
        shares: Number(otcShares),
        pricePerShare: Number(otcPrice),
      });
      setOtcResult(result.order);
      // Refresh orderbook
      const ob = await api.getOTCOrderbook(selectedAssetForOtc);
      setOrderbook(ob);
    } catch (e: any) {
      alert(e.message || 'Order failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface-950 pb-20">
      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Droplets size={22} className="text-white" />
                </div>
                <h1 className="text-3xl font-display font-bold text-white">Liquidity & Trading</h1>
              </div>
              <p className="text-white/40">AMM liquidity pools and OTC order book for tokenized assets</p>
            </div>
            {/* Tab Toggle */}
            <div className="flex gap-2">
              {[{ key: 'amm', label: 'AMM Pool', icon: Droplets }, { key: 'otc', label: 'OTC Book', icon: BookOpen }].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as any)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    tab === t.key
                      ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                      : 'bg-white/5 border border-white/10 text-white/40 hover:text-white'
                  }`}
                >
                  <t.icon size={16} /> {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        {/* ─── AMM Pool Tab ─────────────────────────────────────── */}
        {tab === 'amm' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Pool Stats */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-sm text-white/40 uppercase tracking-wider font-bold mb-4">Active Pools</h3>
              {pools.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center">
                  <Droplets size={32} className="mx-auto text-white/10 mb-3" />
                  <p className="text-white/30 text-sm">No pools yet.</p>
                  <p className="text-white/20 text-xs mt-1">Pools are created when assets are traded.</p>
                </div>
              ) : (
                pools.map((pool, i) => (
                  <motion.div
                    key={pool.poolId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedPool(pool)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${
                      selectedPool?.poolId === pool.poolId
                        ? 'border-cyan-500/30 bg-cyan-500/5'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white">{pool.assetSymbol}/SOL</span>
                      <span className="text-xs text-cyan-400 font-bold">{(pool.feeRate * 100).toFixed(1)}% fee</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-white/40">
                      <div>TVL<div className="text-white font-medium">{pool.tvl?.toFixed(2)} SOL</div></div>
                      <div>Price<div className="text-white font-medium">{pool.pricePerToken?.toFixed(6)} SOL</div></div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Swap Interface */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/5"
              >
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <ArrowUpDown size={18} className="text-cyan-400" /> Swap Tokens
                </h3>

                {!selectedPool ? (
                  <div className="text-center py-16 text-white/30">
                    <Droplets size={48} className="mx-auto mb-3 opacity-20" />
                    <p>No active pools available.</p>
                    <p className="text-xs mt-2">Pools are created automatically when assets are traded on the platform.</p>
                  </div>
                ) : (
                  <>
                    {/* Direction Toggle */}
                    <div className="flex gap-3 mb-6">
                      {[
                        { key: 'buy', label: 'Buy Tokens with SOL', icon: TrendingUp, color: 'emerald' },
                        { key: 'sell', label: 'Sell Tokens for SOL', icon: TrendingDown, color: 'red' },
                      ].map(d => (
                        <button
                          key={d.key}
                          onClick={() => { setSwapDirection(d.key as any); setSwapAmount(''); setPreview(null); }}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                            swapDirection === d.key
                              ? d.key === 'buy'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                              : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/10'
                          }`}
                        >
                          <d.icon size={16} />
                          {d.label}
                        </button>
                      ))}
                    </div>

                    {/* Pool Info */}
                    <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                      {[
                        { label: 'Token Reserve', value: selectedPool.tokenReserve?.toFixed(0) },
                        { label: 'SOL Reserve', value: selectedPool.solReserve?.toFixed(4) },
                        { label: 'Price', value: `${selectedPool.pricePerToken?.toFixed(6)} SOL` },
                      ].map((s, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="text-xs text-white/30 mb-1">{s.label}</div>
                          <div className="text-sm font-bold text-white">{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Amount Input */}
                    <div className="mb-4">
                      <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block font-bold">
                        {swapDirection === 'buy' ? 'SOL Amount to Spend' : 'Token Amount to Sell'}
                      </label>
                      <input
                        type="number"
                        value={swapAmount}
                        onChange={e => setSwapAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white/[0.03] border border-white/10 text-white rounded-xl px-4 py-4 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/50 placeholder-white/20"
                      />
                    </div>

                    {/* Preview */}
                    {preview && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10"
                      >
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div className="text-center">
                            <div className="text-white/30 text-xs mb-1">You'll receive</div>
                            <div className="font-bold text-white">{preview.estimatedOut}</div>
                            <div className="text-xs text-white/30">
                              {swapDirection === 'buy' ? 'tokens' : 'SOL'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-white/30 text-xs mb-1">Price Impact</div>
                            <div className={`font-bold ${preview.priceImpact > 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {preview.priceImpact}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-white/30 text-xs mb-1">Fee (0.3%)</div>
                            <div className="font-bold text-white/60">{preview.fee}</div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Swap Button */}
                    <button
                      onClick={handleSwap}
                      disabled={loading || !swapAmount || !preview}
                      className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                        swapDirection === 'buy'
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      <Zap size={20} />
                      {loading ? 'Processing...' : `${swapDirection === 'buy' ? 'Buy' : 'Sell'} Tokens`}
                    </button>

                    {/* Swap Result */}
                    {swapResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm"
                      >
                        <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                          ✅ Swap successful!
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-white/50">
                          <div>Tokens: <span className="text-white">{swapResult.tokensOut > 0 ? swapResult.tokensOut : '—'}</span></div>
                          <div>SOL: <span className="text-white">{swapResult.solOut > 0 ? swapResult.solOut : '—'}</span></div>
                          <div>Fee: <span className="text-white">{swapResult.fee}</span></div>
                          <div>Impact: <span className="text-amber-400">{swapResult.priceImpact}%</span></div>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            </div>
          </div>
        )}

        {/* ─── OTC Order Book Tab ────────────────────────────────── */}
        {tab === 'otc' && (
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Place Order */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/5"
              >
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Plus size={18} className="text-cyan-400" /> Place OTC Order
                </h3>
                <div className="space-y-4">
                  {/* Asset Select */}
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block font-bold">Asset</label>
                    <select
                      value={selectedAssetForOtc}
                      onChange={e => setSelectedAssetForOtc(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      {assets.map(a => (
                        <option key={a._id} value={a._id} className="bg-gray-900">
                          {a.symbol} — {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Side */}
                  <div className="flex gap-3">
                    {[{ key: 'bid', label: 'BID (Buy)', color: 'emerald' }, { key: 'ask', label: 'ASK (Sell)', color: 'red' }].map(s => (
                      <button
                        key={s.key}
                        onClick={() => setOtcSide(s.key as any)}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                          otcSide === s.key
                            ? s.key === 'bid'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-red-500/10 border-red-500/30 text-red-400'
                            : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/10'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Shares */}
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block font-bold">Number of Shares</label>
                    <input
                      type="number"
                      value={otcShares}
                      onChange={e => setOtcShares(e.target.value)}
                      placeholder="100"
                      className="w-full bg-white/[0.03] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 placeholder-white/20"
                    />
                  </div>

                  {/* Price per Share */}
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block font-bold">Price per Share (lamports)</label>
                    <input
                      type="number"
                      value={otcPrice}
                      onChange={e => setOtcPrice(e.target.value)}
                      placeholder="1000000000"
                      className="w-full bg-white/[0.03] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 placeholder-white/20"
                    />
                  </div>

                  {otcShares && otcPrice && (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-sm text-white/40">
                      Total Value: <span className="text-white font-bold">
                        {(Number(otcShares) * Number(otcPrice) / 1e9).toFixed(4)} SOL
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handlePlaceOTC}
                    disabled={loading || !otcShares || !otcPrice}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${
                      otcSide === 'bid'
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    } disabled:opacity-30`}
                  >
                    {loading ? 'Placing...' : `Place ${otcSide.toUpperCase()} Order`}
                  </button>

                  {otcResult && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm"
                    >
                      <div className="text-emerald-400 font-bold mb-1">✅ Order placed!</div>
                      <div className="text-white/40 font-mono text-xs">{otcResult.orderId}</div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Order Book */}
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/5"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity size={18} className="text-cyan-400" /> Order Book
                  </h3>
                  {orderbook?.spread != null && (
                    <div className="text-xs text-white/40">
                      Spread: <span className="text-white font-bold">{(orderbook.spread / 1e9).toFixed(4)} SOL</span>
                      {orderbook.spreadPercent && (
                        <span className="text-white/30 ml-1">({orderbook.spreadPercent.toFixed(2)}%)</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Bids */}
                  <div>
                    <div className="text-xs text-emerald-400 uppercase tracking-wider font-bold mb-3 flex items-center gap-2">
                      <TrendingUp size={12} /> Bids ({orderbook?.bids?.length || 0})
                    </div>
                    <div className="text-xs text-white/30 grid grid-cols-3 mb-2 px-2">
                      <span>Price (SOL)</span><span>Shares</span><span>Value</span>
                    </div>
                    {(orderbook?.bids || []).length === 0 ? (
                      <div className="text-center py-8 text-white/20 text-sm">No bids</div>
                    ) : (
                      orderbook.bids.map((bid: any, i: number) => (
                        <div key={i} className="relative grid grid-cols-3 text-xs py-1.5 px-2 hover:bg-emerald-500/5 rounded transition-colors">
                          <div
                            className="absolute inset-0 rounded bg-emerald-500/5"
                            style={{ width: `${Math.min(100, (bid.shares / (orderbook.totalBidVolume || 1)) * 100)}%` }}
                          />
                          <span className="relative text-emerald-400 font-bold">{(bid.pricePerShare / 1e9).toFixed(4)}</span>
                          <span className="relative text-white/70">{bid.shares}</span>
                          <span className="relative text-white/40">{(bid.totalValue / 1e9).toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Asks */}
                  <div>
                    <div className="text-xs text-red-400 uppercase tracking-wider font-bold mb-3 flex items-center gap-2">
                      <TrendingDown size={12} /> Asks ({orderbook?.asks?.length || 0})
                    </div>
                    <div className="text-xs text-white/30 grid grid-cols-3 mb-2 px-2">
                      <span>Price (SOL)</span><span>Shares</span><span>Value</span>
                    </div>
                    {(orderbook?.asks || []).length === 0 ? (
                      <div className="text-center py-8 text-white/20 text-sm">No asks</div>
                    ) : (
                      orderbook.asks.map((ask: any, i: number) => (
                        <div key={i} className="relative grid grid-cols-3 text-xs py-1.5 px-2 hover:bg-red-500/5 rounded transition-colors">
                          <div
                            className="absolute inset-0 rounded bg-red-500/5"
                            style={{ width: `${Math.min(100, (ask.shares / (orderbook.totalAskVolume || 1)) * 100)}%` }}
                          />
                          <span className="relative text-red-400 font-bold">{(ask.pricePerShare / 1e9).toFixed(4)}</span>
                          <span className="relative text-white/70">{ask.shares}</span>
                          <span className="relative text-white/40">{(ask.totalValue / 1e9).toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {orderbook && (
                  <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-2 gap-4 text-sm">
                    <div className="text-white/30">Total Bid Volume: <span className="text-white font-medium">{orderbook.totalBidVolume || 0} shares</span></div>
                    <div className="text-white/30">Total Ask Volume: <span className="text-white font-medium">{orderbook.totalAskVolume || 0} shares</span></div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
