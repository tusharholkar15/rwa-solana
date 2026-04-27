'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  ChevronDown, 
  LogOut, 
  Copy, 
  ExternalLink, 
  Activity,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { shortenAddress } from '@/lib/constants';
import { useAuth } from '@/context/AuthContext';

interface PremiumWalletButtonProps {
  className?: string;
}

export default function PremiumWalletButton({ className = '' }: PremiumWalletButtonProps) {
  const { connection } = useConnection();
  const { publicKey, wallet, disconnect, connected, connecting } = useWallet();
  const { isAuthenticated, isAuthenticating, login, error: authError } = useAuth();
  const { setVisible } = useWalletModal();
  const [balance, setBalance] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch balance when connected
  useEffect(() => {
    if (!connection || !publicKey) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / LAMPORTS_PER_SOL);
      } catch (e) {
        console.error('Failed to fetch balance:', e);
      }
    };

    fetchBalance();
    const id = connection.onAccountChange(publicKey, (info) => {
      setBalance(info.lamports / LAMPORTS_PER_SOL);
    });

    return () => {
      connection.removeAccountChangeListener(id);
    };
  }, [connection, publicKey]);

  const handleCopy = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const baseButtonStyles = "relative h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 overflow-hidden";

  if (!connected) {

    return (
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setVisible(true)}
          className={`${baseButtonStyles} bg-surface-900 border border-white/10 text-white/70 hover:text-white sweep-effect ${className}`}
        >
          <Wallet size={14} className={connecting ? 'animate-pulse' : ''} />
          <span>{connecting ? 'Authorizing...' : 'Connect'}</span>
        </motion.button>
      </div>
    );
  }

  // Handle Connected but not Authenticated (SIWS)
  if (!isAuthenticated) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={login}
        disabled={isAuthenticating}
        className={`${baseButtonStyles} bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 ${className}`}
      >
        <ShieldCheck size={14} className={isAuthenticating ? 'animate-spin' : ''} />
        <span>{isAuthenticating ? 'Verifying...' : 'Sign Authorization'}</span>
        {!isAuthenticating && <ArrowRight size={14} className="opacity-40" />}
      </motion.button>
    );
  }

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-0.5 p-0.5 rounded-xl bg-white/5 border border-white/10 ${className}`}
      >
        {/* Balance Display */}
        <div className="px-3 py-1.5 hidden sm:flex flex-col items-start leading-none border-r border-white/5">
          <span className="text-[7px] text-white/30 uppercase font-bold tracking-widest mb-1">Portfolio</span>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">
            {balance !== null ? `${balance.toFixed(4)} SOL` : '---'}
          </span>
        </div>

        {/* Address & Toggle */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
        >
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center">
            <Activity size={12} className="text-white" />
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-[10px] text-white font-bold">{shortenAddress(publicKey?.toBase58() || '', 4)}</span>
            <span className="text-[7px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck size={8} /> Active Session
            </span>
          </div>
          <ChevronDown 
            size={14} 
            className={`text-white/20 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} 
          />
        </button>
      </motion.div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowDropdown(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-2 w-64 institutional-glass bg-surface-950 z-50 p-2 shadow-2xl"
            >
              <div className="p-4 border-b border-white/5 mb-2">
                <div className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2">Authenticated Account</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white/80">{shortenAddress(publicKey?.toBase58() || '', 12)}</span>
                  <button 
                    onClick={handleCopy}
                    className="p-1.5 rounded-md bg-white/5 text-white/40 hover:text-white transition-colors"
                  >
                    {copied ? <ShieldCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <button 
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all group"
                  onClick={() => {
                    const url = `https://solscan.io/account/${publicKey?.toBase58()}`;
                    window.open(url, '_blank');
                    setShowDropdown(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink size={14} className="text-white/40 group-hover:text-emerald-400" />
                    <span className="text-[11px] font-bold text-white/60 group-hover:text-white uppercase tracking-widest">View on Solscan</span>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    disconnect();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-rose-500/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <LogOut size={14} className="text-white/40 group-hover:text-rose-400" />
                    <span className="text-[11px] font-bold text-white/60 group-hover:text-rose-400 uppercase tracking-widest">Terminate Session</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
