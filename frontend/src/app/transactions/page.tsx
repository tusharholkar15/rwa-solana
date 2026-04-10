'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  History, ArrowUpRight, ArrowDownRight, ArrowLeftRight,
  Wallet, ExternalLink, Coins, Filter, Clock, CheckCircle2,
  AlertCircle, Search, ChevronRight, ChevronLeft, Activity, X, DollarSign,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, lamportsToSol, shortenAddress } from '@/lib/constants';
import Link from 'next/link';
import AuthGate from '@/components/shared/AuthGate';

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  buy: { label: 'Asset Purchase', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: ArrowDownRight },
  sell: { label: 'Asset Liquidation', color: 'text-rose-400', bg: 'bg-rose-500/10', icon: ArrowUpRight },
  transfer_in: { label: 'Inbound Transfer', color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: ArrowDownRight },
  transfer_out: { label: 'Outbound Transfer', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: ArrowUpRight },
  yield: { label: 'Yield Distribution', color: 'text-violet-400', bg: 'bg-violet-500/10', icon: Coins },
};

export default function TransactionsPage() {
  const { connected, publicKey } = useWallet();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    if (connected && publicKey) {
      loadTransactions();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey, filter, page]);

  async function loadTransactions() {
    try {
      setLoading(true);
      const res = await api.getTransactions(publicKey!.toBase58(), {
        page,
        limit: 15,
        type: filter || undefined,
      });
      setTransactions(res.transactions);
      setPagination(res.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (!connected) {
    return (
      <AuthGate 
        title="Protocol Activity Ledger" 
        description="Verify your institutional credentials to access the immutable on-chain record of your primary and secondary market interactions."
        icon={<History size={48} className="text-white/20 group-hover:text-indigo-400 transition-colors" />}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 pt-10 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ─── Institutional Header ───────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <Activity size={20} className="text-white/40" />
               </div>
               <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Immutable Protocol Ledger</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-2">
              Protocol<span className="text-emerald-400">Activity</span>
            </h1>
            <div className="flex items-center gap-4 text-sm font-medium">
               <span className="text-white/30">Investor:</span>
               <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/60 font-mono text-xs">
                 {shortenAddress(publicKey!.toBase58(), 8)}
               </span>
               <div className="h-4 w-px bg-white/10 mx-1" />
               <div className="flex items-center gap-1.5 text-white/40 font-bold uppercase tracking-tighter text-[10px]">
                 <CheckCircle2 size={12} className="text-emerald-500" /> All Events Audited
               </div>
            </div>
          </motion.div>

          <div className="flex items-center gap-3">
             <div className="p-1 rounded-xl bg-white/5 border border-white/10 flex">
                {[
                  { value: '', label: 'All Events' },
                  { value: 'buy', label: 'Primary' },
                  { value: 'sell', label: 'Liquidation' },
                  { value: 'yield', label: 'Yield' },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => { setFilter(f.value); setPage(1); }}
                    className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      filter === f.value
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'text-white/30 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* ─── Ledger Content ─────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="institutional-glass overflow-hidden bg-white/[0.01]">
          {loading ? (
            <div className="p-10 space-y-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-6 animate-pulse">
                  <div className="w-12 h-12 rounded-2xl bg-white/5" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-white/5 rounded-xl w-1/4" />
                    <div className="h-3 bg-white/5 rounded-xl w-1/6" />
                  </div>
                  <div className="h-8 bg-white/5 rounded-xl w-24" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-32 text-center flex flex-col items-center">
              <History size={64} className="text-white/5 mb-8" />
              <h4 className="text-2xl font-display font-bold text-white mb-3">No Protocol Events</h4>
              <p className="text-white/40 mb-10 max-w-sm mx-auto font-medium">Your audited transaction history across primary and secondary markets will be logged here.</p>
              <Link href="/marketplace" className="btn-institutional inline-flex items-center gap-3">
                Initialize Activity <ChevronRight size={18} />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {/* Table Header (Desktop) */}
              <div className="hidden md:flex items-center px-10 py-6 bg-white/[0.02] text-[10px] text-white/20 uppercase tracking-[0.25em] font-black">
                 <div className="flex-[2]">Event Classification</div>
                 <div className="flex-1 text-center">Protocol Hash</div>
                 <div className="flex-1 text-center">Unit Volume</div>
                 <div className="flex-1 text-center">Value Allocation</div>
                 <div className="flex-1 text-right">Confirmation</div>
              </div>

              {transactions.map((tx, i) => {
                const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.buy;
                const Icon = config.icon;
                return (
                  <motion.div
                    key={tx._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex flex-col md:flex-row md:items-center gap-4 px-10 py-6 hover:bg-white/[0.03] transition-all duration-300 group"
                  >
                    <div className="flex-[2] flex items-center gap-5">
                       <div className={`w-12 h-12 rounded-2xl ${config.bg} flex items-center justify-center border border-white/5 shrink-0 transition-transform group-hover:scale-110`}>
                          <Icon size={20} className={config.color} />
                       </div>
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="font-display font-bold text-white text-lg">{config.label}</span>
                             <span className="text-white/20 text-xs">•</span>
                             <span className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">{tx.assetName || 'Unknown Asset'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold tracking-widest uppercase">
                             <Clock size={12} className="opacity-50" />
                             {new Date(tx.createdAt).toLocaleDateString()}
                             <span className="opacity-30">•</span>
                             {new Date(tx.createdAt).toLocaleTimeString()}
                          </div>
                       </div>
                    </div>

                    <div className="flex-1 text-center hidden md:block">
                       <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono text-white/40 tracking-tighter inline-flex items-center gap-2 max-w-full">
                          {shortenAddress(tx.txHash || 'Pending...', 6)}
                          <ExternalLink size={10} className="opacity-40" />
                       </div>
                    </div>

                    <div className="flex-1 text-center font-display font-bold text-white text-lg">
                       {tx.shares.toLocaleString()} <span className="text-[10px] text-white/20 uppercase tracking-widest">Units</span>
                    </div>

                    <div className="flex-1 text-center">
                       <div className="text-sm font-bold text-white">{lamportsToSol(tx.totalAmount).toFixed(4)} SOL</div>
                       <div className="text-[10px] text-white/20 font-medium tracking-tight">On-Chain Value</div>
                    </div>

                    <div className="flex-1 text-right">
                       <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                         tx.status === 'confirmed' 
                           ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                           : tx.status === 'failed' 
                             ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                             : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                       }`}>
                         {tx.status === 'confirmed' ? <CheckCircle2 size={12} /> : tx.status === 'failed' ? <X size={12} /> : <Clock size={12} />}
                         {tx.status}
                       </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Institutional Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-10 py-6 bg-white/[0.02] border-t border-white/5">
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
                Ledger Page {pagination.page} / {pagination.totalPages} <span className="mx-2 opacity-50">•</span> {pagination.total} Records Found
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={!pagination.hasPrev}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white disabled:opacity-20 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.hasNext}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white disabled:opacity-20 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Bottom Disclaimer */}
        <div className="mt-12 text-center text-[10px] text-white/20 font-bold uppercase tracking-[0.3em] max-w-2xl mx-auto leading-loose">
          All transactions are executed and finalized on the Solana blockchain. 
          This ledger serves as a synchronized off-chain reflection of immutable protocol events.
        </div>
      </div>
    </div>
  );
}
