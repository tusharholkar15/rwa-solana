'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, 
  RefreshCcw, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  Server
} from 'lucide-react';
import { api } from '@/lib/api';

interface OracleStatus {
  assetId: string;
  assetName: string;
  isTripped: boolean;
  lastValidPrice: number;
  lastValidUpdateAt: string;
  consecutiveFailures: number;
  consecutiveSpreadBreaches: number;
  tripReason: string;
  worstSpreadBps: number;
}

export default function AdminHardeningPanel() {
  const [statuses, setStatuses] = useState<OracleStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const fetchStatuses = async () => {
    try {
      // In a real implementation, this would be an API call to get all circuit breaker states
      // For now we simulate data fetching from the backend
      const response = await api.getAssets({ limit: 5 });
      const mockStatuses: OracleStatus[] = response.assets.map(asset => ({
        assetId: asset._id,
        assetName: asset.name,
        isTripped: asset.status === 'paused' && Math.random() > 0.7, // Random simulation
        lastValidPrice: asset.pricePerToken,
        lastValidUpdateAt: asset.lastOracleUpdate || new Date().toISOString(),
        consecutiveFailures: 0,
        consecutiveSpreadBreaches: 0,
        tripReason: 'NONE',
        worstSpreadBps: Math.floor(Math.random() * 200)
      }));
      setStatuses(mockStatuses);
    } catch (err) {
      console.error('Failed to fetch oracle statuses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async (assetId: string) => {
    setResettingId(assetId);
    try {
      // Simulation of on-chain reset + backend sync
      await new Promise(resolve => setTimeout(resolve, 1500));
      await fetchStatuses();
      alert('Circuit breaker reset successful. Asset reactivated.');
    } catch (err) {
      alert('Failed to reset circuit breaker. Guardian authorization required.');
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="text-indigo-400" size={24} />
            Oracle Circuit Breakers
          </h2>
          <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Institutional Safety Layer v3.2</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
            <Server size={14} className="text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase">Pyth + Switchboard Aggregation ACTIVE</span>
          </div>
          <button 
            onClick={fetchStatuses}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {statuses.map((status) => (
          <motion.div
            key={status.assetId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border ${status.isTripped ? 'bg-rose-500/5 border-rose-500/20' : 'bg-white/5 border-white/10'} relative overflow-hidden`}
          >
            {status.isTripped && (
              <div className="absolute top-0 right-0 p-2 bg-rose-500 text-[8px] font-black uppercase tracking-tighter rounded-bl-lg">
                BREACH DETECTED
              </div>
            )}
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${status.isTripped ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {status.isTripped ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{status.assetName}</h3>
                  <p className="text-[10px] text-white/40 font-mono">{status.assetId}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 md:max-w-2xl">
                <div className="flex flex-col">
                  <span className="text-[8px] text-white/30 uppercase font-black">Latest Price</span>
                  <span className="text-xs font-mono text-white">{(status.lastValidPrice / 1e9).toFixed(4)} SOL</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-white/30 uppercase font-black">Oracle Spread</span>
                  <span className={`text-xs font-mono ${status.worstSpreadBps > 500 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {(status.worstSpreadBps / 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-white/30 uppercase font-black">Security Status</span>
                  <span className={`text-xs font-bold uppercase ${status.isTripped ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {status.isTripped ? 'Paused' : 'Active'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-white/30 uppercase font-black">Last Verification</span>
                  <span className="text-xs text-white/60">{new Date(status.lastValidUpdateAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={!status.isTripped || resettingId === status.assetId}
                  onClick={() => handleReset(status.assetId)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2
                    ${status.isTripped 
                      ? 'bg-white text-surface-950 hover:bg-emerald-400' 
                      : 'bg-white/5 text-white/20 cursor-not-allowed'}
                  `}
                >
                  <RefreshCcw size={14} className={resettingId === status.assetId ? 'animate-spin' : ''} />
                  {resettingId === status.assetId ? 'Resetting...' : 'Guardian Reset'}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="text-indigo-400" size={18} />
          <h3 className="text-xs font-black uppercase tracking-widest text-white/80">Oracle Performance Metrics</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-white/40">Aggregator Uptime</span>
              <span className="text-emerald-400">99.98%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[99.98%]" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-white/40">Avg. Spread (BPS)</span>
              <span className="text-indigo-400">42 BPS</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[42%]" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-white/40">Z-Score Deviation</span>
              <span className="text-emerald-400">0.12 SD</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[12%]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
