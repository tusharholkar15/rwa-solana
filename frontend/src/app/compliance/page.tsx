'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, FileText, CheckCircle, Clock, AlertTriangle, Upload,
  FileCheck, PenTool, Lock, Scale, Send, LogOut, Database, UserCheck, Key,
  Users, Link2, Unlink, Plus, Trash2
} from 'lucide-react';
import { api } from '@/lib/api';

const TIER_COLORS = {
  0: 'bg-white/10 text-white/40',
  1: 'bg-blue-500/10 text-blue-400',
  2: 'bg-emerald-500/10 text-emerald-400',
  3: 'bg-amber-500/10 text-amber-400',
  4: 'bg-indigo-500/10 text-indigo-400'
};

const TIER_NAMES = ['T0: Unverified', 'T1: Basic KYC', 'T2: Accredited', 'T3: Institutional', 'T4: Sovereign'];

export default function CompliancePage() {
  const [tab, setTab] = useState<'identity' | 'transfer' | 'documents' | 'aml' | 'audit' | 'subaccounts'>('identity');
  const [loading, setLoading] = useState(false);
  const wallet = 'DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // Simulated user wallet
  
  // Identity State
  const [identity, setIdentity] = useState<any>(null);
  
  // Transfer Validator State
  const [transferData, setTransferData] = useState({ toWallet: '', assetId: 'Asset123', amount: 100 });
  const [transferResult, setTransferResult] = useState<any>(null);

  // Audit State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Sub-Accounts State
  const [newChildWallet, setNewChildWallet] = useState('');
  const [subAccountLoading, setSubAccountLoading] = useState(false);
  const [subAccountMessage, setSubAccountMessage] = useState<any>(null);

  // Load identity on mount
  useEffect(() => {
    const loadIdentity = async () => {
      try {
        const id = await api.getComplianceIdentity(wallet);
        if (id && id.status !== 'not_found') {
          setIdentity(id);
        }
      } catch (e) {
        console.error("Failed to load identity");
      }
    };
    loadIdentity();
  }, [wallet]);

  const handleCreateIdentity = async () => {
    setLoading(true);
    try {
      const result = await api.createComplianceIdentity({
        walletAddress: wallet,
        tier: 1, // Start with basic
        jurisdiction: 'GLOBAL'
      });
      setIdentity(result);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleValidateTransfer = async () => {
    setLoading(true);
    try {
      const result = await api.validateTransfer({
        fromWallet: wallet,
        toWallet: transferData.toWallet,
        assetId: transferData.assetId,
        amount: transferData.amount
      });
      setTransferResult(result);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      // Missing proper signing currently, so we use a mock header for demo
      const mockAdminHeaders = {
        'x-wallet-address': 'DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'x-wallet-signature': 'mocked_signature',
        'x-wallet-message': 'auth-message'
      };
      
      const res = await api.getAuditTrail({ walletAddress: wallet }, mockAdminHeaders);
      setAuditLogs(res.events || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'audit') {
      loadAuditLogs();
    }
    if (tab === 'subaccounts') {
      // Re-fetch identity to get latest subAccounts list
      const refresh = async () => {
        try {
          const id = await api.getComplianceIdentity(wallet);
          if (id && id.status !== 'not_found') setIdentity(id);
        } catch (e) { console.error(e); }
      };
      refresh();
    }
  }, [tab]);

  const mockAdminHeaders: Record<string, string> = {
    'x-wallet-address': wallet,
    'x-wallet-signature': 'mocked_signature',
    'x-wallet-message': 'auth-message'
  };

  const handleLinkSubAccount = async () => {
    if (!newChildWallet.trim()) return;
    setSubAccountLoading(true);
    setSubAccountMessage(null);
    try {
      await api.linkSubAccount({ childWallet: newChildWallet.trim() }, mockAdminHeaders);
      setSubAccountMessage({ success: true, text: `Linked ${newChildWallet.substring(0, 12)}... as child wallet` });
      setNewChildWallet('');
      // Refresh identity
      const id = await api.getComplianceIdentity(wallet);
      if (id && id.status !== 'not_found') setIdentity(id);
    } catch (e: any) {
      setSubAccountMessage({ success: false, text: e.message });
    }
    setSubAccountLoading(false);
  };

  const handleUnlinkSubAccount = async (childWallet: string) => {
    setSubAccountLoading(true);
    setSubAccountMessage(null);
    try {
      await api.unlinkSubAccount({ childWallet }, mockAdminHeaders);
      setSubAccountMessage({ success: true, text: `Unlinked ${childWallet.substring(0, 12)}...` });
      const id = await api.getComplianceIdentity(wallet);
      if (id && id.status !== 'not_found') setIdentity(id);
    } catch (e: any) {
      setSubAccountMessage({ success: false, text: e.message });
    }
    setSubAccountLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050B08] pb-20 pt-28">
      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-indigo-600/20 border border-white/10 flex items-center justify-center">
              <Scale size={24} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-white tracking-tight">Institutional Compliance Terminal</h1>
              <p className="text-white/40 text-sm mt-1">Tiered identity, jurisdiction whitelisting, and immutable audit trailing.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 border-b border-white/5 pb-4 overflow-x-auto no-scrollbar">
          {[
            { key: 'identity', label: 'Identity Config', icon: UserCheck },
            { key: 'transfer', label: 'Transfer Validator', icon: Send },
            { key: 'documents', label: 'Document Vault', icon: FileText },
            { key: 'aml', label: 'AML Screening', icon: Shield },
            { key: 'audit', label: 'Immutable Audit Trail', icon: Database },
            { key: 'subaccounts', label: 'Sub-Accounts', icon: Users },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                tab === t.key
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {/* --- Identity Config Tab --- */}
        {tab === 'identity' && (
          <div className="max-w-2xl">
            {identity ? (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-2xl bg-[#09110D] border border-white/5">
                 <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Compliance Identity</h3>
                      <p className="text-xs text-emerald-400 font-mono">{identity.walletAddress}</p>
                    </div>
                    {identity.isFrozen ? (
                       <span className="px-3 py-1 rounded-md text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-widest flex items-center gap-1">
                          <Lock size={12}/> Frozen
                       </span>
                    ) : (
                       <span className="px-3 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle size={12}/> Active
                       </span>
                    )}
                 </div>

                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                       <span className="block text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Clearance Tier</span>
                       <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${TIER_COLORS[identity.complianceTier as 0|1|2|3|4]}`}>
                          {TIER_NAMES[identity.complianceTier]}
                       </div>
                    </div>
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                       <span className="block text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Jurisdiction</span>
                       <span className="text-sm text-white font-mono">{identity.jurisdiction}</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                       <span className="block text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Accreditation</span>
                       <span className="text-sm text-white">{identity.accreditationType.replace(/_/g, ' ').toUpperCase()}</span>
                    </div>
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                       <span className="block text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Valid Until</span>
                       <span className="text-sm text-white">{new Date(identity.expiryTimestamp).toLocaleDateString()}</span>
                    </div>
                 </div>
               </motion.div>
            ) : (
               <div className="p-12 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center">
                  <UserCheck size={48} className="mx-auto text-white/10 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">No Identity Found</h3>
                  <p className="text-white/40 mb-6 text-sm">Your wallet does not have an active compliance identity on this network.</p>
                  <button onClick={handleCreateIdentity} disabled={loading} className="px-6 py-2 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors">
                     {loading ? 'Processing...' : 'Register as Tier 1 (Global)'}
                  </button>
               </div>
            )}
          </div>
        )}

        {/* --- Sub-Accounts Tab --- */}
        {tab === 'subaccounts' && (
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-2xl bg-[#09110D] border border-white/5 mb-6">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users size={18} className="text-indigo-400" /> Institutional Wallet Delegation
                </h3>
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Master → Child Inheritance</span>
              </div>

              {/* Explainer */}
              <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 mb-6">
                <p className="text-xs text-white/50 leading-relaxed">
                  <strong className="text-indigo-400">Master/Child Architecture:</strong> Link sub-wallets (traders, bots, operational hot wallets) to your
                  fully-verified Master identity. Child wallets automatically <strong className="text-white/80">inherit your Compliance Tier and Jurisdiction</strong> for
                  all transfer validations and Dark Pool eligibility checks.
                </p>
              </div>

              {/* Link New */}
              <div className="flex gap-3 mb-8">
                <input
                  value={newChildWallet}
                  onChange={e => setNewChildWallet(e.target.value)}
                  placeholder="Enter child wallet address to link"
                  className="flex-1 bg-white/[0.02] border border-white/10 text-white font-mono text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
                <button
                  onClick={handleLinkSubAccount}
                  disabled={subAccountLoading || !newChildWallet.trim()}
                  className="px-6 py-3 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-600 transition-colors flex items-center gap-2 disabled:opacity-30"
                >
                  <Link2 size={16} /> Link
                </button>
              </div>

              {/* Feedback */}
              {subAccountMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-xl border mb-6 text-sm font-bold flex items-center gap-2 ${
                    subAccountMessage.success
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/5 border-red-500/20 text-red-400'
                  }`}
                >
                  {subAccountMessage.success ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  {subAccountMessage.text}
                </motion.div>
              )}

              {/* Linked Accounts Table */}
              <div className="rounded-xl border border-white/5 overflow-hidden">
                <div className="p-4 bg-white/[0.02] border-b border-white/5 flex justify-between items-center">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Linked Child Wallets</span>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                    {identity?.subAccounts?.length || 0} Active
                  </span>
                </div>

                {identity?.subAccounts && identity.subAccounts.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {identity.subAccounts.map((child: string, i: number) => (
                      <div key={child} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.01] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <Key size={14} className="text-indigo-400" />
                          </div>
                          <div>
                            <span className="text-sm text-white font-mono">{child.substring(0, 16)}...{child.substring(child.length - 8)}</span>
                            <div className="text-[10px] text-white/20 mt-0.5">Inherits: {TIER_NAMES[identity.complianceTier]} • {identity.jurisdiction}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnlinkSubAccount(child)}
                          disabled={subAccountLoading}
                          className="px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/10 transition-colors flex items-center gap-1 disabled:opacity-30"
                        >
                          <Unlink size={12} /> Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center">
                    <Users size={36} className="mx-auto text-white/10 mb-3" />
                    <p className="text-white/30 text-sm">No sub-accounts linked. Add a child wallet above.</p>
                  </div>
                )}
              </div>

              {/* Master Info */}
              {identity?.masterWallet && (
                <div className="mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <p className="text-xs text-amber-400 font-bold flex items-center gap-2">
                    <AlertTriangle size={14} /> This wallet is a <strong>Child</strong> of Master: <span className="font-mono">{identity.masterWallet.substring(0, 16)}...</span>
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* --- Transfer Validator Tab --- */}
        {tab === 'transfer' && (
           <div className="max-w-2xl">
              <div className="p-8 rounded-2xl bg-[#09110D] border border-white/5 mb-6">
                 <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Send size={18} className="text-emerald-400"/> Test Transfer Rules</h3>
                 
                 <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2 block">Destination Wallet</label>
                      <input
                        value={transferData.toWallet}
                        onChange={e => setTransferData(p => ({ ...p, toWallet: e.target.value }))}
                        placeholder="Enter recipient address"
                        className="w-full bg-white/[0.02] border border-white/10 text-white font-mono rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2 block">Asset Reference</label>
                        <input
                           value={transferData.assetId}
                           onChange={e => setTransferData(p => ({ ...p, assetId: e.target.value }))}
                           className="w-full bg-white/[0.02] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2 block">Amount</label>
                        <input
                           type="number"
                           value={transferData.amount}
                           onChange={e => setTransferData(p => ({ ...p, amount: Number(e.target.value) }))}
                           className="w-full bg-white/[0.02] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleValidateTransfer}
                      disabled={loading || !transferData.toWallet}
                      className="w-full mt-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all"
                    >
                      {loading ? 'Evaluating...' : 'Run Compliance Ruleset'}
                    </button>
                 </div>
              </div>

              {transferResult && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-6 rounded-2xl border ${transferResult.valid ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex items-center gap-3">
                       {transferResult.valid ? (
                          <>
                             <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center"><CheckCircle size={20} className="text-emerald-400" /></div>
                             <div>
                                <h4 className="text-emerald-400 font-bold">Transfer Permitted</h4>
                                <p className="text-xs text-emerald-400/50">Both parties meet the asset's tier and jurisdiction requirements.</p>
                             </div>
                          </>
                       ) : (
                          <>
                             <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center"><AlertTriangle size={20} className="text-red-400" /></div>
                             <div>
                                <h4 className="text-red-400 font-bold">Transfer Blocked by Compliance Interceptor</h4>
                                <p className="text-xs text-red-400/80">{transferResult.reason}</p>
                             </div>
                          </>
                       )}
                    </div>
                 </motion.div>
              )}
           </div>
        )}

        {/* --- Audit Trail Tab --- */}
        {tab === 'audit' && (
           <div className="bg-[#09110D] border border-white/5 rounded-2xl overflow-hidden">
             <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="font-bold text-white flex items-center gap-2"><Database size={18} className="text-emerald-400"/> Immutability Logs</h3>
                <button onClick={loadAuditLogs} className="text-xs text-emerald-400 hover:text-emerald-300">Refresh Logs</button>
             </div>
             
             {loading ? (
                <div className="p-12 text-center text-white/30 text-sm">Querying distributed ledger nodes...</div>
             ) : auditLogs.length === 0 ? (
                <div className="p-12 text-center text-white/30 text-sm">No compliance events recorded for this wallet.</div>
             ) : (
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                         <tr className="border-b border-white/5 text-[10px] uppercase font-black tracking-widest text-white/30 bg-white/[0.01]">
                            <th className="p-4 px-6">Timestamp</th>
                            <th className="p-4">Event Type</th>
                            <th className="p-4">Subject Wallet</th>
                            <th className="p-4">Context</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white/70 font-mono text-xs">
                         {auditLogs.map((log, i) => (
                            <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                               <td className="p-4 px-6 text-white/40">{new Date(log.createdAt).toLocaleString()}</td>
                               <td className="p-4">
                                  <span className="px-2 py-1 rounded bg-white/5 text-white">{log.eventType.replace(/_/g, ' ').toUpperCase()}</span>
                               </td>
                               <td className="p-4 text-emerald-400/70">{log.walletAddress.substring(0,6)}...{log.walletAddress.substring(log.walletAddress.length-4)}</td>
                               <td className="p-4 text-white/40">{JSON.stringify(log.details)}</td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             )}
           </div>
        )}

        {/* Existing Tabs as placeholders */}
        {tab === 'documents' && (
           <div className="p-12 rounded-2xl bg-[#09110D] border border-dashed border-white/10 text-center">
              <FileCheck size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-sm text-white/40">Secure document vault is currently offline for maintenance.</p>
           </div>
        )}

        {tab === 'aml' && (
           <div className="p-12 rounded-2xl bg-[#09110D] border border-dashed border-white/10 text-center">
              <Shield size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-sm text-white/40">AML screening engine routed to secondary nodes.</p>
           </div>
        )}

      </div>
    </div>
  );
}
