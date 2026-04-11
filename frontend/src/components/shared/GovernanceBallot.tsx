'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Vote, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  MinusCircle,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/shared/Toast';
import ConfirmModal from '@/components/shared/ConfirmModal';

interface Proposal {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  proposalType?: string;
  category?: string;
  status: string;
  votesFor?: number;
  votesAgainst?: number;
  votesAbstain?: number;
  for?: number;
  against?: number;
  endTime?: string;
  votingEndsAt?: string;
  quorumBps?: number;
  totalVoteWeight?: number;
  myVote?: 'for' | 'against' | 'abstain';
}

export default function GovernanceBallot({ proposal, onVoteSuccess }: { proposal: Proposal; onVoteSuccess?: () => void }) {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  
  const [vote, setVote] = useState<'for' | 'against' | 'abstain' | null>(proposal.myVote || null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingVote, setPendingVote] = useState<'for' | 'against' | 'abstain' | null>(null);

  const proposalId = proposal._id || proposal.id || '';
  const forVotes = proposal.votesFor || proposal.for || 0;
  const againstVotes = proposal.votesAgainst || proposal.against || 0;
  const abstainVotes = proposal.votesAbstain || 0;
  const total = forVotes + againstVotes + abstainVotes || 1; // Prevent divide by zero
  const forPct = (forVotes / total) * 100;
  const againstPct = (againstVotes / total) * 100;
  const abstainPct = (abstainVotes / total) * 100;
  
  const quorumPct = proposal.quorumBps ? proposal.quorumBps / 100 : 25;
  const currentQuorum = proposal.totalVoteWeight
    ? Math.min(100, (total / proposal.totalVoteWeight) * 100)
    : 0;

  const timeRemaining = proposal.votingEndsAt
    ? (() => {
        const diff = new Date(proposal.votingEndsAt).getTime() - Date.now();
        if (diff <= 0) return 'Expired';
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        return `${days}d ${hours}h`;
      })()
    : proposal.endTime || 'N/A';

  const isActive = proposal.status === 'active' || proposal.status === 'voting';

  const handleVoteClick = (v: 'for' | 'against' | 'abstain') => {
    if (!publicKey) {
      toast('warning', 'Wallet Required', 'Connect your wallet to vote on proposals.');
      return;
    }
    setPendingVote(v);
    setConfirmOpen(true);
  };

  const handleConfirmVote = async () => {
    if (!pendingVote || !publicKey) return;
    setConfirmOpen(false);
    setLoading(true);
    try {
      await api.castVote({
        proposalId,
        voter: publicKey.toBase58(),
        choice: pendingVote,
        weight: 1,
      });
      setVote(pendingVote);
      toast('success', 'Vote Cast', `Your vote "${pendingVote}" has been recorded on-chain.`);
      onVoteSuccess?.();
    } catch (err: any) {
      toast('error', 'Vote Failed', err.message || 'Unable to cast vote.');
    } finally {
      setLoading(false);
      setPendingVote(null);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="institutional-glass p-8 bg-white/[0.01] border-white/5 hover:border-indigo-500/30 transition-all group"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
           <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                 <span className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                    {proposal.proposalType || proposal.category || 'General'}
                 </span>
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                    <Clock size={12} /> {timeRemaining} {timeRemaining !== 'Expired' ? 'Remaining' : ''}
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
                  isActive ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  proposal.status === 'passed' || proposal.status === 'executed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  'bg-rose-500/10 text-rose-400 border-rose-500/20'
               }`}>
                  {proposal.status}
               </div>
               <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                  <Users size={12} /> {total.toLocaleString()} Tokens Voted
               </div>
           </div>
        </div>

        {/* Vote Distribution */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
           <div className="space-y-3">
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
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                  />
              </div>
              <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{forVotes.toLocaleString()} Units</div>
           </div>

           <div className="space-y-3">
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
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]" 
                  />
              </div>
              <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{againstVotes.toLocaleString()} Units</div>
           </div>

           <div className="space-y-3">
              <div className="flex justify-between items-end">
                 <span className="text-sm font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                   <MinusCircle size={16} /> Abstain
                 </span>
                 <span className="text-lg font-display font-bold text-white">{abstainPct.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${abstainPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-white/20" 
                  />
              </div>
              <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{abstainVotes.toLocaleString()} Units</div>
           </div>
        </div>

        {/* Quorum Progress */}
        {proposal.quorumBps && (
          <div className="mb-8 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Quorum Progress</span>
              <span className="text-xs font-bold text-white/60">{currentQuorum.toFixed(1)}% / {quorumPct}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (currentQuorum / quorumPct) * 100)}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className={`h-full rounded-full ${currentQuorum >= quorumPct ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              />
            </div>
          </div>
        )}

        {/* Voting Actions */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                 <ShieldCheck size={20} className="text-white/20" />
              </div>
              <div>
                 <div className="text-xs font-bold text-white/60">Your Voting Power</div>
                 <div className="text-[10px] text-white/20 font-medium uppercase tracking-[0.2em]">
                   {publicKey ? 'Token-weighted vote' : 'Connect wallet to vote'}
                 </div>
              </div>
           </div>

           {vote ? (
              <div className={`px-8 py-4 rounded-2xl border flex items-center gap-3 font-display font-black uppercase tracking-widest text-sm ${
                 vote === 'for' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                 vote === 'against' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                 'bg-white/5 text-white/40 border-white/10'
              }`}>
                 {vote === 'for' ? <CheckCircle2 size={20} /> : vote === 'against' ? <XCircle size={20} /> : <MinusCircle size={20} />}
                 Vote Cast: {vote.toUpperCase()}
              </div>
           ) : isActive ? (
              <div className="flex gap-3 w-full md:w-auto">
                 <button 
                   onClick={() => handleVoteClick('for')}
                   disabled={loading}
                   className="flex-1 md:px-10 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-display font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-20 flex items-center justify-center gap-2"
                 >
                   {loading && pendingVote === 'for' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                   Support
                 </button>
                 <button 
                   onClick={() => handleVoteClick('against')}
                   disabled={loading}
                   className="flex-1 md:px-10 py-3.5 rounded-xl bg-white/5 border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 font-display font-black uppercase tracking-widest text-xs transition-all disabled:opacity-20 flex items-center justify-center gap-2"
                 >
                   {loading && pendingVote === 'against' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                   Oppose
                 </button>
                 <button 
                   onClick={() => handleVoteClick('abstain')}
                   disabled={loading}
                   className="md:px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white font-display font-black uppercase tracking-widest text-xs transition-all disabled:opacity-20"
                 >
                   Abstain
                 </button>
              </div>
           ) : (
              <div className="text-sm text-white/30 font-bold uppercase tracking-widest">Voting Closed</div>
           )}
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setPendingVote(null); }}
        onConfirm={handleConfirmVote}
        title="Confirm Your Vote"
        description={`You are casting a "${pendingVote}" vote on this proposal. This action is recorded on-chain and cannot be undone.`}
        confirmLabel={`Vote ${pendingVote?.toUpperCase()}`}
        confirmVariant={pendingVote === 'against' ? 'danger' : 'primary'}
        loading={loading}
      />
    </>
  );
}
