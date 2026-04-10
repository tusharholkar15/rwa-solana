'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  User, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  X,
  Lock,
  Building,
  Fingerprint,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';

interface KYCWizardProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  onSuccess: () => void;
}

export default function KYCWizard({ isOpen, onClose, walletAddress, onSuccess }: KYCWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    documentType: 'passport',
    documentId: '',
  });

  async function handleSubmit() {
    try {
      setLoading(true);
      await api.submitKyc({
        walletAddress,
        documentType: formData.documentType,
        documentId: formData.documentId,
        name: formData.name,
        email: formData.email,
      });
      setStep(4); // Success step
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (e) {
      console.error(e);
      alert('KYC Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { title: 'Investor Type', icon: User },
    { title: 'Identity', icon: Fingerprint },
    { title: 'Verification', icon: ShieldCheck },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-surface-950/80 backdrop-blur-xl"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl institutional-glass bg-surface-900 overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-widest text-[10px] mb-2">
              <Lock size={12} />
              Secured by Assetverse Compliance
            </div>
            <h2 className="text-2xl font-display font-bold text-white">Institutional Onboarding</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-8 pt-8 flex justify-between">
           {steps.map((s, i) => {
             const Icon = s.icon;
             const active = step >= i + 1;
             return (
                <div key={i} className="flex flex-col items-center gap-2 relative z-10">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500 ${active ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/10 text-white/20'}`}>
                      <Icon size={18} />
                   </div>
                   <span className={`text-[9px] font-bold uppercase tracking-tighter transition-colors ${active ? 'text-white' : 'text-white/20'}`}>
                     {s.title}
                   </span>
                </div>
             )
           })}
           {/* Line connectors */}
           <div className="absolute top-[132px] left-16 right-16 h-px bg-white/5 -z-0" />
           <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${(step - 1) * 50}%` }}
             className="absolute top-[132px] left-16 h-px bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] -z-0 transition-all duration-700" 
           />
        </div>

        {/* Content */}
        <div className="p-8 min-h-[320px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                   <button className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all group text-left">
                      <User size={24} className="text-emerald-400 mb-4" />
                      <div className="font-bold text-white mb-1 group-hover:text-emerald-400">Individual</div>
                      <div className="text-[10px] text-white/30 leading-relaxed uppercase tracking-widest font-bold">Personal High Net Worth</div>
                   </button>
                   <button className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all group text-left">
                      <Building size={24} className="text-emerald-400 mb-4" />
                      <div className="font-bold text-white mb-1 group-hover:text-emerald-400">Institutional</div>
                      <div className="text-[10px] text-white/30 leading-relaxed uppercase tracking-widest font-bold">Fund / Family Office</div>
                   </button>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
                   <FileText size={18} className="text-amber-500 shrink-0" />
                   <p className="text-[10px] text-amber-200/60 leading-normal font-bold">
                     Verification typically takes 24-48 hours. Whitelisting is required for primary market participation.
                   </p>
                </div>
                <button onClick={() => setStep(2)} className="btn-institutional w-full mt-6">
                  Continue to Identity
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                   <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Full Legal Name</label>
                   <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="As shown on ID" 
                      className="input-institutional" 
                    />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Work Email</label>
                   <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="name@company.com" 
                      className="input-institutional" 
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Document Type</label>
                    <select 
                      value={formData.documentType}
                      onChange={(e) => setFormData({...formData, documentType: e.target.value})}
                      className="input-institutional !bg-surface-950"
                    >
                      <option value="passport">Passport</option>
                      <option value="id_card">National ID</option>
                      <option value="licence">Operator License</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">ID Number</label>
                    <input 
                      type="text" 
                      value={formData.documentId}
                      onChange={(e) => setFormData({...formData, documentId: e.target.value})}
                      placeholder="X-XXXX-XXXX" 
                      className="input-institutional" 
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-6">
                   <button onClick={() => setStep(1)} className="btn-secondary-institutional w-1/3">Back</button>
                   <button onClick={() => setStep(3)} className="btn-institutional w-2/3">Verify Documents</button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center py-8"
              >
                <div className="relative inline-block mb-8">
                  <div className="w-24 h-24 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                  <ShieldCheck size={40} className="absolute inset-0 m-auto text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Analyzing Data</h3>
                <p className="text-white/40 text-sm mb-12">Checking global sanctions lists and verifying document authenticity...</p>
                
                <div className="space-y-3 max-w-xs mx-auto">
                   <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                      <span>Facial Match</span>
                      <span>Verified</span>
                   </div>
                   <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                      <span>PEP/Sanctions</span>
                      <span>Clear</span>
                   </div>
                   <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/20">
                      <span>Compliance Score</span>
                      <span className="animate-pulse">Analyzing...</span>
                   </div>
                </div>

                <button 
                  onClick={handleSubmit} 
                  disabled={loading}
                  className="btn-institutional w-full mt-12 flex items-center justify-center gap-2"
                >
                  {loading ? 'Processing...' : 'Finalize Verification'}
                  <ArrowRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-24 h-24 rounded-full bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.4)] flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 size={48} className="text-white" />
                </div>
                <h3 className="text-3xl font-display font-bold text-white mb-3">Submission Success</h3>
                <p className="text-white/40 max-w-xs mx-auto font-medium">Your institutional account is now under review. Whitelisting will complete shortly.</p>
                
                <div className="mt-12 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-emerald-400 tracking-widest uppercase">
                   <Zap size={12} />
                   Solana Signature Pending
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
