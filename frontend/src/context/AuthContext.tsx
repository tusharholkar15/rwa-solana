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
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    api.clearSession();
    setIsAuthenticated(false);
    localStorage.removeItem('rwa_auth_session');
  }, []);

  const login = useCallback(async () => {
    if (!publicKey || !signMessage) return;

    setIsAuthenticating(true);
    setError(null);

    try {
      const timestamp = Date.now();
      const message = `Sign in to RWA Tokenization Platform\nProtocol: Institutional v3\nAuthorized Wallet: ${publicKey.toBase58()}\nTimestamp: ${timestamp}`;
      
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      const signatureBase58 = bs58.encode(signature);

      api.setSession(publicKey.toBase58(), signatureBase58, message);
      
      // Persist session for this tab/session (Optional: Use sessionStorage)
      const session = {
        address: publicKey.toBase58(),
        signature: signatureBase58,
        message,
        expiresAt: timestamp + 5 * 60 * 1000 // 5 min window
      };
      
      localStorage.setItem('rwa_auth_session', JSON.stringify(session));
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('SIWS Error:', err);
      setError(err.message || 'Signature rejected');
      setIsAuthenticated(false);
    } finally {
      setIsAuthenticating(false);
    }
  }, [publicKey, signMessage]);

  // Handle wallet disconnect
  useEffect(() => {
    if (!connected) {
      logout();
    }
  }, [connected, logout]);

  // Restore session from localStorage if valid
  useEffect(() => {
    const stored = localStorage.getItem('rwa_auth_session');
    if (stored && publicKey) {
      try {
        const session = JSON.parse(stored);
        if (session.address === publicKey.toBase58() && Date.now() < session.expiresAt) {
          api.setSession(session.address, session.signature, session.message);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('rwa_auth_session');
        }
      } catch (e) {
        localStorage.removeItem('rwa_auth_session');
      }
    }
  }, [publicKey]);

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
