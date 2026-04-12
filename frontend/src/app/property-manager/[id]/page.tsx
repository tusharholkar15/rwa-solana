'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Wrench, Upload, DollarSign, Home, CheckCircle2, AlertTriangle,
  History, Calendar, FileText, Activity
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '@/lib/api';
import AuthGate from '@/components/shared/AuthGate';
import { useToast } from '@/components/shared/Toast';

export default function PropertyManagerPage() {
  const { id } = useParams();
  
  return (
    <AuthGate
      allowedRoles={['issuer', 'admin']}
      title="Property Manager Portal"
      description="Authorized property managers only. Log rent, maintenance, and occupancy data directly to the blockchain."
    >
      <ManagerContent assetId={id as string} />
    </AuthGate>
  );
}

function ManagerContent({ assetId }: { assetId: string }) {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Forms
  const [rentForm, setRentForm] = useState({ amount: '', period: '', proof: '' });
  const [maintForm, setMaintForm] = useState({ amount: '', category: 'Plumbing', desc: '' });
  const [occForm, setOccForm] = useState({ rate: 100, proof: '' });

  useEffect(() => {
    if (!assetId) return;
    api.getAsset(assetId).then(data => setAsset(data.asset)).catch(console.error).finally(() => setLoading(false));
  }, [assetId]);

  const handleRentSubmit = async () => {
    if (!publicKey) return;
    setSubmitLoading(true);
    try {
      await api.recordRent({
        assetId,
        amount: Number(rentForm.amount),
        period: rentForm.period,
        paymentProof: rentForm.proof,
        reportedBy: publicKey.toBase58()
      });
      toast('success', 'Rent Recorded', `Successfully logged $${rentForm.amount} USDC for ${rentForm.period}`);
      setRentForm({ amount: '', period: '', proof: '' });
    } catch (e: any) {
      toast('error', 'Submission Failed', e.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleMaintSubmit = async () => {
    if (!publicKey) return;
    setSubmitLoading(true);
    try {
      await api.recordMaintenance({
        assetId,
        amount: Number(maintForm.amount),
        category: maintForm.category,
        description: maintForm.desc,
        reportedBy: publicKey.toBase58()
      });
      toast('success', 'Maintenance Logged', `Recorded $${maintForm.amount} for ${maintForm.category}`);
      setMaintForm({ amount: '', category: 'Plumbing', desc: '' });
    } catch (e: any) {
      toast('error', 'Submission Failed', e.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#fff' }}>Loading property details...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px 100px' }}>
      
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ padding: '10px', background: 'rgba(99,102,241,0.1)', borderRadius: '12px' }}>
                <Home size={24} color="#818cf8" />
              </div>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', margin: 0 }}>
                  Property Management
                </h1>
                <p style={{ fontSize: '14px', color: '#818cf8', margin: 0, fontWeight: '600' }}>
                  {asset?.name || 'Asset Loading...'} ({asset?.symbol})
                </p>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '12px' }}>
              Submit signed telemetry directly to the Solana lifecycle datastore.
            </p>
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        
        {/* Render Rent Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '16px', padding: '24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <DollarSign size={20} color="#10b981" />
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>Log Rent Payment</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Collected Amount (USDC)</label>
              <input type="number" placeholder="4500" value={rentForm.amount} onChange={e => setRentForm({...rentForm, amount: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', marginTop: '6px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Period</label>
              <input type="month" value={rentForm.period} onChange={e => setRentForm({...rentForm, period: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', marginTop: '6px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Proof (Wire / TX Hash)</label>
              <input type="text" placeholder="Transaction Hash or IPFS URI" value={rentForm.proof} onChange={e => setRentForm({...rentForm, proof: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', marginTop: '6px' }} />
            </div>
            <button
              onClick={handleRentSubmit}
              disabled={submitLoading || !rentForm.amount || !rentForm.period}
              style={{ width: '100%', padding: '14px', borderRadius: '8px', background: '#10b981', border: 'none', color: '#fff', fontWeight: '600', cursor: 'pointer', opacity: (submitLoading || !rentForm.amount) ? 0.5 : 1 }}
            >
              Deposit & Log Rent
            </button>
          </div>
        </motion.div>

        {/* Render Maintenance Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: 'rgba(245,158,11,0.03)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '16px', padding: '24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Wrench size={20} color="#f59e0b" />
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>Report Maintenance</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Category</label>
              <select value={maintForm.category} onChange={e => setMaintForm({...maintForm, category: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', marginTop: '6px' }}>
                <option value="Plumbing" style={{ background: '#0d1117' }}>Plumbing</option>
                <option value="Electrical" style={{ background: '#0d1117' }}>Electrical</option>
                <option value="HVAC" style={{ background: '#0d1117' }}>HVAC / Heating</option>
                <option value="Structural" style={{ background: '#0d1117' }}>Structural / Roof</option>
                <option value="Cosmetic" style={{ background: '#0d1117' }}>Cosmetic / Paint</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Cost (USDC Deduction)</label>
              <input type="number" placeholder="500" value={maintForm.amount} onChange={e => setMaintForm({...maintForm, amount: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', marginTop: '6px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Description / Invoice URI</label>
              <input type="text" placeholder="Replaced water heater unit..." value={maintForm.desc} onChange={e => setMaintForm({...maintForm, desc: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', marginTop: '6px' }} />
            </div>
            <button
              onClick={handleMaintSubmit}
              disabled={submitLoading || !maintForm.amount}
              style={{ width: '100%', padding: '14px', borderRadius: '8px', background: '#f59e0b', border: 'none', color: '#fff', fontWeight: '600', cursor: 'pointer', opacity: (submitLoading || !maintForm.amount) ? 0.5 : 1 }}
            >
              Log Maintenance
            </button>
          </div>
        </motion.div>
        
        {/* Render Occupancy Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '16px', padding: '24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Activity size={20} color="#818cf8" />
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>Update Occupancy</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Occupancy Rate (%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px' }}>
                <input type="range" min="0" max="100" value={occForm.rate} onChange={e => setOccForm({...occForm, rate: Number(e.target.value)})}
                  style={{ flex: 1, accentColor: '#818cf8' }} />
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', minWidth: '50px', textAlign: 'right' }}>{occForm.rate}%</span>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Inspection Report / Lease Update (IPFS URI)</label>
              <input type="text" placeholder="ipfs://..." value={occForm.proof} onChange={e => setOccForm({...occForm, proof: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', marginTop: '6px' }} />
            </div>
            <button
              disabled={submitLoading}
              style={{ width: '100%', padding: '14px', borderRadius: '8px', background: '#6366f1', border: 'none', color: '#fff', fontWeight: '600', cursor: 'pointer', marginTop: 'auto' }}
            >
              Update Occupancy
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
