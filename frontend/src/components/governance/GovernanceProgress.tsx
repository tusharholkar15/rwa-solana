'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  Users, 
  ArrowRight,
  TrendingUp,
  TriangleAlert
} from 'lucide-react';

interface Proposal {
  _id: string;
  title: string;
  status: string;
  votesFor: number;
  votesAgainst: number;
  quorumBps: number;
  voteEnd: string;
  assetId?: {
    name: string;
    symbol: string;
  };
}

interface Props {
  proposals: Proposal[];
}

export default function GovernanceProgress({ proposals }: Props) {
  if (proposals.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400">
          <CheckCircle2 size={32} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">No Security Overrides Pending</h3>
          <p className="text-sm text-white/40 mt-1 max-w-xs mx-auto">
            All systems are behaving within institutional guardrails. No circuit breaker resets are currently being voted on.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-2">
        <Users className="text-indigo-400" size={18} />
        <h3 className="text-xs font-black uppercase tracking-widest text-white/80">Active Security Governance</h3>
      </div>

      {proposals.map((proposal) => {
        const totalVotes = proposal.votesFor + proposal.votesAgainst;
        const forPercent = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
        const endsIn = new Date(proposal.voteEnd).getTime() - Date.now();
        const daysLeft = Math.ceil(endsIn / (1000 * 60 * 60 * 24));

        return (
          <motion.div
            key={proposal._id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase">
                    Oracle Reset
                  </span>
                  <span className="text-white/30 text-[10px] font-mono">#{proposal._id.slice(-6)}</span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                  {proposal.title}
                </h4>
                <p className="text-[10px] text-white/40">
                  Target Asset: <span className="text-white/60 font-bold">{proposal.assetId?.name} ({proposal.assetId?.symbol})</span>
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Clock size={12} />
                <span className="text-[10px] font-bold uppercase">{daysLeft}D Left</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-4">
                  <span className="text-emerald-400">For: {proposal.votesFor.toLocaleString()}</span>
                  <span className="text-rose-400">Against: {proposal.votesAgainst.toLocaleString()}</span>
                </div>
                <span className="text-white/40">Quorum: {(proposal.quorumBps / 100).toFixed(0)}%</span>
              </div>

              <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${forPercent}%` }}
                  className="h-full bg-emerald-500" 
                />
                <div className="h-full bg-rose-500/40" style={{ width: `${100 - forPercent}%` }} />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1 text-[10px] text-white/30 italic">
                  <TrendingUp size={10} />
                  <span>Trend: Strong Consensus</span>
                </div>
                <button className="flex items-center gap-1 text-[10px] font-black uppercase text-indigo-400 hover:text-white transition-colors">
                  Cast Your Vote <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}

      <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex items-start gap-4">
        <TriangleAlert size={18} className="text-orange-400 shrink-0 mt-0.5" />
        <p className="text-[10px] leading-relaxed text-orange-400/80">
          <strong>Institutional Notice:</strong> Security-critical proposals require a 60% supermajority and have a 24-hour timelock after the vote ends before execution is permitted on-chain.
        </p>
      </div>
    </div>
  );
}
