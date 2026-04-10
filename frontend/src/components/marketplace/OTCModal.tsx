'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, ArrowRight, MessageSquare, Briefcase, DollarSign, Building2 } from 'lucide-react';
import { formatCurrency } from '@/lib/constants';

interface OTCModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any;
}

export default function OTCModal({ isOpen, onClose, asset }: OTCModalProps) {
  const [step, setStep] = useState(1);
  const [requestedShares, setRequestedShares] = useState('');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg institutional-glass bg-surface-900 border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
             <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                   <Briefcase size={18} />
                </div>
                <h3 className="font-display font-bold text-white uppercase tracking-widest text-sm">Institutional OTC Desk</h3>
             </div>
             <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
                <X size={20} />
             </button>
          </div>

          <div className="p-8">
             {step === 1 ? (
                <div className="space-y-6">
                   <div className="text-center mb-8">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">
                         <ShieldCheck size={10} /> Tier-1 Verified Only
                      </div>
                      <h4 className="text-2xl font-display font-bold text-white mb-2">Block Trade Negotiation</h4>
                      <p className="text-sm text-white/40 max-w-xs mx-auto">Initiate a private trade for bulk allocations bypassing public slippage.</p>
                   </div>

                   <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Building2 size={24} className="text-white/40" />
                         </div>
                         <div>
                            <div className="text-xs font-bold text-white">{asset?.name}</div>
                            <div className="text-[10px] text-white/30 uppercase font-black tracking-widest">{asset?.symbol}</div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Requested Allocation (Min 10,000 Units)</label>
                      <div className="relative">
                         <input 
                            type="number" 
                            value={requestedShares}
                            onChange={(e) => setRequestedShares(e.target.value)}
                            placeholder="10,000"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-xl font-display font-black text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                         />
                         <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/20 uppercase">Units</div>
                      </div>
                   </div>

                   <button 
                      onClick={() => setStep(2)}
                      disabled={!requestedShares || Number(requestedShares) < 10000}
                      className="w-full py-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 font-display font-black text-white uppercase tracking-[0.2em] transition-all disabled:opacity-20 flex items-center justify-center gap-2"
                   >
                      Connect with Desk
                      <ArrowRight size={18} />
                   </button>
                </div>
             ) : (
                <motion.div 
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="text-center py-10"
                >
                   <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-8">
                      <MessageSquare size={40} className="text-emerald-400" />
                   </div>
                   <h4 className="text-2xl font-display font-bold text-white mb-4">Request Transmitted</h4>
                   <p className="text-sm text-white/40 max-w-xs mx-auto mb-10 leading-relaxed">Your interest in a block trade for {requestedShares} units has been securely broadcast to the issuer's treasury desk. An account manager will contact your verified wallet address via secured comms.</p>
                   <button 
                      onClick={onClose}
                      className="btn-secondary-institutional w-full"
                   >
                      Return to Dashboard
                   </button>
                </motion.div>
             )}
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center">
             <div className="text-[9px] font-bold text-white/20 uppercase tracking-[0.3em]">Institutional Grade Execution • Assetverse Desk</div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
