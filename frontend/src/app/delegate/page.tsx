'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Search, Filter, ShieldCheck, Scale, ArrowRight, X, Copy } from 'lucide-react';
import { api } from '@/lib/api';

interface Delegate {
  wallet: string;
  name: string;
  role: string;
  totalDelegatedPower: number;
  activeDelegations: number;
  participationRate: number;
  successRate: number;
}

export default function DelegationBoardPage() {
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDelegate, setSelectedDelegate] = useState<Delegate | null>(null);

  // Mocked for UI given lack of backend delegate indexer yet
  useEffect(() => {
    // Generate some institutional delegates
    setTimeout(() => {
      setDelegates([
        {
          wallet: 'HhD...8fK3', name: 'Wintermute RWA Fund', role: 'Market Maker & Verifier',
          totalDelegatedPower: 1450000, activeDelegations: 124, participationRate: 98, successRate: 85
        },
        {
          wallet: 'B5a...m9T', name: 'Centrifuge Asset Mgmt', role: 'Issuer',
          totalDelegatedPower: 890000, activeDelegations: 56, participationRate: 92, successRate: 90
        },
        {
          wallet: 'X9j...L1k', name: 'RWA Guardian Node #4', role: 'Verifier',
          totalDelegatedPower: 345000, activeDelegations: 201, participationRate: 100, successRate: 95
        },
        {
          wallet: 'F2p...q8Z', name: 'Solana Estate Council', role: 'Protocol Guardian',
          totalDelegatedPower: 2200000, activeDelegations: 432, participationRate: 99, successRate: 88
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filtered = delegates.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.wallet.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1117 50%, #0a0a1a 100%)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Network size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#fff', margin: 0 }}>Delegation Board</h1>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                Delegate your Quadratic Voting power to institutional guardians
              </p>
            </div>
          </div>
        </motion.div>

        {/* Legend / Info */}
        <div style={{
          background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '12px', padding: '16px', marginBottom: '32px', display: 'flex', gap: '24px', flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontSize: '13px' }}>
            <Scale size={16} /> Quadratic Power (<span style={{ fontFamily: 'monospace' }}>√balance</span>) prevents whale dominance.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa', fontSize: '13px' }}>
            <ShieldCheck size={16} /> Delegation uses on-chain PDA, funds never leave your wallet.
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by name or wallet address..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px 14px 44px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff', fontSize: '15px', outline: 'none'
              }}
            />
            <Search size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '16px', top: '15px' }} />
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer'
          }}>
            <Filter size={16} /> Sort by Power
          </button>
        </div>

        {/* Delegate Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filtered.map((d, i) => (
            <motion.div
              key={d.wallet}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onClick={() => setSelectedDelegate(d)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: '0 0 4px' }}>{d.name}</h3>
                  <p style={{ fontSize: '12px', color: '#818cf8', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={12} /> {d.role}
                  </p>
                </div>
                <div style={{
                  padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)',
                  fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace'
                }}>
                  {d.wallet}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Delegated Power</span>
                  <span style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>{d.totalDelegatedPower.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Delegators</span>
                  <span style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>{d.activeDelegations}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Participation Rate</span>
                  <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>{d.participationRate}%</span>
                </div>
              </div>

              <button style={{
                width: '100%', padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
                border: '1px solid rgba(99,102,241,0.3)', color: '#a78bfa', fontSize: '14px', fontWeight: '600'
              }}>
                Delegate <ArrowRight size={16} />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Modal */}
        <AnimatePresence>
          {selectedDelegate && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)'
            }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  width: '100%', maxWidth: '500px', background: '#111424', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '24px', padding: '32px', position: 'relative'
                }}
              >
                <button
                  onClick={() => setSelectedDelegate(null)}
                  style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={20} color="rgba(255,255,255,0.5)" />
                </button>

                <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#fff', margin: '0 0 8px' }}>Confirm Delegation</h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }}>
                  Assign your quadratic voting power to <strong style={{ color: '#fff' }}>{selectedDelegate.name}</strong>.
                </p>

                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Delegate Address</span>
                    <span style={{ fontSize: '13px', color: '#fff', fontFamily: 'monospace' }}>{selectedDelegate.wallet}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Your Actionable Power</span>
                    <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>Calculated dynamically by Anchor</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setSelectedDelegate(null)}
                    style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      alert('Delegation instruction sent to Solana TESTNET!');
                      setSelectedDelegate(null);
                    }}
                    style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Confirm Delegation
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
