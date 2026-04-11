'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Heart, Shield, Home, TrendingUp, Wrench, Eye,
  ArrowLeft, AlertTriangle, CheckCircle2, BarChart3, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, Area, AreaChart,
} from 'recharts';
import { api } from '@/lib/api';
import { DashboardSkeleton } from '@/components/shared/Skeletons';

export default function PropertyHealthPage() {
  const params = useParams();
  const assetId = params.id as string;

  const [asset, setAsset] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [riskScore, setRiskScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [assetRes, dashboardRes, riskRes] = await Promise.allSettled([
          api.getAsset(assetId),
          api.getPropertyDashboard(assetId),
          api.getRiskScore(assetId),
        ]);

        if (assetRes.status === 'fulfilled') setAsset(assetRes.value.asset);
        if (dashboardRes.status === 'fulfilled') setDashboard(dashboardRes.value);
        if (riskRes.status === 'fulfilled') setRiskScore(riskRes.value);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [assetId]);

  // Risk Radar chart data
  const radarData = useMemo(() => {
    if (!riskScore?.components) return [
      { axis: 'Market', value: 30 },
      { axis: 'Legal', value: 20 },
      { axis: 'Liquidity', value: 40 },
      { axis: 'Physical', value: 25 },
      { axis: 'Occupancy', value: 15 },
    ];
    const c = riskScore.components;
    return [
      { axis: 'Market', value: c.volatilityRisk || c.marketRisk || 30 },
      { axis: 'Legal', value: c.legalFreshnessRisk || c.legalRisk || 20 },
      { axis: 'Liquidity', value: c.yieldSpreadRisk || c.liquidityRisk || 40 },
      { axis: 'Physical', value: c.jurisdictionRisk || c.physicalRisk || 25 },
      { axis: 'Occupancy', value: c.occupancyRisk || 15 },
    ];
  }, [riskScore]);

  // Mock yield history for chart (would come from ROI analytics endpoint)
  const yieldHistory = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      yield: 6 + Math.random() * 4,
      cumulative: (i + 1) * (6 + Math.random() * 2),
    }));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 pt-10 pb-32">
        <div className="max-w-7xl mx-auto px-4"><DashboardSkeleton /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-950 pt-10 pb-32 flex items-center justify-center">
        <div className="institutional-glass p-12 text-center max-w-md">
          <AlertTriangle size={48} className="text-amber-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Unable to Load Data</h3>
          <p className="text-white/40 text-sm mb-6">{error}</p>
          <Link href={`/asset/${assetId}`} className="btn-secondary-institutional">
            <ArrowLeft size={16} /> Back to Asset
          </Link>
        </div>
      </div>
    );
  }

  const healthScore = dashboard?.healthScore || riskScore?.compositeScore || 72;
  const occupancy = dashboard?.occupancyRate ?? asset?.propertyHealth?.occupancyRate ?? 85;
  const totalRent = dashboard?.totalRentCollected || 0;
  const totalMaintenance = dashboard?.totalMaintenanceCost || 0;
  const lastInspection = dashboard?.lastInspection || asset?.propertyHealth?.lastInspectionAt;
  const compositeRisk = riskScore?.compositeScore || 35;

  return (
    <div className="min-h-screen bg-surface-950 pt-10 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Link + Header */}
        <div className="mb-10">
          <Link href={`/asset/${assetId}`} className="flex items-center gap-2 text-white/40 hover:text-white text-sm font-bold uppercase tracking-widest transition-colors mb-6">
            <ArrowLeft size={16} /> Back to Asset
          </Link>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Heart size={20} className="text-emerald-400" />
              </div>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Property Intelligence</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-2">
              {asset?.name || 'Property'} — <span className="text-emerald-400">Health Dashboard</span>
            </h1>
          </motion.div>
        </div>

        {/* ─── Health Score Hero ────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="institutional-glass p-8 bg-white/[0.01] text-center relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-4">Property Health Score</div>
              <div className={`text-6xl font-display font-black mb-2 ${
                healthScore >= 80 ? 'text-emerald-400' :
                healthScore >= 50 ? 'text-amber-400' :
                'text-rose-400'
              }`}>
                {healthScore}
              </div>
              <div className="text-xs text-white/40 font-bold uppercase tracking-widest">
                {healthScore >= 80 ? 'Excellent' : healthScore >= 50 ? 'Moderate' : 'Needs Attention'}
              </div>
            </div>
            {/* Background glow */}
            <div className={`absolute inset-0 opacity-10 ${
              healthScore >= 80 ? 'bg-emerald-500' : healthScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'
            }`} style={{ filter: 'blur(60px)' }} />
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="institutional-glass p-8 bg-white/[0.01]">
            <div className="flex items-center gap-3 mb-4">
              <Home size={20} className="text-cyan-400" />
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Occupancy Rate</span>
            </div>
            <div className="text-3xl font-display font-black text-white mb-3">{occupancy}%</div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${occupancy}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-cyan-500 rounded-full"
              />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="institutional-glass p-8 bg-white/[0.01]">
            <div className="flex items-center gap-3 mb-4">
              <Eye size={20} className="text-indigo-400" />
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Last Inspection</span>
            </div>
            <div className="text-lg font-display font-bold text-white mb-1">
              {lastInspection ? new Date(lastInspection).toLocaleDateString() : 'Not Scheduled'}
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              {lastInspection ? (
                <><CheckCircle2 size={12} className="text-emerald-500" /> Verified</>
              ) : (
                <><AlertTriangle size={12} className="text-amber-400" /> Pending</>
              )}
            </div>
          </motion.div>
        </div>

        {/* ─── Financial Metrics ───────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Rent Collected', value: `$${totalRent.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Maintenance Cost', value: `$${totalMaintenance.toLocaleString()}`, icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Net Income', value: `$${(totalRent - totalMaintenance).toLocaleString()}`, icon: BarChart3, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            { label: 'Composite Risk', value: `${compositeRisk}/100`, icon: Shield, color: compositeRisk > 50 ? 'text-rose-400' : 'text-emerald-400', bg: compositeRisk > 50 ? 'bg-rose-500/10' : 'bg-emerald-500/10' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="institutional-glass p-6 bg-white/[0.01]"
            >
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div className="text-2xl font-display font-black text-white">{s.value}</div>
              <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ─── Charts Row ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* Risk Radar Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="institutional-glass p-8 bg-white/[0.01]"
          >
            <h3 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-3">
              <Shield size={20} className="text-indigo-400" />
              Risk Decomposition Radar
            </h3>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.05)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700 }} />
                  <PolarRadiusAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} domain={[0, 100]} />
                  <Radar name="Risk" dataKey="value" stroke="#818cf8" fill="#818cf8" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Yield History Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="institutional-glass p-8 bg-white/[0.01]"
          >
            <h3 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-3">
              <TrendingUp size={20} className="text-emerald-400" />
              Yield Performance (12M)
            </h3>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yieldHistory}>
                  <defs>
                    <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15,23,42,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                    itemStyle={{ color: '#10b981' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                  />
                  <Area type="monotone" dataKey="yield" stroke="#10b981" fill="url(#yieldGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* ─── Property Events Timeline ──────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="institutional-glass p-8 bg-white/[0.01]"
        >
          <h3 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-3">
            <Activity size={20} className="text-white/40" />
            Property Event Timeline
          </h3>
          {dashboard?.recentEvents?.length > 0 ? (
            <div className="space-y-3">
              {dashboard.recentEvents.map((event: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border text-xs font-bold uppercase ${
                    event.eventType === 'rent_collection' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    event.eventType === 'maintenance' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                    event.eventType === 'inspection' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' :
                    'bg-white/5 border-white/10 text-white/40'
                  }`}>
                    {event.eventType?.slice(0, 4)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white capitalize">{event.eventType?.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-white/30">{new Date(event.createdAt).toLocaleString()}</div>
                  </div>
                  {event.amount && (
                    <div className="text-sm font-bold text-white">${event.amount.toLocaleString()}</div>
                  )}
                  {event.isVerified && <CheckCircle2 size={16} className="text-emerald-500" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/20">
              <Activity size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No property events recorded yet.</p>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
