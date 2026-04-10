'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Vote, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  Info,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface Proposal {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'passed' | 'failed';
  for: number;
  against: number;
  endTime: string;
  myVote?: 'for' | 'against';
}

export default function GovernanceBallot({ proposal }: { proposal: Proposal }) {
  const [vote, setVote] = useState<'for' | 'against' | null>(proposal.myVote || null);
  const [loading, setLoading] = useState(false);

  const total = proposal.for + proposal.against;
  const forPct = (proposal.for / total) * 100;
  const againstPct = (proposal.against / total) * 100;

  const handleVote = (v: 'for' | 'against') => {
    setLoading(true);
    setTimeout(() => {
      setVote(v);
      setLoading(false);
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="institutional-glass p-8 bg-white/[0.01] border-white/5 hover:border-indigo-500/30 transition-all group"
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
         <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
               <span className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                  {proposal.category}
               </span>
               <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  <Clock size={12} /> {proposal.endTime} Remaining
               </div>
            </div>
            <h3 className="text-2xl font-display font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors">
               {proposal.title}
            </h3>
            <p className="text-white/40 text-sm leading-relaxed max-w-2xl font-medium">
               {proposal.description}
            </p>
         </div>
         <div className="shrink-0 flex flex-col items-end">
             <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] mb-4 border ${
                proposal.status === 'active' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                proposal.status === 'passed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                'bg-rose-500/10 text-rose-400 border-rose-500/20'
             }`}>
                {proposal.status}
             </div>
             <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                <Users size={12} /> {total.toLocaleString()} Tokens Voted
             </div>
         </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-10">
         <div className="space-y-4">
            <div className="flex justify-between items-end">
               <span className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                 <CheckCircle2 size={16} /> Support
               </span>
               <span className="text-lg font-display font-bold text-white">{forPct.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${forPct}%` }}
                  className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                />
            </div>
            <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{proposal.for.toLocaleString()} Units</div>
         </div>

         <div className="space-y-4">
            <div className="flex justify-between items-end">
               <span className="text-sm font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                 <XCircle size={16} /> Oppose
               </span>
               <span className="text-lg font-display font-bold text-white">{againstPct.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${againstPct}%` }}
                  className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]" 
                />
            </div>
            <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{proposal.against.toLocaleString()} Units</div>
         </div>
      </div>

      <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
               <ShieldCheck size={20} className="text-white/20" />
            </div>
            <div>
               <div className="text-xs font-bold text-white/60">Your Voting Power</div>
               <div className="text-[10px] text-white/20 font-medium uppercase tracking-[0.2em]">1,240 tokens whitelisted</div>
            </div>
         </div>

         {vote ? (
            <div className={`px-8 py-4 rounded-2xl border flex items-center gap-3 font-display font-black uppercase tracking-widest text-sm ${
               vote === 'for' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
               {vote === 'for' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
               Vote Cast: {vote.toUpperCase()}
            </div>
         ) : (
            <div className="flex gap-4 w-full md:w-auto">
               <button 
                 onClick={() => handleVote('for')}
                 disabled={loading}
                 className="flex-1 md:px-12 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-display font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-20"
               >
                 Vote Support
               </button>
               <button 
                 onClick={() => handleVote('against')}
                 disabled={loading}
                 className="flex-1 md:px-12 py-4 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white font-display font-black uppercase tracking-widest text-xs transition-all disabled:opacity-20"
               >
                 Vote Oppose
               </button>
            </div>
         )}
      </div>
    </motion.div>
  );
}
