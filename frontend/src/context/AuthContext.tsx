'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '@/lib/api';
import bs58 from 'bs58';

interface AuthContextType {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  login: () => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey: realPublicKey, signMessage, connected, disconnect } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed public key
  const publicKey = realPublicKey?.toBase58();

  const logout = useCallback(() => {
    api.clearSession();
    setIsAuthenticated(false);
    localStorage.removeItem('rwa_auth_session');
    localStorage.removeItem('rwa_sandbox_active'); // Cleanup legacy sandbox states if they exist
  }, []);


  const login = useCallback(async () => {
    if (!realPublicKey || !signMessage) return;

    setIsAuthenticating(true);
    setError(null);

    try {
      const timestamp = Date.now();
      const message = `Sign in to RWA Tokenization Platform | Protocol: Institutional v3 | Authorized Wallet: ${realPublicKey.toBase58()} | Timestamp: ${timestamp}`;
      
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      const signatureBase58 = bs58.encode(signature);

      api.setSession(realPublicKey.toBase58(), signatureBase58, message);
      
      // Persist session for this tab/session
      const session = {
        address: realPublicKey.toBase58(),
        signature: signatureBase58,
        message,
        expiresAt: timestamp + 5 * 60 * 1000 // 5 min window
      };
      
      localStorage.setItem('rwa_auth_session', JSON.stringify(session));
      localStorage.removeItem('rwa_sandbox_active');
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('SIWS Error:', err);
      setError(err.message || 'Signature rejected');
      setIsAuthenticated(false);
    } finally {
      setIsAuthenticating(false);
    }
  }, [realPublicKey, signMessage]);

  // Handle wallet disconnect
  useEffect(() => {
    if (!connected) {
      logout();
    }
  }, [connected, logout]);

  // Restore session from localStorage if valid
  useEffect(() => {
    const stored = localStorage.getItem('rwa_auth_session');
    // Ensure any leftover sandbox state gets cleared
    if (localStorage.getItem('rwa_sandbox_active') === 'true') {
       logout();
       return;
    }
    
    if (stored) {
      try {
        const session = JSON.parse(stored);
        
        if (Date.now() < session.expiresAt) {
          if (realPublicKey && session.address === realPublicKey.toBase58()) {
            api.setSession(session.address, session.signature, session.message);
            setIsAuthenticated(true);
          }
        } else {
          logout();
        }
      } catch (e) {
        logout();
      }
    }
  }, [realPublicKey, logout]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAuthenticating, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
