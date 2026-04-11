'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Building2, Activity, DollarSign, BarChart3,
  Plus, Check, X, Clock, Globe, Server, Layers, Zap, ArrowRight,
  Database, ShieldCheck, FileSearch, UserCog, AlertTriangle,
  CheckCircle2, XCircle, Loader2, RefreshCw,
} from 'lucide-react';
import AuthGate from '@/components/shared/AuthGate';

type AdminTab = 'overview' | 'verification' | 'roles';

export default function AdminPage() {
  const { publicKey } = useWallet();
  const { toast } = useToast();

  return (
    <AuthGate 
      allowedRoles={['admin', 'issuer']} 
      title="Issuer Hub Restricted"
      description="You must be an authorized issuer or platform administrator to access the tokenization hub and verification queue."
    >
      <AdminContent />
    </AuthGate>
  );
}

function AdminContent() {
  const { publicKey } = useWallet();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Verification Queue
  const [queue, setQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject'; assetId: string; assetName: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // RBAC
  const [roleForm, setRoleForm] = useState({ walletAddress: '', role: 'investor' });
  const [roleLoading, setRoleLoading] = useState(false);

  // Add asset form
  const [form, setForm] = useState({
    name: '', symbol: '', description: '', assetType: 'residential',
    propertyValue: '', totalSupply: '', pricePerToken: '', annualYieldBps: '',
    city: '', country: '',
  });

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'verification') loadQueue();
  }, [activeTab]);

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

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await api.getVerificationQueue();
      setQueue(res.assets || []);
    } catch (e: any) {
      console.warn('Queue fetch:', e.message);
      setQueue([]);
    } finally {
      setQueueLoading(false);
    }
  }, []);

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
      toast('success', 'Asset Created', `${form.name} has been tokenized.`);
      setForm({ name: '', symbol: '', description: '', assetType: 'residential', propertyValue: '', totalSupply: '', pricePerToken: '', annualYieldBps: '', city: '', country: '' });
      loadStats();
    } catch (e: any) {
      setMessage(`❌ ${e.message}`);
      toast('error', 'Creation Failed', e.message);
    } finally {
      setAddLoading(false);
    }
  }

  async function handleVerificationAction() {
    if (!confirmAction || !publicKey) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === 'approve') {
        await api.approveAssetVerification(confirmAction.assetId, {
          fraudScore: 10,
          verifierWallet: publicKey.toBase58(),
        });
        toast('success', 'Asset Approved', `${confirmAction.assetName} has been verified.`);
      } else {
        await api.rejectAssetVerification(confirmAction.assetId, {
          reason: 'Failed verification review',
          verifierWallet: publicKey.toBase58(),
        });
        toast('warning', 'Asset Rejected', `${confirmAction.assetName} was sent back to pending.`);
      }
      loadQueue();
    } catch (e: any) {
      toast('error', 'Action Failed', e.message);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  }

  async function handleAssignRole() {
    if (!publicKey || !roleForm.walletAddress) {
      toast('warning', 'Missing Fields', 'Provide a wallet address and connect your admin wallet.');
      return;
    }
    setRoleLoading(true);
    try {
      await api.assignRole(
        { walletAddress: roleForm.walletAddress, role: roleForm.role },
        {
          'x-wallet-address': publicKey.toBase58(),
          'x-wallet-signature': 'admin-dev',
          'x-wallet-message': 'role-assignment',
        }
      );
      toast('success', 'Role Assigned', `${roleForm.role} role granted to ${roleForm.walletAddress.slice(0, 8)}...`);
      setRoleForm({ walletAddress: '', role: 'investor' });
    } catch (e: any) {
      toast('error', 'Role Assignment Failed', e.message);
    } finally {
      setRoleLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 pt-10 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><DashboardSkeleton /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 pt-10 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ─── Header ───────────────────────── */}
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
               <span className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">
                 {publicKey ? 'Admin Active' : 'Connect Wallet'}
               </span>
            </div>
          </motion.div>

          <div className="flex items-center gap-3">
            {/* Tab selector */}
            <div className="p-1 rounded-xl bg-white/5 border border-white/10 flex">
              {([
                { key: 'overview', label: 'Overview', icon: BarChart3 },
                { key: 'verification', label: 'Verification', icon: FileSearch },
                { key: 'roles', label: 'RBAC', icon: UserCog },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === t.key
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-white/30 hover:text-white'
                  }`}
                >
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <button 
                onClick={() => setShowAddAsset(!showAddAsset)} 
                className="btn-institutional !bg-indigo-600 hover:!bg-indigo-500 shadow-indigo-500/20 flex items-center gap-3"
              >
                <Plus size={20} />
                Tokenize
              </button>
            )}
          </div>
        </div>

        {/* ═══ OVERVIEW TAB ═══════════════════════════════════ */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[
                { label: 'Total Assets', value: stats?.platform?.totalAssets || 0, icon: Building2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Institutionals', value: stats?.platform?.totalUsers || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'Whitelisted', value: stats?.platform?.kycApproved || 0, icon: ShieldCheck, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                { label: 'Pending KYC', value: stats?.platform?.kycPending || 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
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
            </div>

            {/* Asset Creation Module */}
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
                              <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Symbol</label>
                              <input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} required className="input-institutional" placeholder="e.g., MPH" maxLength={10} />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Description</label>
                           <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="input-institutional h-32 resize-none" placeholder="Provide full details..." />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">City</label>
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
                           <input type="number" value={form.propertyValue} onChange={(e) => setForm({ ...form, propertyValue: e.target.value })} required className="input-institutional" placeholder="5000000" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Token Supply</label>
                           <input type="number" value={form.totalSupply} onChange={(e) => setForm({ ...form, totalSupply: e.target.value })} required className="input-institutional" placeholder="100000" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Yield (BPS)</label>
                           <input type="number" value={form.annualYieldBps} onChange={(e) => setForm({ ...form, annualYieldBps: e.target.value })} className="input-institutional" placeholder="850 (8.5%)" />
                        </div>
                      </div>

                      <div className="sm:col-span-3 pt-6 border-t border-white/5 flex items-center justify-end gap-4">
                        <button type="button" onClick={() => setShowAddAsset(false)} className="btn-secondary-institutional !px-8">Discard</button>
                        <button type="submit" disabled={addLoading} className="btn-institutional !bg-indigo-600 !px-12 flex items-center gap-3 shadow-lg shadow-indigo-500/20">
                          {addLoading ? 'Deploying...' : <><Zap size={18} /> Initialize On-Chain</>}
                        </button>
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

            {/* Recent Events */}
            <div className="institutional-glass overflow-hidden bg-white/[0.01]">
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
                          <div className="font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-wide text-xs">{tx.assetName || 'Asset'}</div>
                          <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{tx.wallet?.slice(0, 12)}...</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">{tx.shares?.toLocaleString()} Units</div>
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
            </div>
          </>
        )}

        {/* ═══ VERIFICATION TAB ═══════════════════════════════ */}
        {activeTab === 'verification' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                <FileSearch size={24} className="text-indigo-400" />
                Verification Queue
              </h2>
              <button onClick={loadQueue} className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <RefreshCw size={16} className={`text-white/40 ${queueLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {queueLoading ? (
              <div className="institutional-glass overflow-hidden">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={5} />)}
              </div>
            ) : queue.length === 0 ? (
              <div className="p-20 institutional-glass bg-white/[0.01] text-center">
                <CheckCircle2 size={48} className="text-emerald-500/20 mx-auto mb-6" />
                <h3 className="text-xl font-display font-bold text-white mb-2">Queue Clear</h3>
                <p className="text-white/30 text-sm">All assets have been verified. No pending reviews.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {queue.map((asset, i) => (
                  <motion.div
                    key={asset._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="institutional-glass p-6 bg-white/[0.01]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <Building2 size={24} className="text-amber-400" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-lg">{asset.name}</div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-white/40">{asset.symbol}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 uppercase tracking-widest">
                              {asset.assetType}
                            </span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest border ${
                              asset.lifecycleStatus === 'under_review'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-white/5 text-white/40 border-white/10'
                            }`}>
                              {asset.lifecycleStatus}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Fraud Score */}
                        <div className="text-center">
                          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Fraud Score</div>
                          <div className={`text-lg font-bold font-display ${
                            (asset.verificationData?.fraudScore || 0) > 30 ? 'text-rose-400' :
                            (asset.verificationData?.fraudScore || 0) > 15 ? 'text-amber-400' :
                            'text-emerald-400'
                          }`}>
                            {asset.verificationData?.fraudScore ?? 'N/A'}
                          </div>
                        </div>

                        {/* Documents */}
                        <div className="text-center">
                          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Documents</div>
                          <div className="text-lg font-bold font-display text-white">
                            {asset.verificationData?.documentHashes?.length || 0}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmAction({ type: 'approve', assetId: asset._id, assetName: asset.name })}
                            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            onClick={() => setConfirmAction({ type: 'reject', assetId: asset._id, assetName: asset.name })}
                            className="px-5 py-2.5 rounded-xl bg-white/5 border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Document Hashes */}
                    {asset.verificationData?.documentHashes?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">Legal Documents</div>
                        <div className="flex flex-wrap gap-2">
                          {asset.verificationData.documentHashes.map((doc: any, j: number) => (
                            <div key={j} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs">
                              <FileSearch size={12} className="text-indigo-400" />
                              <span className="text-white/60">{doc.name}</span>
                              <span className="text-white/20 font-mono text-[10px]">{doc.hash?.slice(0, 10)}...</span>
                              {doc.verifiedAt && <CheckCircle2 size={12} className="text-emerald-500" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ RBAC TAB ═══════════════════════════════════════ */}
        {activeTab === 'roles' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="max-w-2xl mx-auto">
              <div className="institutional-glass p-10 bg-white/[0.01]">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <UserCog size={24} className="text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white">RBAC Role Management</h2>
                    <p className="text-sm text-white/40 mt-1">Assign institutional roles to wallet addresses</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">
                      Target Wallet Address
                    </label>
                    <input
                      value={roleForm.walletAddress}
                      onChange={(e) => setRoleForm({ ...roleForm, walletAddress: e.target.value })}
                      className="input-institutional font-mono"
                      placeholder="e.g., DemoWa11etXXXXXXXXXXXXXXXXXXXXXXX..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">
                      Assign Role
                    </label>
                    <select
                      value={roleForm.role}
                      onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })}
                      className="input-institutional !bg-surface-950"
                    >
                      <option value="investor">Investor</option>
                      <option value="issuer">Issuer</option>
                      <option value="admin">Admin</option>
                      <option value="auditor">Auditor</option>
                      <option value="compliance_officer">Compliance Officer</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-white/50 leading-relaxed">
                      <strong className="text-amber-400">Important:</strong> Role assignments are persisted to the database and control access to admin, compliance, and audit endpoints. Only assign admin roles to trusted wallets.
                    </div>
                  </div>

                  <button
                    onClick={handleAssignRole}
                    disabled={roleLoading || !roleForm.walletAddress}
                    className="w-full btn-institutional !bg-indigo-600 flex items-center justify-center gap-3 disabled:opacity-30"
                  >
                    {roleLoading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                    {roleLoading ? 'Assigning...' : 'Assign Role'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </div>

      {/* Verification Confirm Modal */}
      <ConfirmModal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleVerificationAction}
        title={confirmAction?.type === 'approve' ? 'Approve Asset' : 'Reject Asset'}
        description={`Are you sure you want to ${confirmAction?.type} "${confirmAction?.assetName}"? This will update the asset's lifecycle status.`}
        confirmLabel={confirmAction?.type === 'approve' ? 'Approve' : 'Reject'}
        confirmVariant={confirmAction?.type === 'reject' ? 'danger' : 'primary'}
        loading={actionLoading}
      />
    </div>
  );
}
