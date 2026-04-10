'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Vote, 
  ShieldCheck, 
  Clock, 
  Users, 
  Info,
  ChevronRight,
  TrendingUp,
  Activity,
  History,
  CheckCircle2,
} from 'lucide-react';
import GovernanceBallot from '@/components/shared/GovernanceBallot';

const MOCK_PROPOSALS = [
  {
    id: '1',
    title: 'Approve 4.5% Rental Indexation for Prime Berlin Residences',
    description: 'A proposed annual adjustment to the rental rates for the Berlin Portfolio based on current inflation metrics and market demand for premium residential space.',
    category: 'Portfolio Management',
    status: 'active' as const,
    for: 124500,
    against: 42000,
    endTime: '2d 14h',
  },
  {
    id: '2',
    title: 'Authorize Secondary Market Liquidity Expansion (V2)',
    description: 'Expand the default liquidity depth for the Miami Tech Hub asset by an additional 12,000 SOL to facilitate larger institutional trades with zero slippage.',
    category: 'Protocol Liquidity',
    status: 'active' as const,
    for: 284000,
    against: 12000,
    endTime: '5d 20h',
  },
  {
    id: '3',
    title: 'Allocate Yield Distribution to ESG-V3 Infrastructure',
    description: 'Reallocate 0.5% of the platform-wide management fee to sustainable infrastructure upgrades for Class-A office buildings in the portfolio.',
    category: 'Strategic Growth',
    status: 'passed' as const,
    for: 450000,
    against: 85000,
    endTime: 'Expired',
    myVote: 'for' as const,
  }
];

export default function GovernancePage() {
  const [activeFilter, setActiveFilter] = useState('all');

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
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-2">
              Protocol<span className="text-indigo-400">Governance</span>
            </h1>
            <div className="flex items-center gap-4 text-sm font-medium">
               <span className="text-white/30">Total Voting Power:</span>
               <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-emerald-400 font-display font-bold text-xs uppercase tracking-widest">
                 1,240 VTN
               </span>
               <div className="h-4 w-px bg-white/10 mx-1" />
               <div className="flex items-center gap-1.5 text-white/40 font-bold uppercase tracking-tighter text-[10px]">
                 <ShieldCheck size={12} className="text-indigo-500" /> All Votes On-Chain Verified
               </div>
            </div>
          </motion.div>

          <div className="flex items-center gap-3">
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
              <div className="text-2xl font-display font-bold text-white">12</div>
           </motion.div>
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="institutional-glass p-6 bg-white/[0.01]">
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Cumulative Voting</div>
              <div className="text-2xl font-display font-bold text-white">4.2M <span className="text-xs text-white/20">VTN</span></div>
           </motion.div>
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="institutional-glass p-6 bg-white/[0.01]">
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Quorum Threshold</div>
              <div className="text-2xl font-display font-bold text-white">25%</div>
           </motion.div>
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="institutional-glass p-6 bg-white/[0.01]">
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">My Voting Power</div>
              <div className="text-2xl font-display font-bold text-indigo-400">1,240 <span className="text-xs text-white/20">VTN</span></div>
           </motion.div>
        </div>

        {/* ─── Proposals List ─────────────────────────────── */}
        <div className="space-y-8">
           {MOCK_PROPOSALS
             .filter(p => activeFilter === 'all' || (activeFilter === 'active' && p.status === 'active') || (activeFilter === 'history' && p.status !== 'active'))
             .length > 0 ? (
               MOCK_PROPOSALS
                 .filter(p => activeFilter === 'all' || (activeFilter === 'active' && p.status === 'active') || (activeFilter === 'history' && p.status !== 'active'))
                 .map((proposal) => (
                  <GovernanceBallot key={proposal.id} proposal={proposal} />
               ))
             ) : (
               <div className="p-20 institutional-glass bg-white/[0.01] text-center">
                  <Vote size={48} className="text-white/5 mx-auto mb-6" />
                  <h3 className="text-xl font-display font-bold text-white mb-2">No Proposals Found</h3>
                  <p className="text-white/30 text-sm">No active or historical proposals match the selected filters.</p>
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
