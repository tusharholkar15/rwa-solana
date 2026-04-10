'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, Banknote, ArrowRight, CheckCircle, Clock,
  IndianRupee, DollarSign, Zap, Shield, Globe, ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/api';

export default function OnrampPage() {
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [amount, setAmount] = useState('');
  const [estimate, setEstimate] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [step, setStep] = useState<'select' | 'payment' | 'success'>('select');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fxRates, setFxRates] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [assetData, rates] = await Promise.all([
          api.getAssets({ limit: 20 }),
          api.getFxRates(),
        ]);
        setAssets(assetData.assets || []);
        setFxRates(rates);
        if (assetData.assets?.length > 0) setSelectedAsset(assetData.assets[0]);
      } catch (e) { console.error(e); }
    };
    loadData();
  }, []);

  // Fetch estimate when amount or currency changes
  useEffect(() => {
    if (!amount || !selectedAsset || Number(amount) <= 0) {
      setEstimate(null); return;
    }
    const timer = setTimeout(async () => {
      try {
        const est = await api.getFiatEstimate(Number(amount), currency, selectedAsset.pricePerToken);
        setEstimate(est);
      } catch (e) { console.error(e); }
    }, 300);
    return () => clearTimeout(timer);
  }, [amount, currency, selectedAsset]);

  const handleCreateOrder = async () => {
    if (!selectedAsset || !estimate) return;
    setLoading(true);
    try {
      const result = await api.createFiatOrder({
        currency,
        amount: Number(amount),
        walletAddress: 'DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        assetId: selectedAsset._id,
        shares: estimate.estimatedTokens || 1,
      });
      setOrder(result.order);
      setStep('payment');
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSimulateSuccess = async () => {
    if (!order) return;
    setLoading(true);
    try {
      await api.simulatePayment(order.orderId);
      setStep('success');
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const quickAmounts = currency === 'INR'
    ? [5000, 10000, 25000, 50000, 100000]
    : [50, 100, 250, 500, 1000];

  return (
    <div className="min-h-screen bg-surface-950 pb-20">
      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
              <Banknote size={22} className="text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white">Invest with Fiat</h1>
          </div>
          <p className="text-white/40">Buy tokenized real estate using INR (UPI/Bank Transfer) or USD (Card/Wire)</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8">
        {step === 'select' && (
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left: Input Form */}
            <div className="lg:col-span-3 space-y-6">
              {/* Currency Toggle */}
              <div className="flex gap-3">
                {(['INR', 'USD'] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => { setCurrency(c); setAmount(''); setEstimate(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all ${
                      currency === c
                        ? 'bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/[0.03] border-2 border-white/5 text-white/40 hover:border-white/10'
                    }`}
                  >
                    {c === 'INR' ? <IndianRupee size={20} /> : <DollarSign size={20} />}
                    {c === 'INR' ? 'Indian Rupee (UPI)' : 'US Dollar (Card)'}
                  </button>
                ))}
              </div>

              {/* Select Asset */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block font-bold">Select Asset</label>
                <select
                  value={selectedAsset?._id || ''}
                  onChange={e => setSelectedAsset(assets.find(a => a._id === e.target.value))}
                  className="w-full bg-white/[0.03] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  {assets.map(a => (
                    <option key={a._id} value={a._id} className="bg-gray-900">
                      {a.name} ({a.symbol}) — {(a.annualYieldBps / 100).toFixed(2)}% yield
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block font-bold">Amount ({currency})</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg">
                    {currency === 'INR' ? '₹' : '$'}
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-white/[0.03] border border-white/10 text-white rounded-xl pl-10 pr-4 py-4 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder-white/20"
                  />
                </div>
                {/* Quick amounts */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {quickAmounts.map(qa => (
                    <button
                      key={qa}
                      onClick={() => setAmount(String(qa))}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-sm hover:bg-white/10 hover:text-white transition-all"
                    >
                      {currency === 'INR' ? '₹' : '$'}{qa.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="text-xs text-white/40 uppercase tracking-wider mb-3 font-bold">Payment Method</div>
                {currency === 'INR' ? (
                  <div className="space-y-2">
                    {['UPI (Recommended)', 'Net Banking', 'Debit/Credit Card'].map(m => (
                      <div key={m} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 cursor-pointer hover:border-emerald-500/30 transition-colors">
                        <div className="w-4 h-4 rounded-full border-2 border-emerald-400 flex items-center justify-center">
                          {m.includes('UPI') && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                        </div>
                        <span className="text-white/70 text-sm font-medium">{m}</span>
                        {m.includes('UPI') && <span className="ml-auto text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md">Instant</span>}
                      </div>
                    ))}
                    <p className="text-xs text-white/30 mt-2">Powered by Razorpay • RBI Compliant</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {['Credit/Debit Card', 'Bank Wire Transfer', 'SEPA Transfer (EU)'].map(m => (
                      <div key={m} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 cursor-pointer hover:border-emerald-500/30 transition-colors">
                        <div className="w-4 h-4 rounded-full border-2 border-emerald-400 flex items-center justify-center">
                          {m.includes('Credit') && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                        </div>
                        <span className="text-white/70 text-sm font-medium">{m}</span>
                      </div>
                    ))}
                    <p className="text-xs text-white/30 mt-2">Powered by Stripe • PCI DSS Certified</p>
                  </div>
                )}
              </div>

              {/* CTA Button */}
              <button
                onClick={handleCreateOrder}
                disabled={!estimate || loading}
                className="w-full py-4 rounded-xl bg-emerald-500 text-white font-bold text-lg hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
              >
                {loading ? 'Processing...' : `Invest ${currency === 'INR' ? '₹' : '$'}${Number(amount || 0).toLocaleString()}`}
                <ArrowRight size={20} />
              </button>
            </div>

            {/* Right: Estimate Card */}
            <div className="lg:col-span-2">
              <div className="sticky top-24 p-6 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10">
                <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4 font-bold">Investment Preview</h3>

                {estimate ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                      <div className="text-xs text-emerald-400/60 mb-1">You'll receive approximately</div>
                      <div className="text-3xl font-bold text-emerald-400">{estimate.estimatedTokens}</div>
                      <div className="text-sm text-white/40">tokens of {selectedAsset?.symbol}</div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between text-white/40">
                        <span>Fiat Amount</span>
                        <span className="text-white">{currency === 'INR' ? '₹' : '$'}{Number(amount).toLocaleString()}</span>
                      </div>
                      {currency !== 'USD' && (
                        <div className="flex justify-between text-white/40">
                          <span>USD Equivalent</span>
                          <span className="text-white">${estimate.usdEquivalent}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-white/40">
                        <span>SOL Amount</span>
                        <span className="text-white">{estimate.solAmount?.toFixed(4)} SOL</span>
                      </div>
                      <div className="flex justify-between text-white/40">
                        <span>SOL Price</span>
                        <span className="text-white">${estimate.solPrice?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white/40">
                        <span>Platform Fee</span>
                        <span className="text-emerald-400">{estimate.platformFee}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-white/30">
                        <Shield size={12} /> Secured by Solana blockchain
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/30">
                        <Zap size={12} /> Tokens delivered in ~4 seconds
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/30">
                        <Globe size={12} /> 24/7 secondary market trading
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-white/20">
                    <Banknote size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Enter an amount to see your investment preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Step (Simulated) */}
        {step === 'payment' && order && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center">
            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
                <Clock size={32} className="text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Payment Pending</h2>
              <p className="text-white/40 mb-6">
                {order.mock ? 'This is a simulated payment in development mode.' : `Complete payment via ${order.provider}`}
              </p>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 mb-6 text-left text-sm space-y-2">
                <div className="flex justify-between text-white/40">
                  <span>Order ID</span><span className="text-white font-mono text-xs">{order.orderId?.slice(0, 20)}...</span>
                </div>
                <div className="flex justify-between text-white/40">
                  <span>Amount</span><span className="text-white">{order.currency === 'INR' ? '₹' : '$'}{order.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-white/40">
                  <span>Provider</span><span className="text-white capitalize">{order.provider}</span>
                </div>
              </div>
              <button onClick={handleSimulateSuccess} disabled={loading} className="w-full py-4 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-50 transition-all">
                {loading ? 'Processing...' : '✅ Simulate Successful Payment'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center">
            <div className="p-8 rounded-2xl bg-white/[0.03] border border-emerald-500/20">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle size={40} className="text-emerald-400" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Investment Successful! 🎉</h2>
              <p className="text-white/40 mb-6">
                Your tokens have been delivered to your Solana wallet. You can now trade them on the secondary market or hold for yield.
              </p>
              <div className="flex gap-3">
                <button onClick={() => { setStep('select'); setAmount(''); setEstimate(null); }} className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 hover:text-white border border-white/10 transition-colors">
                  Invest More
                </button>
                <a href="/portfolio" className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors text-center">
                  View Portfolio
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
