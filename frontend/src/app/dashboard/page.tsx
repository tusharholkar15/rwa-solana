'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  BarChart3,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Globe,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber, lamportsToSol, shortenAddress } from '@/lib/constants';
import { useCurrency } from '@/context/CurrencyContext';
import Link from 'next/link';
import AuthGate from '@/components/shared/AuthGate';

import dynamic from 'next/dynamic';

// Dynamic imports for charts to improve performance
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });

const CHART_COLORS = ['#818cf8', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e'];

export default function DashboardPage() {
  const { formatPrice } = useCurrency();
  const { connected, publicKey } = useWallet();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [solPrice, setSolPrice] = useState(145);

  useEffect(() => {
    async function load() {
      try {
        const activeWallet = connected && publicKey ? publicKey.toBase58() : null;
        
        if (activeWallet) {
          const res = await api.getPortfolio(activeWallet);
          setPortfolio(res.portfolio);
          setSolPrice(res.solPrice);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [connected, publicKey]);

  // Mock chart data
  const chartData = Array.from({ length: 30 }, (_, i) => ({
    day: `Day ${i + 1}`,
    value: 15000 + Math.random() * 8000 + i * 200,
  }));

  const pieData = [
    { name: 'Residential', value: 45 },
    { name: 'Commercial', value: 30 },
    { name: 'Industrial', value: 15 },
    { name: 'Land', value: 10 },
  ];

  if (!connected) {
    return (
      <AuthGate 
        title="Institutional Dashboard" 
        description="Link your corporate Solana wallet to monitor real-time asset yields, total allocation, and protocol P&L data." 
      />
    );
  }

  const activeWallet = publicKey?.toBase58();

  const totalValue = portfolio?.totalValue ? lamportsToSol(portfolio.totalValue) * solPrice : 0;
  const totalInvested = portfolio?.totalInvested ? lamportsToSol(portfolio.totalInvested) * solPrice : 0;
  const unrealizedPnl = totalValue - totalInvested;
  const pnlPercent = totalInvested > 0 ? (unrealizedPnl / totalInvested) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white/40">
          Welcome back, <span className="text-brand-400">{shortenAddress(activeWallet || '')}</span>
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          {
            label: 'Portfolio Value',
            value: formatPrice(totalValue),
            change: `${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`,
            positive: pnlPercent >= 0,
            icon: DollarSign,
            color: 'from-brand-500 to-brand-600',
          },
          {
            label: 'Total Invested',
            value: formatPrice(totalInvested),
            change: `${portfolio?.assetsCount || 0} assets`,
            positive: true,
            icon: BarChart3,
            color: 'from-cyan-500 to-blue-500',
          },
          {
            label: 'Unrealized P&L',
            value: formatPrice(Math.abs(unrealizedPnl)),
            change: unrealizedPnl >= 0 ? 'Profit' : 'Loss',
            positive: unrealizedPnl >= 0,
            icon: unrealizedPnl >= 0 ? TrendingUp : TrendingDown,
            color: unrealizedPnl >= 0 ? 'from-emerald-500 to-green-500' : 'from-rose-500 to-red-500',
          },
          {
            label: 'Yield Earned',
            value: formatPrice(portfolio?.totalYieldEarned || 0),
            change: 'Lifetime',
            positive: true,
            icon: Activity,
            color: 'from-amber-500 to-orange-500',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
            className="institutional-glass p-6 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon size={22} className="text-white" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${stat.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stat.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {stat.change}
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-white/40 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Portfolio Value Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          className="lg:col-span-2 institutional-glass p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-6">Portfolio Performance</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,42,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Value']}
                />
                <Area type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Asset Distribution Pie */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          className="institutional-glass p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-6">Asset Distribution</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,42,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {pieData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: CHART_COLORS[i] }} />
                  <span className="text-white/60">{item.name}</span>
                </div>
                <span className="text-white font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
        className="grid sm:grid-cols-3 gap-6"
      >
        <Link href="/marketplace" className="institutional-glass-hover p-6 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all duration-500 ease-out">
            <Building2 size={22} className="text-emerald-400" />
          </div>
          <div>
            <h4 className="text-white font-bold tracking-tight">Browse Properties</h4>
            <p className="text-sm text-white/40 font-medium">Explore marketplace</p>
          </div>
        </Link>
        <Link href="/portfolio" className="institutional-glass-hover p-6 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all duration-500 ease-out">
            <BarChart3 size={22} className="text-indigo-400" />
          </div>
          <div>
            <h4 className="text-white font-bold tracking-tight">View Portfolio</h4>
            <p className="text-sm text-white/40 font-medium">Track investments</p>
          </div>
        </Link>
        <Link href="/transactions" className="institutional-glass-hover p-6 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 group-hover:scale-110 transition-all duration-500 ease-out">
            <Activity size={22} className="text-violet-400" />
          </div>
          <div>
            <h4 className="text-white font-bold tracking-tight">Transaction History</h4>
            <p className="text-sm text-white/40 font-medium">Recent activity</p>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
