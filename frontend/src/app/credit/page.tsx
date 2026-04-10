'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Gauge, TrendingUp, Shield, Award, Clock, Wallet, PieChart,
  Activity, AlertTriangle, CheckCircle, ChevronRight, Lock,
} from 'lucide-react';
import { api } from '@/lib/api';

const TIER_GRADIENTS: Record<string, string> = {
  Excellent: 'from-emerald-500 to-emerald-600',
  Good: 'from-indigo-500 to-indigo-600',
  Fair: 'from-amber-500 to-amber-600',
  Poor: 'from-red-500 to-red-600',
};

export default function CreditPage() {
  const [score, setScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const data = await api.getCreditScore('DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
        setScore(data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchScore();
  }, []);

  // Calculate gauge rotation (300=0°, 850=180°)
  const gaugeRotation = score ? ((score.score - 300) / 550) * 180 : 0;
  const scorePercent = score ? ((score.score - 300) / 550) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
            <Gauge size={48} className="text-emerald-400 mx-auto" />
          </motion.div>
          <p className="text-white/40 mt-4">Computing your credit score...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 pb-20">
      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Gauge size={22} className="text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white">Credit Score</h1>
          </div>
          <p className="text-white/40">On-chain credit assessment for lending and borrowing</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        {/* Score Card */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Score Gauge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-1 p-8 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 text-center"
          >
            {/* Circular Gauge */}
            <div className="relative w-48 h-24 mx-auto mb-6 overflow-hidden">
              <svg viewBox="0 0 200 100" className="w-full h-full">
                {/* Background arc */}
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" strokeLinecap="round" />
                {/* Score arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke={score?.tierColor || '#10b981'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${scorePercent * 2.51} 251`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="text-4xl font-bold text-white">{score?.score || 0}</div>
                </motion.div>
              </div>
            </div>

            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${TIER_GRADIENTS[score?.tier] || TIER_GRADIENTS.Fair}`}>
              <Award size={16} className="text-white" />
              <span className="text-white font-bold">{score?.tier || 'N/A'}</span>
            </div>

            <div className="mt-4 text-xs text-white/30">Range: 300 – 850</div>
          </motion.div>

          {/* Score Benefits */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 p-6 rounded-2xl bg-white/[0.03] border border-white/5">
            <h3 className="text-lg font-bold text-white mb-6">Your Credit Benefits</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Max Loan-to-Value</div>
                <div className="text-3xl font-bold text-emerald-400">{score ? `${(score.maxLTV * 100).toFixed(0)}%` : 'N/A'}</div>
                <div className="text-xs text-white/30 mt-1">Of your collateral value</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Base Interest Rate</div>
                <div className="text-3xl font-bold text-indigo-400">{score?.baseInterestRate || 0}%</div>
                <div className="text-xs text-white/30 mt-1">Annual (variable)</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Valid Until</div>
                <div className="text-lg font-bold text-white">{score?.validUntil ? new Date(score.validUntil).toLocaleDateString() : 'N/A'}</div>
                <div className="text-xs text-white/30 mt-1">Score refreshes daily</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Status</div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={20} className="text-emerald-400" />
                  <span className="text-lg font-bold text-emerald-400">Eligible</span>
                </div>
                <div className="text-xs text-white/30 mt-1">For asset-backed loans</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Score Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <PieChart size={18} className="text-indigo-400" /> Score Breakdown
          </h3>
          <div className="space-y-4">
            {score?.breakdown?.map((factor: any, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-40 text-sm text-white/60 font-medium">{factor.category}</div>
                <div className="flex-1 relative">
                  <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${factor.score}%` }}
                      transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${score.tierColor}80, ${score.tierColor})` }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span className="text-white font-bold text-sm">{factor.score}</span>
                  <span className="text-white/30 text-xs">/100</span>
                </div>
                <div className="w-12 text-right text-xs text-white/30">{factor.weight}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* How to Improve */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-violet-500/5 border border-indigo-500/10">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-400" /> Improve Your Score
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { tip: 'Make regular investments to build transaction history', icon: Activity },
              { tip: 'Diversify across 5+ different asset types and regions', icon: PieChart },
              { tip: 'Complete full KYC verification including document upload', icon: Shield },
              { tip: 'Maintain your wallet for 6+ months with active trading', icon: Clock },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03]">
                <item.icon size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <span className="text-sm text-white/60">{item.tip}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
