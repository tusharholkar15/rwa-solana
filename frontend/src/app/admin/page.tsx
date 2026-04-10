'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Building2, Activity, DollarSign, BarChart3,
  Plus, Check, X, Clock, Globe, Server, Layers, Zap, ArrowRight,
  Database, ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber, ASSET_TYPES } from '@/lib/constants';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Add asset form
  const [form, setForm] = useState({
    name: '', symbol: '', description: '', assetType: 'residential',
    propertyValue: '', totalSupply: '', pricePerToken: '', annualYieldBps: '',
    city: '', country: '',
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const res = await api.getAdminStats();
      setStats(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setMessage('');
    try {
      await api.createAsset({
        name: form.name,
        symbol: form.symbol.toUpperCase(),
        description: form.description,
        assetType: form.assetType,
        propertyValue: Number(form.propertyValue),
        totalSupply: Number(form.totalSupply),
        pricePerToken: Number(form.pricePerToken),
        annualYieldBps: Number(form.annualYieldBps),
        location: { city: form.city, country: form.country },
        authority: 'admin',
      });
      setMessage('✅ Asset created successfully!');
      setForm({ name: '', symbol: '', description: '', assetType: 'residential', propertyValue: '', totalSupply: '', pricePerToken: '', annualYieldBps: '', city: '', country: '' });
      loadStats();
    } catch (e: any) {
      setMessage(`❌ ${e.message}`);
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 pt-10 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ─── Institutional Header ───────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <ShieldCheck size={20} className="text-indigo-400" />
               </div>
               <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Protocol Governance & Administration</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-2">
              Issuer<span className="text-indigo-400">Hub</span>
            </h1>
            <div className="flex items-center gap-4 text-sm font-medium">
               <span className="text-white/30">Protocol Authority:</span>
               <span className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">Master Admin Active</span>
               <div className="h-4 w-px bg-white/10 mx-1" />
               <div className="flex items-center gap-1.5 text-white/40 font-bold uppercase tracking-tighter text-[10px]">
                 <Zap size={12} /> Live Cluster: {stats?.cluster?.network || 'Devnet'}
               </div>
            </div>
          </motion.div>

          <button 
            onClick={() => setShowAddAsset(!showAddAsset)} 
            className="btn-institutional !bg-indigo-600 hover:!bg-indigo-500 shadow-indigo-500/20 flex items-center gap-3 scale-110 md:scale-100"
          >
            <Plus size={20} />
            Tokenize New Asset
          </button>
        </div>

        {/* ─── Global Protocol Stats ─────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Assets', value: stats?.platform?.totalAssets || 0, icon: Building2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Institutionals', value: stats?.platform?.totalUsers || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Whitelisted', value: stats?.platform?.kycApproved || 0, icon: ShieldCheck, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { label: 'Pending KYC', value: stats?.platform?.kycPending || 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Protocol TVL', value: `${formatNumber(stats?.platform?.totalVolume || 0)} l.`, icon: Database, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Oracle SOL', value: formatCurrency(stats?.market?.solPrice || 0), icon: BarChart3, color: 'text-teal-400', bg: 'bg-teal-500/10' },
          ].map((s, i) => (
            <motion.div 
              key={s.label} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.05 }} 
              className="institutional-glass p-6 bg-white/[0.01] group hover:border-white/10 transition-all"
            >
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div className="text-3xl font-display font-black text-white mb-1">{s.value}</div>
              <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{s.label}</div>
            </motion.div>
          ))}
          <div className="col-span-2 institutional-glass p-6 bg-emerald-500/[0.03] border-emerald-500/20 flex items-center justify-between">
             <div>
                <div className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest mb-1">On-Chain Activity</div>
                <div className="text-2xl font-display font-black text-white">{stats?.platform?.totalTransactions || 0} Events</div>
             </div>
             <div className="flex gap-1 h-12 items-end">
                {[40, 70, 45, 90, 65, 80, 50, 85].map((h, i) => (
                  <div key={i} className="w-1.5 bg-emerald-500/40 rounded-t-sm" style={{ height: `${h}%` }} />
                ))}
             </div>
          </div>
        </div>

        {/* ─── Asset Creation Module ─────────────────────── */}
        <AnimatePresence>
          {showAddAsset && (
            <motion.div 
               initial={{ opacity: 0, height: 0 }} 
               animate={{ opacity: 1, height: 'auto' }} 
               exit={{ opacity: 0, height: 0 }} 
               className="overflow-hidden mb-12"
            >
              <div className="institutional-glass p-10 bg-indigo-500/[0.02] border-indigo-500/10">
                <div className="flex items-center justify-between mb-10">
                   <h3 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                      <Plus size={24} className="text-indigo-400" />
                      Tokenize New Real World Asset
                   </h3>
                   <button onClick={() => setShowAddAsset(false)} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <X size={20} className="text-white/20" />
                   </button>
                </div>

                <form onSubmit={handleAddAsset} className="grid sm:grid-cols-3 gap-8">
                  <div className="sm:col-span-2 space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Asset Name</label>
                          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input-institutional" placeholder="e.g., Manhattan Plaza West" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Symbol (Token Ticker)</label>
                          <input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} required className="input-institutional" placeholder="e.g., MPH" maxLength={10} />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Legal Description & Metadata</label>
                       <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="input-institutional h-32 resize-none" placeholder="Provide full regulatory and property details..." />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Location City</label>
                          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-institutional" placeholder="e.g., New York" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Country</label>
                          <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input-institutional" placeholder="e.g., USA" />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6 bg-white/[0.02] p-8 rounded-2xl border border-white/5">
                    <div className="space-y-2">
                       <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Asset Class</label>
                       <select value={form.assetType} onChange={(e) => setForm({ ...form, assetType: e.target.value })} className="input-institutional !bg-surface-950">
                         {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Property Value (USD)</label>
                       <input type="number" value={form.propertyValue} onChange={(e) => setForm({ ...form, propertyValue: e.target.value })} required className="input-institutional" placeholder="e.g., 5000000" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Token Supply</label>
                       <input type="number" value={form.totalSupply} onChange={(e) => setForm({ ...form, totalSupply: e.target.value })} required className="input-institutional" placeholder="e.g., 100000" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Yield (BPS)</label>
                       <input type="number" value={form.annualYieldBps} onChange={(e) => setForm({ ...form, annualYieldBps: e.target.value })} className="input-institutional" placeholder="e.g., 850 (8.5%)" />
                    </div>
                  </div>

                  <div className="sm:col-span-3 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/30 text-xs font-bold uppercase tracking-widest">
                       <ShieldCheck size={16} className="text-emerald-500" />
                       Authorized via Master Multisig
                    </div>
                    <div className="flex gap-4">
                      <button type="button" onClick={() => setShowAddAsset(false)} className="btn-secondary-institutional !px-8">Discard</button>
                      <button type="submit" disabled={addLoading} className="btn-institutional !bg-indigo-600 !px-12 flex items-center gap-3 shadow-lg shadow-indigo-500/20">
                        {addLoading ? 'Deploying...' : <><Zap size={18} /> Initialize On-Chain</>}
                      </button>
                    </div>
                  </div>
                </form>
                {message && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-8 p-4 rounded-xl text-xs font-bold text-center border ${message.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                    {message}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Recent Protocol Events ────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-10">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 institutional-glass overflow-hidden bg-white/[0.01]">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-display font-bold text-xl text-white flex items-center gap-4">
                   <Activity size={20} className="text-white/40" />
                   Recent Chain Events
                </h3>
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Live Stream</span>
              </div>
              
              {stats?.recentTransactions?.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {stats.recentTransactions.map((tx: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-8 py-5 hover:bg-white/[0.02] transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-black text-[10px] uppercase tracking-tighter ${tx.type === 'buy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                           {tx.type}
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-wide text-xs">{tx.assetName || 'Institutional Asset'}</div>
                          <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{tx.wallet?.slice(0, 12)}...</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">{tx.shares.toLocaleString()} Units</div>
                        <div className="text-[9px] text-white/30 font-medium tracking-tight flex items-center justify-end gap-1 uppercase">
                           <Clock size={10} /> {new Date(tx.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center flex flex-col items-center">
                   <Database size={48} className="text-white/5 mb-6" />
                   <div className="text-white/20 text-xs font-black uppercase tracking-[0.25em]">No recent activity detected</div>
                </div>
              )}
           </motion.div>

           <div className="space-y-8">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="institutional-glass p-8 bg-indigo-500/[0.02] border-indigo-500/20">
                 <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-8">System Health</h4>
                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <span className="text-xs text-white/60 font-bold">Mainnet Bridge</span>
                       <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-xs text-white/60 font-bold">Oracle Sync</span>
                       <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-xs text-white/60 font-bold">Compliance API</span>
                       <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </div>
                 </div>
                 <div className="mt-10 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-2">Primary Authority</div>
                    <div className="text-xs font-mono text-white/60 truncate">0x92...8fa2</div>
                 </div>
              </motion.div>

              <div className="institutional-glass p-8 bg-white/[0.01]">
                 <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-6">Master Action Logs</h4>
                 <div className="space-y-4">
                    {[
                      { ev: "Asset Whitelisted", time: "2m ago" },
                      { ev: "Protocol Fee Updated", time: "1h ago" },
                      { ev: "Admin Added", time: "4d ago" }
                    ].map((l, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px] font-bold tracking-tight">
                         <span className="text-white/60">{l.ev}</span>
                         <span className="text-white/20 uppercase tracking-widest">{l.time}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
