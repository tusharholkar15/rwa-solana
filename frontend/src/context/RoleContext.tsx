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
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { publicKey } = useWallet();
  const [role, setRole] = useState<UserRole>('none');
  const [loading, setLoading] = useState(true);

  const refreshRole = useCallback(async () => {

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
  }, [publicKey]);

  useEffect(() => {
    refreshRole();
  }, [refreshRole]);

  const hasRole = (allowedRoles: UserRole[]) => {
    if (allowedRoles.includes('none')) return true;
    return allowedRoles.includes(role);
  };

  return (
    <RoleContext.Provider value={{ role, loading, refreshRole, hasRole }}>
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
