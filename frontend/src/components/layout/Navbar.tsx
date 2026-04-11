'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import PremiumWalletButton from '@/components/wallet/PremiumWalletButton';
import {
  Building2, LayoutDashboard, Store, Briefcase, BarChart3, Shield, Menu, X,
  Activity, EyeOff, UserCheck, Vote, Droplets, DollarSign, Network, Radio,
  ChevronDown, TrendingUp, ArrowRight, Cpu, LogOut,
} from 'lucide-react';
import { useRole } from '@/context/RoleContext';

// ─── Navigation Structure ────────────────────────────────────────────────────
const navGroups = [
  {
    label: 'Trade',
    icon: TrendingUp,
    color: '#10b981',
    items: [
      { href: '/marketplace', label: 'Marketplace', icon: Store, desc: 'Browse tokenized assets', chip: 'HOT' },
      { href: '/liquidity', label: 'Liquidity Pools', icon: Droplets, desc: 'AMM swap &amp; LP management' },
      { href: '/darkpool', label: 'Dark Pool', icon: EyeOff, desc: 'Institutional block trading', chip: 'INST' },
    ],
  },
  {
    label: 'Portfolio',
    icon: Briefcase,
    color: '#6366f1',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview &amp; KPIs' },
      { href: '/portfolio', label: 'My Portfolio', icon: Briefcase, desc: 'Holdings &amp; tax lots' },
      { href: '/yield', label: 'USDC Yield', icon: DollarSign, desc: 'Rent income &amp; distributions', chip: 'V2' },
    ],
  },
  {
    label: 'Governance',
    icon: Vote,
    color: '#8b5cf6',
    items: [
      { href: '/governance', label: 'DAO Proposals', icon: Vote, desc: 'Vote on asset decisions' },
      { href: '/delegate', label: 'Delegation', icon: Network, desc: 'Quadratic voting power', chip: 'NEW' },
    ],
  },
  {
    label: 'Intelligence',
    icon: BarChart3,
    color: '#f59e0b',
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3, desc: 'Market data &amp; heatmaps' },
      { href: '/oracle', label: 'Oracle Health', icon: Radio, desc: 'Circuit breaker status' },
    ],
  },
  {
    label: 'Compliance',
    icon: Shield,
    color: '#ef4444',
    items: [
      { href: '/compliance', label: 'KYC / AML', icon: UserCheck, desc: 'Identity &amp; verification' },
      { href: '/admin', label: 'Admin Hub', icon: Shield, desc: 'Platform management' },
      { href: '/admin/audit', label: 'Audit Trail', icon: Cpu, desc: 'Regulator log export' },
    ],
  },
];

// ─── Dropdown Component ──────────────────────────────────────────────────────
function NavDropdown({ group, isActive }: { group: typeof navGroups[0]; isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isGroupActive = group.items.some(item => pathname === item.href);
  const Icon = group.icon;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 12px', borderRadius: '10px', border: 'none',
          background: isGroupActive ? `${group.color}15` : 'transparent',
          cursor: 'pointer', transition: 'all 0.2s',
          outline: 'none',
        }}
      >
        <Icon
          size={15}
          color={isGroupActive ? group.color : 'rgba(255,255,255,0.4)'}
          style={{ transition: 'color 0.2s' }}
        />
        <span style={{
          fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em',
          color: isGroupActive ? '#fff' : 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase', transition: 'color 0.2s',
        }}>
          {group.label}
        </span>
        <ChevronDown
          size={12}
          color={isGroupActive ? group.color : 'rgba(255,255,255,0.25)'}
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
        {isGroupActive && (
          <motion.div layoutId="nav-indicator" style={{
            position: 'absolute', bottom: '0', left: '12px', right: '12px',
            height: '2px', background: group.color,
            borderRadius: '2px', boxShadow: `0 0 8px ${group.color}80`,
          }} />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            style={{
              position: 'absolute', top: 'calc(100% + 10px)', left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(9, 11, 24, 0.97)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '16px', padding: '8px',
              minWidth: '260px',
              boxShadow: `0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px ${group.color}15`,
              backdropFilter: 'blur(24px)',
              zIndex: 200,
            }}
          >
            {/* Accent bar */}
            <div style={{
              height: '2px', background: `linear-gradient(90deg, ${group.color}, transparent)`,
              borderRadius: '2px 2px 0 0', marginBottom: '8px',
            }} />

            {group.items.map((item, i) => {
              const ItemIcon = item.icon;
              const itemActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '10px',
                    background: itemActive ? `${group.color}15` : 'transparent',
                    border: `1px solid ${itemActive ? `${group.color}25` : 'transparent'}`,
                    textDecoration: 'none', transition: 'all 0.15s', marginBottom: '2px',
                  }}
                  onMouseEnter={e => {
                    if (!itemActive) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!itemActive) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '9px',
                    background: itemActive ? `${group.color}25` : 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'background 0.15s',
                  }}>
                    <ItemIcon size={16} color={itemActive ? group.color : 'rgba(255,255,255,0.4)'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '13px', fontWeight: '600', color: itemActive ? '#fff' : 'rgba(255,255,255,0.7)',
                      }}>
                        {item.label}
                      </span>
                      {item.chip && (
                        <span style={{
                          fontSize: '9px', padding: '2px 6px', borderRadius: '999px',
                          background: `${group.color}20`, color: group.color,
                          border: `1px solid ${group.color}40`,
                          fontWeight: '800', letterSpacing: '0.05em',
                        }}>
                          {item.chip}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}
                      dangerouslySetInnerHTML={{ __html: item.desc }} />
                  </div>
                  {itemActive && <ArrowRight size={13} color={group.color} />}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Navbar ─────────────────────────────────────────────────────────────
export default function Navbar() {
  const pathname = usePathname();
  const { connected, publicKey } = useWallet();
  const { isDemoMode, toggleDemoMode } = useRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!mounted) return null;

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: scrolled ? '8px 16px' : '12px 16px',
        transition: 'padding 0.4s ease',
      }}>
        <div style={{
          maxWidth: '1500px', margin: '0 auto', height: '60px',
          borderRadius: '16px', border: `1px solid ${scrolled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
          background: scrolled
            ? 'rgba(7, 8, 20, 0.85)'
            : 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(24px)',
          boxShadow: scrolled ? '0 16px 40px rgba(0,0,0,0.4), 0 0 1px rgba(16,185,129,0.1)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
          transition: 'all 0.4s ease',
        }}>

          {/* ─── Logo ─────────────────────────────────────────── */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
            }}>
              <Building2 size={18} color="#fff" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{ fontWeight: '900', fontSize: '16px', color: '#fff', letterSpacing: '-0.03em' }}>
                ASSET<span style={{ color: '#10b981' }}>VERSE</span>
              </span>
              <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: '600' }}>
                RWA Protocol
              </span>
            </div>
          </Link>

          {/* ─── Desktop Nav Groups ───────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} className="desktop-nav">
            {navGroups.map(group => (
              <NavDropdown
                key={group.label}
                group={group}
                isActive={group.items.some(i => pathname === i.href)}
              />
            ))}
          </div>

          {/* ─── Right Actions ────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {/* Network Status */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '999px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.15)',
            }} className="network-status">
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 6px #10b981',
                animation: 'pulse 2s infinite',
              }} />
              <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Devnet
              </span>
            </div>

            <PremiumWalletButton />

            {isDemoMode && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '4px 10px', borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
              }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demo Mode</span>
                <button 
                  onClick={toggleDemoMode}
                  style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}
                  title="Exit Demo Mode"
                >
                  <LogOut size={12} />
                </button>
              </div>
            )}

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="mobile-menu-btn"
              style={{
                padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', display: 'none',
              }}
            >
              <Menu size={20} />
            </button>
          </div>

        </div>
      </nav>

      {/* ─── Mobile Menu ─────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', top: 0, right: 0, bottom: 0,
                width: 'min(320px, 85vw)',
                background: 'rgba(8, 9, 22, 0.98)',
                borderLeft: '1px solid rgba(255,255,255,0.06)',
                overflow: 'auto',
                padding: '24px 20px',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={16} color="#fff" />
                  </div>
                  <span style={{ fontWeight: '900', fontSize: '16px', color: '#fff' }}>
                    ASSET<span style={{ color: '#10b981' }}>VERSE</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Groups */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {navGroups.map(group => {
                  const GroupIcon = group.icon;
                  const isOpen = openMobileGroup === group.label;
                  const isGroupActive = group.items.some(i => pathname === i.href);
                  return (
                    <div key={group.label}>
                      <button
                        onClick={() => setOpenMobileGroup(isOpen ? null : group.label)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 14px', borderRadius: '12px', border: 'none',
                          background: isGroupActive ? `${group.color}12` : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <GroupIcon size={18} color={isGroupActive ? group.color : 'rgba(255,255,255,0.4)'} />
                          <span style={{
                            fontSize: '13px', fontWeight: '700', textTransform: 'uppercase',
                            letterSpacing: '0.06em', color: isGroupActive ? '#fff' : 'rgba(255,255,255,0.55)',
                          }}>
                            {group.label}
                          </span>
                        </div>
                        <ChevronDown size={14} color="rgba(255,255,255,0.25)" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden', paddingLeft: '12px', marginTop: '2px' }}
                          >
                            {group.items.map(item => {
                              const ItemIcon = item.icon;
                              const itemActive = pathname === item.href;
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px 12px', borderRadius: '10px', textDecoration: 'none',
                                    background: itemActive ? `${group.color}15` : 'transparent',
                                    marginBottom: '2px', transition: 'background 0.15s',
                                  }}
                                >
                                  <ItemIcon size={16} color={itemActive ? group.color : 'rgba(255,255,255,0.3)'} />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '13px', fontWeight: '600', color: itemActive ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                                        {item.label}
                                      </span>
                                      {item.chip && (
                                        <span style={{
                                          fontSize: '9px', padding: '1px 5px', borderRadius: '999px',
                                          background: `${group.color}20`, color: group.color, fontWeight: '800',
                                        }}>
                                          {item.chip}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <PremiumWalletButton />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                  <span>v1.0.4</span>
                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Activity size={10} /> Nominal
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 960px) {
          .desktop-nav { display: none !important; }
          .network-status { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
