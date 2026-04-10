'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import PremiumWalletButton from '@/components/wallet/PremiumWalletButton';
import {
  Building2,
  LayoutDashboard,
  Store,
  Briefcase,
  BarChart3,
  Shield,
  Menu,
  X,
  Activity,
  ExternalLink,
  EyeOff,
  UserCheck
} from 'lucide-react';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/marketplace', label: 'Marketplace', icon: Store, chip: 'HOT' },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/darkpool', label: 'Dark Pool', icon: EyeOff, chip: 'INST' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/compliance', label: 'Compliance', icon: UserCheck },
  { href: '/admin', label: 'Admin', icon: Shield },
];

export default function Navbar() {
  const pathname = usePathname();
  const { connected } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled 
            ? 'py-3 px-4' 
            : 'py-4 px-4 lg:px-6'
        }`}
      >
        <div 
          className={`w-full max-w-[1600px] mx-auto h-[64px] rounded-2xl border transition-all duration-500 flex items-center justify-between px-4 lg:px-5 ${
            scrolled
              ? 'bg-surface-950/80 backdrop-blur-2xl border-white/10 shadow-2xl shadow-emerald-500/10'
              : 'bg-white/5 backdrop-blur-md border-white/5'
          }`}
        >
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-2.5 group focus:outline-none shrink-0">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-500 shadow-lg shadow-emerald-500/20">
                <Building2 size={18} className="text-white" />
              </div>
              {scrolled && (
                <div className="absolute -inset-1 bg-emerald-500/20 blur-xl rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-lg text-white tracking-tighter leading-none">
                ASSET<span className="text-emerald-400">VERSE</span>
              </span>
              <span className="text-[7px] text-white/40 uppercase tracking-[0.25em] font-bold mt-0.5 hidden xl:block">
                Protocol Core
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-0.5 xl:gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-2 py-2 xl:px-3 xl:py-2 rounded-lg text-[9px] xl:text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1 xl:gap-1.5 whitespace-nowrap ${
                    isActive 
                      ? 'text-white bg-white/8' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <link.icon size={13} className={isActive ? 'text-emerald-400' : 'opacity-40'} />
                  <span className="hidden xl:inline">{link.label}</span>
                  <span className="xl:hidden">{link.label.length > 6 ? link.label.slice(0, 4) + '.' : link.label}</span>
                  {link.chip && (
                    <span className="text-[7px] px-1 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse leading-none">
                      {link.chip}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute -bottom-0.5 left-3 right-3 h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">Nominal</span>
            </div>

            <PremiumWalletButton />

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 text-white/60 hover:text-white transition-colors"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-surface-950 lg:hidden overflow-y-auto"
          >
            <div className="p-8 flex flex-col min-h-screen">
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <Building2 size={24} className="text-white" />
                  </div>
                  <span className="font-display font-black text-2xl text-white tracking-tighter">
                    ASSET<span className="text-emerald-400">VERSE</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 rounded-full bg-white/5 text-white/60"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 space-y-3">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-5 rounded-2xl transition-all ${
                        isActive
                          ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20'
                          : 'bg-white/5 text-white/40 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-5">
                        <link.icon size={24} />
                        <span className="text-xl font-black uppercase tracking-tight">
                          {link.label}
                        </span>
                      </div>
                      <ExternalLink size={18} className={isActive ? 'text-white' : 'opacity-20'} />
                    </Link>
                  );
                })}
              </div>

              <div className="mt-auto pt-10 space-y-6">
                <div className="wallet-adapter-wrapper-mobile relative">
                  <PremiumWalletButton className="!w-full !h-14 !text-lg" />
                </div>
                <div className="flex justify-between items-center text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                  <span>Protocol v1.0.4</span>
                  <span className="flex items-center gap-2 text-emerald-500">
                    <Activity size={12} /> NOMINAL
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
