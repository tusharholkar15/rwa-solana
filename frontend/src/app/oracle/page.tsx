'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, ShieldAlert, Activity, Zap, Cpu, 
  History, Server, Globe, RefreshCcw, ArrowRight,
  Database, Lock, CheckCircle2, AlertTriangle, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, shortenAddress } from '@/lib/constants';
import GovernanceProgress from '@/components/governance/GovernanceProgress';
import { FileText, ExternalLink } from 'lucide-react';

export default function OracleTransparencyPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const res = await api.getNetworkIntegrity();
      setData(res);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to sync with oracle heartbeats");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw size={48} className="text-emerald-400 animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Syncing Network Integrity...</span>
        </div>
      </div>
    );
  }

  const { stats, logs, assets, activeSecurityProposals } = data || { stats: {}, logs: [], assets: [], activeSecurityProposals: [] };

  return (
    <div className="min-h-screen bg-surface-950 pb-32 pt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ─── Transparency Header ───────────────────────── */}
        <div className="mb-12">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <ShieldCheck size={20} className="text-emerald-400" />
               </div>
               <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Institutional Transparency Center</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-2">
              Network<span className="text-emerald-400">Integrity</span>
            </h1>
            <p className="text-white/40 max-w-2xl font-medium">
              Real-time monitor of the platform's price protection infrastructure. Every data node below is a live reflection of on-chain circuit breakers and multi-oracle consensus health.
            </p>
          </motion.div>
        </div>

        {/* ─── Live Pulse Stats ───────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <StatCard 
             icon={<Activity className="text-emerald-400" />} 
             label="System Status" 
             value={stats.systemStatus?.toUpperCase()} 
             subValue={`Last Pulse: ${new Date(stats.lastHeartbeat).toLocaleTimeString()}`}
             statusColor={stats.systemStatus === 'operational' ? 'text-emerald-400' : 'text-amber-400'}
          />
          <StatCard 
             icon={<ShieldCheck className="text-indigo-400" />} 
             label="Circuit Breakers" 
             value={`${stats.healthyAssets}/${stats.totalAssets}`} 
             subValue="Active Protection nodes"
          />
          <StatCard 
             icon={<Zap className="text-amber-400" />} 
             label="Consensus Quality" 
             value={`${stats.consensusQuality}%`} 
             subValue="Pyth/Switchboard Parity"
          />
          <StatCard 
             icon={<Globe className="text-blue-400" />} 
             label="Validator Health" 
             value="LOCALNET-V1" 
             subValue="Latency: 420ms"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* ─── Asset Health Rows ────────────────────────── */}
           <div className="lg:col-span-2 space-y-6">
              <div className="institutional-glass p-8 bg-white/[0.01]">
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="font-display font-bold text-xl text-white flex items-center gap-3">
                       <Server size={20} className="text-white/40" />
                       On-Chain Asset Nodes
                    </h3>
                    {stats.trippedAssets > 0 && (
                       <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-black text-rose-400 animate-pulse">
                          <AlertCircle size={12} /> {stats.trippedAssets} BREACHES DETECTED
                       </span>
                    )}
                 </div>

                 <div className="space-y-4">
                    {assets.map((asset: any) => (
                       <div key={asset.id} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group flex flex-col justify-between gap-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${asset.isTripped ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                                {asset.isTripped ? <ShieldAlert size={24} className="text-rose-400" /> : <ShieldCheck size={24} className="text-emerald-400" />}
                             </div>
                             <div>
                                <div className="text-lg font-display font-bold text-white group-hover:text-emerald-400 transition-colors">{asset.name}</div>
                                <div className="text-[10px] text-white/30 font-black uppercase tracking-widest">{asset.symbol}</div>
                             </div>
                          </div>

                          <div className="flex items-center gap-8">
                             <div className="text-right">
                                <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">Last Valid Nav</div>
                                <div className="text-sm font-mono text-white/80">{formatCurrency(asset.lastPrice)}</div>
                             </div>
                             <div className="h-10 w-px bg-white/5" />
                             <div className="text-right min-w-[140px]">
                                <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">Breaker Status</div>
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-tighter ${asset.isTripped ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                   {asset.isTripped ? (
                                      <><AlertTriangle size={12} /> TRIP: {asset.tripReason.toUpperCase()}</>
                                   ) : (
                                      <><CheckCircle2 size={12} /> SECURED</>
                                   )}
                                </div>
                             </div>
                          </div>
                        </div>

                        {/* Legal Attestations Row */}
                        {asset.legalAttestations && asset.legalAttestations.length > 0 && (
                          <div className="pt-4 border-t border-white/5 flex flex-wrap gap-3">
                            {asset.legalAttestations.map((doc: any, i: number) => (
                              <a 
                                key={i}
                                href={`https://ipfs.io/ipfs/${doc.hash || doc.ipfsUri}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-2 py-1 rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group/doc"
                              >
                                <FileText size={10} className="text-indigo-400" />
                                <span className="text-[9px] font-bold text-white/60 group-hover/doc:text-white uppercase">{doc.name || 'Legal Doc'}</span>
                                <ExternalLink size={8} className="text-white/20 group-hover/doc:text-white" />
                              </a>
                            ))}
                          </div>
                        )}
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* ─── Governance & Security Audit Sidebar ────────── */}
           <div className="space-y-6">
              <GovernanceProgress proposals={activeSecurityProposals} />

              <div className="institutional-glass p-8 bg-white/[0.01]">
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="font-display font-bold text-xl text-white flex items-center gap-3">
                       <History size={20} className="text-white/40" />
                       Integrity Logs
                    </h3>
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
                    </div>
                 </div>

                 <div className="space-y-6">
                    {logs.map((log: any, i: number) => (
                       <div key={i} className="relative pl-6 border-l border-white/5">
                          <div className={`absolute left-[-4px] top-1 w-2 h-2 rounded-full ${log.severity === 'critical' || log.severity === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                          <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">
                             {new Date(log.createdAt).toLocaleTimeString()} • {log.eventType.replace('_', ' ')}
                          </div>
                          <div className="text-sm font-medium text-white/80 mb-2">
                             {log.assetId?.name || 'Network'}: {getLogMessage(log)}
                          </div>
                          {log.signature && (
                             <a 
                                href={`https://explorer.solana.com/tx/${log.signature}?cluster=custom&customUrl=http://localhost:8899`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors"
                             >
                                <Lock size={10} /> View Proof
                             </a>
                          )}
                       </div>
                    ))}
                    {logs.length === 0 && (
                       <div className="text-center py-12">
                          <ShieldCheck size={48} className="text-white/5 mx-auto mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No security incidents detected</p>
                       </div>
                    )}
                 </div>
              </div>

              <div className="institutional-glass p-8 bg-indigo-500/5 border-indigo-500/20">
                 <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <Database size={16} /> 
                    Multi-Oracle Verification
                 </h4>
                 <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                    Our platform utilizes institutional-grade price feeds from <strong>Pyth</strong> and <strong>Switchboard</strong>. Every 60 seconds, our on-chain guardian cross-references these feeds. Any drift exceeding 5.0% or staleness over 6hr instantly triggers a liquidity halt for that asset.
                 </p>
                 <Link href="/portfolio" className="mt-6 flex items-center justify-center gap-2 text-indigo-400 font-black uppercase text-[10px] tracking-widest group">
                    Return to Portfolio <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                 </Link>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subValue, statusColor = 'text-white' }: any) {
   return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="institutional-glass p-6 bg-white/[0.02]">
         <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
               {icon}
            </div>
            <div className="text-right">
               <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{label}</div>
               <div className={`text-2xl font-display font-black ${statusColor}`}>{value}</div>
            </div>
         </div>
         <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest pt-4 border-t border-white/5">
            {subValue}
         </div>
      </motion.div>
   );
}

function getLogMessage(log: any) {
   if (log.eventType === 'oracle_breach') return `Divergence of ${(log.details.spread_bps / 100).toFixed(2)}% detected between oracle feeds.`;
   if (log.eventType === 'circuit_breaker_trip') return `Trading automatically halted due to recurring ${log.details.reason} anomalies.`;
   if (log.eventType === 'guardian_reset') return `Asset recovered and reactivated by institutional guardian.`;
   return 'Security heartbeat recorded.';
}
