'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldCheck, Database, Radio, Network, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';

export default function SystemStatusIndicator() {
  const [status, setStatus] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const data = await api.healthCheck();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      setStatus({ status: 'degraded', services: { database: 'error', redis: 'error', solana: 'error', oracle: 'error' } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (val: string) => {
    if (val === 'connected' || val === 'healthy' || val === 'operational') return 'text-emerald-400';
    if (val === 'degraded' || val === 'warning') return 'text-amber-400';
    return 'text-rose-400';
  };

  const getStatusBg = (val: string) => {
    if (val === 'connected' || val === 'healthy' || val === 'operational') return 'bg-emerald-400';
    if (val === 'degraded' || val === 'warning') return 'bg-amber-400';
    return 'bg-rose-400';
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${getStatusBg(status?.status || 'degraded')} shadow-[0_0_8px] shadow-current animate-pulse`} />
        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest hidden sm:block">
          Node Status
        </span>
        <ChevronDown size={10} className={`text-white/20 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full mt-2 right-0 w-64 p-4 institutional-glass bg-surface-950/90 border-white/10 shadow-2xl z-[100]"
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span className="text-xs font-bold text-white">Institutional Node</span>
              </div>
              <span className="text-[10px] text-white/40 font-mono uppercase">v1.2.0-stable</span>
            </div>

            <div className="space-y-3">
              <StatusRow icon={<Database size={12} />} label="Blockchain (Solana)" status={status?.services?.solana || 'Checking...'} color={getStatusColor(status?.services?.solana)} />
              <StatusRow icon={<Radio size={12} />} label="Oracle Feed (Pyth)" status={status?.services?.oracle || 'Checking...'} color={getStatusColor(status?.services?.oracle)} />
              <StatusRow icon={<Activity size={12} />} label="Caching (Redis)" status={status?.services?.redis || 'Checking...'} color={getStatusColor(status?.services?.redis)} />
              <StatusRow icon={<Network size={12} />} label="Persistence (Mongo)" status={status?.services?.database || 'Checking...'} color={getStatusColor(status?.services?.database)} />
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 text-center">
               <div className="text-[9px] text-white/20 uppercase tracking-widest font-black">
                 Last Sync: {status?.timestamp ? new Date(status.timestamp).toLocaleTimeString() : 'N/A'}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusRow({ icon, label, status, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-white/40">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>
        {status}
      </span>
    </div>
  );
}
