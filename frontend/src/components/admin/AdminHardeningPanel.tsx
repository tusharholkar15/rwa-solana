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
  Server,
  Inbox,
  Skull,
  Cog, 
  HeartPulse 
} from 'lucide-react';
import { api } from '@/lib/api';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

interface OracleStatus {
  assetId: string;
  assetName: string;
  isTripped: boolean;
  lastValidPrice: number;
  lastValidUpdateAt: string;
  consecutiveFailures: number;
  tripReason: string;
  worstSpreadBps: number;
  lastUpdateSlot: number;
}

interface WorkerHealth {
  status: string;
  tasks: {
    pending: number;
    processing: number;
    failed: number;
    deadLettered: number;
    completed: number;
  };
  outbox: {
    pending: number;
    deadLettered: number;
  };
  workerRunning: boolean;
  reconRunning: boolean;
  timestamp: string;
}

export default function AdminHardeningPanel() {
  const [statuses, setStatuses] = useState<OracleStatus[]>([]);
  const [workerHealth, setWorkerHealth] = useState<WorkerHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const fetchStatuses = async () => {
    try {
      const response = await api.getAssets({ limit: 10 });
      const realStatuses: OracleStatus[] = response.assets.map(asset => ({
        assetId: asset._id,
        assetName: asset.name,
        isTripped: asset.circuitBreaker?.isTripped || false,
        lastValidPrice: asset.circuitBreaker?.lastValidPrice || asset.pricePerToken,
        lastValidUpdateAt: asset.lastOracleUpdate || new Date().toISOString(),
        consecutiveFailures: asset.circuitBreaker?.consecutiveFailures || 0,
        tripReason: asset.circuitBreaker?.tripReason?.toUpperCase() || 'NONE',
        worstSpreadBps: asset.circuitBreaker?.worstSpreadBps || 0,
        lastUpdateSlot: asset.circuitBreaker?.lastUpdateSlot || 0
      }));
      setStatuses(realStatuses);
    } catch (err) {
      console.error('Failed to fetch oracle statuses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkerHealth = async () => {
    try {
      const data = await api.getWorkerHealth();
      setWorkerHealth(data);
    } catch (err) {
      console.error('Failed to fetch worker health:', err);
    }
  };

  useEffect(() => {
    fetchStatuses();
    fetchWorkerHealth();
    const interval = setInterval(() => {
      fetchStatuses();
      fetchWorkerHealth();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async (assetId: string) => {
    if (!window.confirm('Are you sure you want to manually reset the circuit breaker? This should only be done if the oracle anomaly has been resolved.')) return;

    setResettingId(assetId);
    try {
      await api.resetCircuitBreaker(assetId);
      await fetchStatuses();
      alert('Circuit breaker reset successful. Asset reactivated on-chain.');
    } catch (err: any) {
      alert(`Reset failed: ${err.message}. Ensure you have Guardian permissions.`);
    } finally {
      setResettingId(null);
    }
  };

  useEffect(() => {
    // ─── Direct WebSocket logic for instant alerts ─────
    const socket = io(SOCKET_URL, { transports: ['websocket'] });

    socket.on('connect', () => {
      console.log('[AdminPanel] Connected to realtime alerts channel');
    });

    socket.on('WARN_ORACLE_BREACH', (payload: any) => {
      console.warn('🚨 ORACLE BREACH EVENT RECEIVED', payload);
      // Play a subtle alert sound or push notification could go here
      fetchStatuses(); // Immediate refresh
    });

    return () => {
       socket.disconnect();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* ─── Worker & Outbox Health Panel ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <HeartPulse className="text-cyan-400" size={24} />
              Infrastructure Health
            </h2>
            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
              Background Worker &amp; Event Outbox
            </p>
          </div>
          <button onClick={fetchWorkerHealth} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <RefreshCcw size={16} className={loading ? 'animate-spin text-white/40' : 'text-white/40'} />
          </button>
        </div>

        {workerHealth ? (
          <div className="space-y-5">
            {/* Status badges */}
            <div className="flex flex-wrap gap-3">
              <StatusBadge
                label="Worker"
                active={workerHealth.workerRunning}
                icon={<Cog size={12} />}
              />
              <StatusBadge
                label="Reconciliation"
                active={workerHealth.reconRunning}
                icon={<RefreshCcw size={12} />}
              />
              <StatusBadge
                label="System"
                active={workerHealth.status === 'healthy'}
                icon={<Activity size={12} />}
                warning={workerHealth.status === 'degraded'}
              />
            </div>

            {/* Task pipeline counters */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricCard label="Pending" value={workerHealth.tasks.pending} color="text-amber-400" />
              <MetricCard label="Processing" value={workerHealth.tasks.processing} color="text-cyan-400" />
              <MetricCard label="Completed" value={workerHealth.tasks.completed} color="text-emerald-400" />
              <MetricCard label="Failed" value={workerHealth.tasks.failed} color="text-orange-400" />
              <MetricCard
                label="Dead Letter"
                value={workerHealth.tasks.deadLettered}
                color={workerHealth.tasks.deadLettered > 0 ? 'text-rose-400' : 'text-white/30'}
                alert={workerHealth.tasks.deadLettered > 0}
              />
            </div>

            {/* Outbox section */}
            <div className="flex items-center gap-6 pt-3 border-t border-white/5">
              <div className="flex items-center gap-2">
                <Inbox size={14} className="text-indigo-400" />
                <span className="text-[10px] font-bold uppercase text-white/40">Event Outbox</span>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-mono ${workerHealth.outbox.pending > 0 ? 'text-amber-400' : 'text-white/20'}`}>
                  {workerHealth.outbox.pending} pending
                </span>
                <span className={`text-xs font-mono ${workerHealth.outbox.deadLettered > 0 ? 'text-rose-400' : 'text-white/20'}`}>
                  {workerHealth.outbox.deadLettered} dead-lettered
                </span>
              </div>
              {workerHealth.outbox.deadLettered > 0 && (
                <div className="flex items-center gap-1 text-rose-400">
                  <Skull size={12} />
                  <span className="text-[10px] font-black uppercase">Requires Attention</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-white/30 text-sm">
            Connecting to worker service...
          </div>
        )}
      </motion.div>

      {/* ─── Oracle Circuit Breakers ──────────────────────────────────── */}
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

      {/* ─── Oracle Performance Metrics ───────────────────────────────── */}
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

// ─── Sub-components (collocated) ────────────────────────────────────────────

function StatusBadge({ label, active, icon, warning = false }: {
  label: string;
  active: boolean;
  icon: React.ReactNode;
  warning?: boolean;
}) {
  const color = warning
    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    : active
      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
      : 'bg-rose-500/10 border-rose-500/20 text-rose-400';

  return (
    <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${color}`}>
      {icon}
      <span className="text-[10px] font-bold uppercase">{label}</span>
      <span className="text-[10px] font-mono">
        {warning ? 'DEGRADED' : active ? 'RUNNING' : 'DOWN'}
      </span>
    </div>
  );
}

function MetricCard({ label, value, color, alert = false }: {
  label: string;
  value: number;
  color: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 ${alert ? 'bg-rose-500/5 border border-rose-500/20' : 'bg-white/[0.03]'}`}>
      <span className="text-[8px] text-white/30 uppercase font-black block">{label}</span>
      <span className={`text-lg font-mono font-bold ${color}`}>{value.toLocaleString()}</span>
    </div>
  );
}
