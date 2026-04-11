'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '@/lib/api';

export type UserRole = 'investor' | 'issuer' | 'admin' | 'auditor' | 'compliance_officer' | 'none';

interface RoleContextType {
  role: UserRole;
  loading: boolean;
  refreshRole: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  demoWalletAddress: string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { publicKey } = useWallet();
  const [role, setRole] = useState<UserRole>('none');
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const demoWalletAddress = "DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

  useEffect(() => {
    const stored = localStorage.getItem('assetverse_demo_mode');
    if (stored === 'true') {
      setIsDemoMode(true);
    } else if (stored === 'false') {
      setIsDemoMode(false);
    }
  }, []);

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode(prev => {
      const next = !prev;
      localStorage.setItem('assetverse_demo_mode', String(next));
      return next;
    });
  }, []);

  const refreshRole = useCallback(async () => {
    if (isDemoMode) {
      setRole('admin');
      setLoading(false);
      return;
    }

    if (!publicKey) {
      setRole('none');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const identity = await api.getComplianceIdentity(publicKey.toBase58());
      setRole((identity?.role as UserRole) || 'investor');
    } catch (err) {
      console.warn('Role fetch failed, defaulting to investor:', err);
      // In development fallback to investor if connection fails
      setRole('investor');
    } finally {
      setLoading(false);
    }
  }, [publicKey, isDemoMode]);

  useEffect(() => {
    refreshRole();
  }, [refreshRole]);

  const hasRole = (allowedRoles: UserRole[]) => {
    if (isDemoMode) return true; // Demo mode overrides all roles
    if (allowedRoles.includes('none')) return true;
    return allowedRoles.includes(role);
  };

  return (
    <RoleContext.Provider value={{ role, loading, refreshRole, hasRole, isDemoMode, toggleDemoMode, demoWalletAddress }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
