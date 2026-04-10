'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Vote, PenSquare, Users, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface Proposal {
  id: string;
  title: string;
  description: string;
  votesFor: number;
  votesAgainst: number;
  endsAt: string;
  status: 'active' | 'passed' | 'rejected';
}

export default function PropertyGovernance({ assetId }: { assetId: string }) {
  const proposals: Proposal[] = [
    {
       id: 'PROP-291',
       title: 'HVAC Energy Efficiency Upgrade',
       description: 'Upgrade the main cooling unit to a 2026 Solar-HVAC model. Estimated ROI: 1.2% reduction in maintenance costs.',
       votesFor: 64,
       votesAgainst: 12,
       endsAt: '2026-04-12',
       status: 'active'
    },
    {
       id: 'PROP-288',
       title: 'Select Anchor Tenant: TechCorp Inc',
       description: 'Approve a 5-year lease for TechCorp Inc at a 5% premium over market base rate.',
       votesFor: 120,
       votesAgainst: 0,
       endsAt: '2026-03-30',
       status: 'passed'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
         <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
               <Vote size={18} />
            </div>
            <h3 className="font-display font-bold text-xl text-white">Property Governance</h3>
         </div>
         <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-500/30 px-3 py-1 rounded-md bg-indigo-500/5 hover:bg-indigo-500/10 transition-all">Submit Proposal</button>
      </div>

      <div className="space-y-4">
         {proposals.map((prop, i) => (
            <motion.div 
               key={prop.id}
               initial={{ opacity: 0, x: 10 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: i * 0.1 }}
               className="p-5 institutional-glass bg-white/[0.01] border-white/5 group hover:border-white/10 transition-colors"
            >
               <div className="flex justify-between items-start mb-3">
                  <div>
                     <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{prop.id}</span>
                        {prop.status === 'active' && <span className="flex items-center gap-1 text-[9px] text-indigo-400 font-black animate-pulse uppercase tracking-[0.2em]"><Clock size={10} /> Active</span>}
                        {prop.status === 'passed' && <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-black uppercase tracking-[0.2em]"><CheckCircle2 size={10} /> Passed</span>}
                     </div>
                     <h4 className="text-white font-bold text-sm tracking-tight group-hover:text-indigo-400 transition-colors uppercase">{prop.title}</h4>
                  </div>
                  <div className="text-right">
                     <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Holders Voted</span>
                     <div className="text-xs font-black text-white">{prop.votesFor + prop.votesAgainst}%</div>
                  </div>
               </div>

               <p className="text-xs text-white/40 mb-6 leading-relaxed line-clamp-2">{prop.description}</p>

               <div className="flex items-center gap-6">
                  <div className="flex-1 space-y-2">
                     <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(prop.votesFor / (prop.votesFor + prop.votesAgainst)) * 100}%` }}
                          className="h-full bg-emerald-500 rounded-full"
                        />
                     </div>
                     <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-white/20">
                        <span>For: {prop.votesFor}%</span>
                        <span>Against: {prop.votesAgainst}%</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <button className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"><CheckCircle2 size={14} /></button>
                     <button className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><XCircle size={14} /></button>
                  </div>
               </div>
            </motion.div>
         ))}
      </div>
    </div>
  );
}
