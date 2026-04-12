'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, ShieldAlert, Lock, Loader2 } from 'lucide-react';
import PremiumWalletButton from '@/components/wallet/PremiumWalletButton';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRole, UserRole } from '@/context/RoleContext';

interface AuthGateProps {
  children?: React.ReactNode;
  allowedRoles?: UserRole[];
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function AuthGate({ 
  children, 
  allowedRoles = ['admin', 'issuer', 'compliance_officer', 'auditor'],
  title = "Restricted Access",
  description = "This section is reserved for verified institutional personnel. Please connect an authorized wallet to proceed.",
  icon 
}: AuthGateProps) {
  const [mounted, setMounted] = useState(false);
  const { publicKey } = useWallet();
  const { role, loading, hasRole, isDemoMode, toggleDemoMode } = useRole();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Handle Loading
  if (loading && publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
         <Loader2 size={48} className="text-indigo-500 animate-spin" />
         <p className="mt-4 text-white/40 font-bold uppercase tracking-widest text-[10px]">Verifying Credentials...</p>
      </div>
    );
  }

  // Handle Allowed
  if ((publicKey || isDemoMode) && hasRole(allowedRoles)) {
    return <>{children}</>;
  }

  // Handle Denied / Not Connected
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full institutional-glass p-12 bg-surface-900/50 border-white/10 shadow-2xl relative overflow-hidden"
      >
        {/* Decorative Background Elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl opacity-50" />

        <div className="relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 group transition-all hover:border-indigo-500/30">
            {icon || <Lock size={48} className="text-white/20 group-hover:text-indigo-400 transition-colors" />}
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-4">
             <ShieldAlert size={14} className="text-amber-500" />
             <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Institutional Personnel Only</span>
          </div>

          <h2 className="text-3xl font-display font-black text-white mb-4 tracking-tight">
            {!publicKey ? "Unauthenticated" : "Access Denied"}
          </h2>
          
          <p className="text-white/40 mb-12 font-medium leading-relaxed">
            {!publicKey ? description : `Your connected wallet does not have the required institutional clearance. Required: ${allowedRoles.join(', ')}.`}
          </p>

          <div className="space-y-4">
            <div className="flex justify-center transform hover:scale-105 transition-transform duration-300">
               <PremiumWalletButton className="!h-14 !px-10 !text-sm" />
            </div>
            
            {!publicKey && !isDemoMode && (
              <button 
                onClick={toggleDemoMode}
                className="mt-4 px-6 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest hover:bg-indigo-500/20 transition-all"
              >
                Access Demo Mode
              </button>
            )}

            <p className="text-[10px] font-bold text-white/10 uppercase tracking-widest pt-4">
               Audit ID: SEC-RWA-2026-X
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
