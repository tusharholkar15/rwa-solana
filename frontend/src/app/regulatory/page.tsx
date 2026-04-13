'use client';

import React, { useState, useEffect } from 'react';

// Institutional Dashboard Components (Simulated for MVP)
const GlassCard = ({ title, value, subtext, color = 'emerald' }: any) => (
  <div className="institutional-glass p-6 glow-border group hover:-translate-y-1 transition-all duration-500">
    <div className="flex justify-between items-start mb-4">
      <span className="text-white/40 font-display font-medium text-xs uppercase tracking-widest">{title}</span>
      <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-400 group-hover:scale-110 transition-transform duration-500`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
    </div>
    <div className={`text-3xl font-black text-white mb-2 font-display`}>{value}</div>
    <div className="text-emerald-400/70 text-xs font-bold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
      {subtext}
    </div>
  </div>
);

export default function RegulatoryDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [jurisdictionStats, setJurisdictionStats] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // In production, these are real API calls to /api/regulatory
        // For simulation, we wait and then set real-looking data
        await new Promise(r => setTimeout(r, 800));
        
        setStats({
          totalTVLFormatted: "$142.4M",
          activeAssets: 12,
          complianceHealth: "99.98%",
          totalBreaches: 4
        });

        setJurisdictionStats([
          { country: "USA", jurisdictionId: 1, volume: "45.2M", count: 1250, color: "#3B82F6" },
          { country: "Switzerland", jurisdictionId: 2, volume: "32.8M", count: 840, color: "#10B981" },
          { country: "Singapore", jurisdictionId: 4, volume: "18.5M", count: 420, color: "#F59E0B" },
          { country: "United Kingdom", jurisdictionId: 8, volume: "12.1M", count: 310, color: "#8B5CF6" }
        ]);

        setAlerts([
          { id: 1, type: "COMPLIANCE_BREACH", msg: "Sanctioned Wallet Attempted Buy (San Francisco Node)", time: "2m ago", severity: "HIGH" },
          { id: 2, type: "ORACLE_DIFF", msg: "Pyth vs Switchboard Spread > 15bps (NYC Office Asset)", time: "15m ago", severity: "MED" },
          { id: 3, type: "LIMIT_REACHED", msg: "Institutional Daily Cap Reached for Retail Tier 2", time: "1h ago", severity: "LOW" }
        ]);

        setLoading(false);
      } catch (e) {
        console.error("Dashboard failed to load", e);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-height-screen p-12 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <div className="text-white/40 font-display animate-pulse uppercase tracking-widest text-xs">Authenticating Regulatory Session...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="text-emerald-500 font-display font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"></span>
            Live Institutional Oversight
          </div>
          <h1 className="text-5xl font-black text-white font-display">Regulatory Dashboard</h1>
        </div>
        <div className="flex gap-4">
          <button className="btn-secondary-institutional text-xs h-12">Export Audit Trail</button>
          <button className="btn-institutional text-xs h-12 px-8 bg-red-600 hover:bg-red-500 shadow-red-500/20">Emergency Circuit Breaker</button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <GlassCard title="Total Platform TVL" value={stats.totalTVLFormatted} subtext="Institutional Assets" />
        <GlassCard title="Global Compliance Health" value={stats.complianceHealth} subtext="KYC/AML Passing Rate" />
        <GlassCard title="Active Issuers" value={stats.activeAssets} subtext="Verified Real Estate DAOs" />
        <GlassCard title="Unresolved Alerts" value={stats.totalBreaches} subtext="Critical Infrastructure Action" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Jurisdiction Distribution */}
        <div className="lg:col-span-2 institutional-glass p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold font-display">Geographic Capital Distribution</h3>
            <span className="text-white/40 text-xs uppercase tracking-widest">Global Jurisdictions</span>
          </div>
          
          <div className="space-y-6">
            {jurisdictionStats.map((j) => (
              <div key={j.country} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white font-semibold flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: j.color }}></div>
                    {j.country}
                  </span>
                  <span className="text-white/60 font-mono">${j.volume} SOL • {j.count} Investors</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-1000 ease-out" 
                    style={{ width: `${Math.random() * 50 + 40}%`, backgroundColor: j.color }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-white/5 bg-white/[0.02] p-6 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                </div>
                <div>
                   <div className="text-white font-bold">Interactive Heatmap Available</div>
                   <div className="text-white/40 text-xs">Switch to geospatial view for city-level density</div>
                </div>
             </div>
             <button className="btn-secondary-institutional text-xs py-2">Enable 3D GIS Mode</button>
          </div>
        </div>

        {/* Live Alert Feed */}
        <div className="institutional-glass p-8 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold font-display">Integrity Ticker</h3>
            <div className="flex items-center gap-2">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
               </span>
               <span className="text-red-500 font-bold text-[10px] uppercase tracking-tighter">Live Monitor</span>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-4 rounded-xl border-l-4 bg-white/[0.03] transition-all duration-300 hover:bg-white/[0.06] ${
                  alert.severity === 'HIGH' ? 'border-red-500' : alert.severity === 'MED' ? 'border-amber-500' : 'border-indigo-500'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-black p-1 px-1.5 rounded leading-none ${
                    alert.severity === 'HIGH' ? 'bg-red-500/20 text-red-500' : alert.severity === 'MED' ? 'bg-amber-500/20 text-amber-500' : 'bg-indigo-500/20 text-indigo-500'
                  }`}>
                    {alert.type}
                  </span>
                  <span className="text-white/30 text-[10px] uppercase font-bold">{alert.time}</span>
                </div>
                <div className="text-xs text-white/80 leading-relaxed">{alert.msg}</div>
              </div>
            ))}
          </div>

          <button className="w-full mt-6 py-4 rounded-xl border border-white/5 bg-white/5 text-white/60 text-xs font-bold hover:bg-white/10 hover:text-white transition-all duration-300">
            View Analytics History
          </button>
        </div>
      </div>

    </div>
  );
}
