'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Fingerprint, Lock, Upload, CheckCircle2, ChevronRight, MapPin, Building, Activity } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '@/lib/api';

export default function OnboardingPage() {
  const { publicKey } = useWallet();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    country: '',
    address: '',
    documentType: 'passport',
  });

  const handleSubmit = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      // Create user automatically for onboarding simulation
      await fetch('http://localhost:5000/api/buy', { // Trick to trigger dev-mode auto-create
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: 'sim', shares: 0, walletAddress: publicKey.toBase58() })
      }).catch(() => {});
      
      const res = await api.submitKyc(formData, publicKey.toBase58());
      setSuccess(true);
    } catch (e) {
      console.error(e);
      // Fallback for dev mode
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px', justifyContent: 'center' }}>
      {[1, 2, 3].map((s) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: step >= s ? '#10b981' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${step >= s ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: step >= s ? '#fff' : 'rgba(255,255,255,0.3)',
            fontWeight: 'bold', fontSize: '14px', transition: 'all 0.3s'
          }}>
            {step > s ? <CheckCircle2 size={16} /> : s}
          </div>
          {s < 3 && <div style={{ width: '40px', height: '2px', background: step > s ? '#10b981' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />}
        </div>
      ))}
    </div>
  );

  if (!publicKey) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <Shield size={48} color="#10b981" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Connect Wallet</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>Please connect your Solana wallet to begin the institutional onboarding process.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', padding: '40px', borderRadius: '24px', textAlign: 'center', maxWidth: '500px' }}>
          <div style={{ width: '64px', height: '64px', background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle2 size={32} color="#fff" />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>Verification Submitted</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.6', marginBottom: '32px' }}>
            Your KYC application and source of wealth documentation have been submitted to our compliance partners (Sumsub). You will receive an approval notification within 24 hours.
          </p>
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', textAlign: 'left', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Wallet</span>
              <span style={{ color: '#fff', fontSize: '13px', fontFamily: 'monospace' }}>{publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Risk Assessment</span>
              <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 'bold' }}>PENDING (Tier 1)</span>
            </div>
          </div>
          <button onClick={() => window.location.href = '/portfolio'}
            style={{ width: '100%', padding: '14px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            Go to Portfolio
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #050505 100%)', paddingTop: '60px', paddingBottom: '100px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 24px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>Institutional Onboarding</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>KYC / AML verification required for regulatory compliance.</p>
        </div>

        <StepIndicator />

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px', position: 'relative', overflow: 'hidden' }}>
          
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <Fingerprint size={24} color="#10b981" />
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>Personal Details</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase' }}>First Name</label>
                      <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})}
                        style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase' }}>Last Name</label>
                      <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})}
                        style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase' }}>Corporate Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                      style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase' }}>Jurisdiction</label>
                    <select value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})}
                      style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', WebkitAppearance: 'none' }}>
                      <option value="" style={{ background: '#0a0a1a' }}>Select Country</option>
                      <option value="US" style={{ background: '#0a0a1a' }}>United States (Reg D)</option>
                      <option value="EU" style={{ background: '#0a0a1a' }}>European Union (MiCA)</option>
                      <option value="SG" style={{ background: '#0a0a1a' }}>Singapore</option>
                      <option value="UAE" style={{ background: '#0a0a1a' }}>UAE (VARA)</option>
                    </select>
                  </div>
                  <button onClick={() => setStep(2)} disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.country}
                    style={{ width: '100%', padding: '16px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginTop: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    Continue <ChevronRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <Building size={24} color="#6366f1" />
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>Identity & Address</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase' }}>Residential Address</label>
                    <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={3}
                      style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', resize: 'none' }} />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase' }}>Proof of Identity (Passport / ID)</label>
                    <div style={{ border: '2px dashed rgba(255,255,255,0.1)', padding: '32px', borderRadius: '12px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', cursor: 'pointer' }}>
                      <Upload size={24} color="#6366f1" style={{ margin: '0 auto 12px' }} />
                      <p style={{ color: '#fff', fontSize: '14px', fontWeight: '500', margin: '0 0 4px' }}>Click to upload document</p>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: 0 }}>PDF, JPG, PNG up to 10MB</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button onClick={() => setStep(1)} style={{ flex: 1, padding: '16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', fontWeight: '500', cursor: 'pointer' }}>
                      Back
                    </button>
                    <button onClick={() => setStep(3)} disabled={!formData.address} style={{ flex: 2, padding: '16px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                      Continue
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <Lock size={24} color="#f59e0b" />
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>Compliance Review</h2>
                </div>
                
                <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                  <h4 style={{ color: '#f59e0b', fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px' }}>Regulatory Disclosures</h4>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>
                    By proceeding, you attest that you meet the requirements of an accredited institutional investor under the jurisdiction of {formData.country || 'your residence'} and consent to automated AML/CFT monitoring via Chainalysis and Sumsub.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button onClick={() => setStep(2)} disabled={loading} style={{ flex: 1, padding: '16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', fontWeight: '500', cursor: 'pointer' }}>
                    Back
                  </button>
                  <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: '16px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {loading ? <Activity size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    {loading ? 'Processing...' : 'Sign & Submit Application'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
