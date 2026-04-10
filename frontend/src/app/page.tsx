'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  Building2,
  Shield,
  TrendingUp,
  Users,
  Zap,
  Globe,
  ArrowRight,
  ChevronRight,
  Lock,
  BarChart3,
  Wallet,
  CheckCircle2,
  PieChart,
  Activity,
  ArrowUpRight,
} from 'lucide-react';

// Animated counter component
function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const duration = 2500;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, isInView]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

const features = [
  {
    icon: Building2,
    title: 'Institutional Assets',
    description: 'Direct access to Grade-A commercial real estate and luxury residential portfolios tokenized on-chain.',
    gradient: 'from-emerald-500/20 to-emerald-500/5',
    color: 'text-emerald-400',
  },
  {
    icon: Shield,
    title: 'Multi-layer Compliance',
    description: 'On-chain whitelisting with automated KYC/AML verification. Compliant with global financial standards.',
    gradient: 'from-blue-500/20 to-blue-500/5',
    color: 'text-blue-400',
  },
  {
    icon: Activity,
    title: 'Real-time Appraisal',
    description: 'Dynamic valuations powered by decentralized oracles, providing transparent net asset value (NAV) 24/7.',
    gradient: 'from-indigo-500/20 to-indigo-500/5',
    color: 'text-indigo-400',
  },
  {
    icon: Globe,
    title: 'Global Liquidity',
    description: 'Borderless investment opportunities with secondary market trading and 24/7 liquidity on-chain.',
    gradient: 'from-violet-500/20 to-violet-500/5',
    color: 'text-violet-400',
  },
  {
    icon: PieChart,
    title: 'Yield Optimization',
    description: 'Automated distribution of rental yields and capital gains directly to your wallet in USDC or SOL.',
    gradient: 'from-amber-500/20 to-amber-500/5',
    color: 'text-amber-400',
  },
  {
    icon: Zap,
    title: 'Settlement Speed',
    description: 'Instant transaction finality on Solana with near-zero friction. Trade assets in milliseconds.',
    gradient: 'from-cyan-500/20 to-cyan-500/5',
    color: 'text-cyan-400',
  },
];

const stats = [
  { value: 1.24, suffix: 'B+', prefix: '$', label: 'Institutional TVL' },
  { value: 4520, suffix: '', prefix: '', label: 'Whitelisted Entities' },
  { value: 128, suffix: '+', prefix: '', label: 'Tokenized Assets' },
  { value: 920, suffix: '%', prefix: '', label: 'Average BPS Yield' },
];

export default function LandingPage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  return (
    <div ref={containerRef} className="relative bg-surface-950 min-h-screen">
      {/* ─── Background Mesh ────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px]" style={{ animationDelay: '2s' }} />
      </div>

      {/* ─── Hero Section ───────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-4 flex flex-col items-center overflow-hidden">
        <motion.div 
          style={{ opacity, scale }}
          className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center"
        >
          {/* Content */}
          <div className="text-left">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.15, delayChildren: 0.2 },
                },
              }}
            >
              {/* Badge */}
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1], duration: 1 } } }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8"
              >
                <Shield size={14} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  Institutional Real World Assets • Solana
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1 
                variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1], duration: 1 } } }}
                className="text-6xl sm:text-7xl lg:text-8xl font-display font-extrabold text-white leading-[1.1] mb-8"
              >
                On-Chain
                <br />
                <span className="text-gradient-emerald">Investment</span>
                <br />
                Platforms.
              </motion.h1>

              {/* Subheadline */}
              <motion.p 
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1], duration: 1 } } }}
                className="text-xl text-white/50 max-w-xl mb-12 leading-relaxed"
              >
                Experience the next generation of capital markets. Access premium, 
                audited, and tokenized real-world assets with institutional 
                compliance and sub-second settlement.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1], duration: 1 } } }}
                className="flex flex-col sm:flex-row items-center gap-5"
              >
                <Link href="/marketplace" className="btn-institutional w-full sm:w-auto text-lg px-10 py-5 flex items-center justify-center gap-3 group">
                  Explore Marketplace
                  <ArrowUpRight size={22} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Link>
                <Link href="/dashboard" className="btn-secondary-institutional w-full sm:w-auto text-lg px-10 py-5 flex items-center justify-center gap-3">
                  Institutional Access
                </Link>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div 
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 1.5, delay: 0.8 } } }}
                className="mt-16 pt-8 border-t border-white/5"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-6 font-bold">Trusted by Industry Leaders</div>
                <div className="flex flex-wrap gap-8 opacity-40 grayscale contrast-200">
                  {/* Mock partner logos */}
                  <div className="flex items-center gap-2"><Building2 size={24} /> <span className="font-bold">METRO CAPITAL</span></div>
                  <div className="flex items-center gap-2"><Globe size={24} /> <span className="font-bold">GLOBAL CUSTODY</span></div>
                  <div className="flex items-center gap-2"><Shield size={24} /> <span className="font-bold">COMPLY CORP</span></div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative z-10 p-4 institutional-glass">
              <div className="rounded-xl overflow-hidden aspect-[4/3] relative">
                <img 
                  src="/assets/hero-rwa.png" 
                  alt="Institutional Estate" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-transparent to-transparent opacity-60" />
                
                {/* Float Card 1 */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute top-8 -right-8 p-6 institutional-glass bg-surface-950/80 max-w-[200px]"
                >
                  <div className="text-[10px] uppercase text-white/40 mb-1">Grade-A Commercial</div>
                  <div className="text-xl font-bold mb-2">Prime Plaza</div>
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <TrendingUp size={16} />
                    8.4% APY
                  </div>
                </motion.div>

                {/* Float Card 2 */}
                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                  className="absolute bottom-12 -left-8 p-6 institutional-glass bg-surface-950/80"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Zap size={24} className="text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">4.2s</div>
                      <div className="text-[10px] uppercase text-white/40">Avg Settlement</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Background Glow */}
            <div className="absolute -inset-10 bg-emerald-500/20 blur-[100px] -z-10 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Stats Grid ─────────────────────────────────── */}
      <section className="relative py-20 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-display font-bold text-white mb-2">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
                </div>
                <div className="text-xs uppercase tracking-widest text-emerald-400 font-bold">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Overhaul ──────────────────────────── */}
      <section className="relative py-32 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-display font-bold text-white mb-6"
            >
              Built for <span className="text-gradient-emerald">Institutional</span> Grade.
            </motion.h2>
            <p className="text-white/40 max-w-2xl mx-auto text-lg leading-relaxed">
              We bridge the gap between traditional finance and decentralized markets 
              through a robust, compliant, and performant tech stack.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
                  className="p-8 institutional-glass-hover group"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 transition-transform`}>
                    <Icon size={28} className={feature.color} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-white/40 leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Global Settlement ──────────────────────────── */}
      <section className="relative py-32 px-4 bg-emerald-500/[0.02]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="order-2 lg:order-1">
             <div className="relative">
                <img 
                  src="/assets/global-map.png" 
                  alt="Global Map" 
                  className="w-full opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-transparent to-transparent" />
             </div>
          </div>
          <div className="order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-4">Secondary Markets</div>
              <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-8">
                24/7 Global 
                <br />
                Liquidity.
              </h2>
              <div className="space-y-6">
                {[
                  "Sub-second settlement on Solana network",
                  "Cross-border asset allocation without friction",
                  "Deep institutional order books",
                  "Real-time on-chain transparency"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    </div>
                    <span className="text-lg text-white/70 font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/marketplace" className="mt-12 btn-institutional px-10 py-5 flex items-center justify-center gap-3 w-fit">
                Start Investing
                <ArrowRight size={20} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-20 px-4 mt-20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center">
                <Building2 size={22} className="text-white" />
              </div>
              <span className="font-display font-bold text-2xl text-white tracking-tight">
                Asset<span className="text-emerald-400">verse</span>
              </span>
            </Link>
            <p className="text-white/40 max-w-sm text-lg leading-relaxed">
              Institutional-grade bridge between physical assets and digital liquidity. 
              Compliance-first, audited, and secure.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Platform</h4>
            <div className="flex flex-col gap-4 text-white/40 font-medium">
              <Link href="/marketplace" className="hover:text-emerald-400 transition-colors">Marketplace</Link>
              <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">Explorer</Link>
              <Link href="/portfolio" className="hover:text-emerald-400 transition-colors">Portfolio</Link>
              <Link href="/admin" className="hover:text-emerald-400 transition-colors">Issuer Hub</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Resources</h4>
            <div className="flex flex-col gap-4 text-white/40 font-medium">
              <Link href="#" className="hover:text-emerald-400 transition-colors">Compliance Guide</Link>
              <Link href="#" className="hover:text-emerald-400 transition-colors">Documentation</Link>
              <Link href="#" className="hover:text-emerald-400 transition-colors">API Reference</Link>
              <Link href="#" className="hover:text-emerald-400 transition-colors">Institutional Deck</Link>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-white/30 font-medium">
          <div className="flex items-center gap-6">
            <span>© 2026 Assetverse Connect</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="uppercase tracking-widest text-[10px]">Solana Network Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
