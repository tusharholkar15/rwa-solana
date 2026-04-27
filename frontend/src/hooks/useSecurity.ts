import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState, useEffect } from 'react';
import bs58 from 'bs58';
import { api } from '@/lib/api';

export const useSecurity = () => {
  const { publicKey, signMessage, connected } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  /**
   * Challenge the user to sign a SIWS message
   */
  const challenge = useCallback(async () => {
    if (!publicKey || !signMessage) {
       console.error('[Security] Wallet not ready for challenge');
       return false;
    }

    setIsAuthenticating(true);
    try {
      const timestamp = Date.now();
      const messageText = `Login-${timestamp}`;
      const encodedMessage = new TextEncoder().encode(messageText);
      
      const signature = await signMessage(encodedMessage);
      const signatureBase58 = bs58.encode(signature);
      const addressBase58 = publicKey.toBase58();

      // Update the global API client
      api.setSession(addressBase58, signatureBase58, messageText);
      
      // Store in session storage for persistence during page refreshes (with timestamp)
      sessionStorage.setItem('siws_token', JSON.stringify({
        address: addressBase58,
        signature: signatureBase58,
        message: messageText,
        timestamp
      }));

      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('[Security] Challenge failed:', error);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [publicKey, signMessage]);

  /**
   * Restore session from storage on mount or wallet change
   */
  useEffect(() => {
    // Ensure legacy sandbox tokens don't revive the session
    if (localStorage.getItem('rwa_sandbox_active') === 'true') {
      localStorage.removeItem('rwa_sandbox_active');
      localStorage.removeItem('rwa_auth_session');
    }

    if (!connected || !publicKey) {
      setIsAuthenticated(false);
      api.clearSession();
      return;
    }

    const stored = sessionStorage.getItem('siws_token');
    if (stored) {
      try {
        const { address, signature, message, timestamp } = JSON.parse(stored);
        
        // Ensure the stored address matches current wallet
        if (address === publicKey.toBase58()) {
          // Check if expired (5 minute TTL matching backend)
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            api.setSession(address, signature, message);
            setIsAuthenticated(true);
          } else {
             sessionStorage.removeItem('siws_token');
          }
        }
      } catch (err) {
        sessionStorage.removeItem('siws_token');
      }
    }
  }, [connected, publicKey]);

  return {
    isAuthenticated,
    isAuthenticating,
    challenge,
    logout: () => {
        api.clearSession();
        sessionStorage.removeItem('siws_token');
        localStorage.removeItem('rwa_sandbox_active');
        localStorage.removeItem('rwa_auth_session');
        setIsAuthenticated(false);
    }
  };
};
