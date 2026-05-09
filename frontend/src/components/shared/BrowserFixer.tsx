'use client';

import { useEffect } from 'react';

/**
 * BrowserFixer: A client-only component to handle global browser-level 
 * suppresses and patches (e.g. MetaMask extension error suppression).
 */
export default function BrowserFixer() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Suppress MetaMask extension errors that trigger unhandled runtime overlays
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const msg = args[0]?.toString() || '';
      if (msg.includes('Failed to connect to MetaMask') || msg.includes('nkbihfbeogaeaoehlefnkodbefgpgknn')) {
        return;
      }
      originalError.apply(console, args);
    };

    // 2. Handle unhandled rejections from extensions
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes?.('MetaMask')) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      console.error = originalError;
    };
  }, []);

  return null;
}
