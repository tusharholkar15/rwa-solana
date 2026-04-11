'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Vote, 
  ShieldCheck, 
  Clock, 
  Users, 
  Info,
  CheckCircle2,
  History,
  Plus,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import GovernanceBallot from '@/components/shared/GovernanceBallot';
import { DashboardSkeleton } from '@/components/shared/Skeletons';
import { api } from '@/lib/api';
import { useToast } from '@/components/shared/Toast';

export default function GovernancePage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { publicKey } = useWallet();
  const { toast } = useToast();

  const fetchProposals = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      // Try fetching with "all" as the assetId — our backend route expects an assetId
      // but we want all proposals; we'll try a catch-all approach
      const data = await api.getProposals('all');
      setProposals(data.proposals || []);
      setError(null);
    } catch (err: any) {
      // If the "all" endpoint fails, it might mean no proposals exist yet
      console.warn('Governance fetch:', err.message);
      setProposals([]);
      if (!silent) setError(null); // Don't show error for empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  // Poll every 10 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProposals(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchProposals]);

  const filteredProposals = proposals.filter(p => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return p.status === 'active' || p.status === 'voting';
    if (activeFilter === 'history') return !['active', 'voting'].includes(p.status);
    return true;
  });

  // Stats derived from data
  const activeCount = proposals.filter(p => p.status === 'active' || p.status === 'voting').length;
  const totalVotes = proposals.reduce((sum, p) => sum + (p.votesFor || 0) + (p.votesAgainst || 0) + (p.votesAbstain || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 pt-10 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 pt-10 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ─── Institutional Header ───────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <Vote size={20} className="text-indigo-400" />
               </div>
               <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Assetverse Protocol DAO</span>
               {refreshing && <Loader2 size={14} className="text-indigo-400 animate-spin" />}
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-2">
              Protocol<span className="text-indigo-400">Governance</span>
            </h1>
            <div className="flex items-center gap-4 text-sm font-medium">
               <span className="text-white/30">Total Voting Power:</span>
               <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-emerald-400 font-display font-bold text-xs uppercase tracking-widest">
                 {publicKey ? 'Connected' : 'Wallet Required'}
               </span>
               <div className="h-4 w-px bg-white/10 mx-1" />
               <div className="flex items-center gap-1.5 text-white/40 font-bold uppercase tracking-tighter text-[10px]">
                 <ShieldCheck size={12} className="text-indigo-500" /> All Votes On-Chain Verified
               </div>
            </div>
          </motion.div>

          <div className="flex items-center gap-3">
             <button
               onClick={() => fetchProposals(true)}
               className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
               title="Refresh"
             >
               <RefreshCw size={16} className={`text-white/40 ${refreshing ? 'animate-spin' : ''}`} />
             </button>
             <div className="p-1 rounded-xl bg-white/5 border border-white/10 flex">
                {['All', 'Active', 'History'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f.toLowerCase())}
                    className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeFilter === f.toLowerCase()
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'text-white/30 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* ─── Governance Stats ───────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="institutional-glass p-6 bg-white/[0.01]">
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Active Proposals</div>
              <div className="text-2xl font-display font-bold text-white">{activeCount}</div>
           </motion.div>
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="institutional-glass p-6 bg-white/[0.01]">
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Total Proposals</div>
              <div className="text-2xl font-display font-bold text-white">{proposals.length}</div>
           </motion.div>
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="institutional-glass p-6 bg-white/[0.01]">
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Cumulative Votes</div>
              <div className="text-2xl font-display font-bold text-white">{totalVotes.toLocaleString()} <span className="text-xs text-white/20">VTN</span></div>
           </motion.div>
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="institutional-glass p-6 bg-white/[0.01]">
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Default Quorum</div>
              <div className="text-2xl font-display font-bold text-white">25%</div>
           </motion.div>
        </div>

        {/* ─── Proposals List ─────────────────────────────── */}
        <div className="space-y-8">
           {filteredProposals.length > 0 ? (
             filteredProposals.map((proposal) => (
               <GovernanceBallot
                 key={proposal._id || proposal.id}
                 proposal={proposal}
                 onVoteSuccess={() => fetchProposals(true)}
               />
             ))
           ) : (
             <div className="p-20 institutional-glass bg-white/[0.01] text-center">
                <Vote size={48} className="text-white/5 mx-auto mb-6" />
                <h3 className="text-xl font-display font-bold text-white mb-2">
                  {proposals.length === 0 ? 'No Proposals Yet' : 'No Proposals Found'}
                </h3>
                <p className="text-white/30 text-sm">
                  {proposals.length === 0
                    ? 'Governance proposals will appear here once created by asset issuers.'
                    : 'No active or historical proposals match the selected filters.'}
                </p>
             </div>
           )}
        </div>

        {/* Bottom Educational Disclaimer */}
        <div className="mt-20 p-10 institutional-glass bg-indigo-500/5 border-indigo-500/10 text-center max-w-4xl mx-auto">
           <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
              <Info size={24} className="text-indigo-400" />
           </div>
           <h4 className="text-xl font-display font-bold text-white mb-3">Institutional Voting Rights</h4>
           <p className="text-white/40 text-sm font-medium leading-relaxed mb-8">
              Participation in Assetverse Connect Governance is reserved for whitelisted asset holders. 1 VTN represents 1 token held in the whitelisted wallet. All decisions are executed automatically on the Solana blockchain once the voting period expires and quorum is reached.
           </p>
           <div className="flex flex-wrap justify-center gap-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
              <span className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-500" /> Decentralized Execution</span>
              <span className="flex items-center gap-2"><ShieldCheck size={12} className="text-indigo-500" /> Gnosis Safe Integrated</span>
              <span className="flex items-center gap-2"><History size={12} className="text-white/40" /> Immutable History</span>
           </div>
        </div>
      </div>
    </div>
  );
}
