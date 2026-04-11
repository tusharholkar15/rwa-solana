'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP' | 'JPY' | 'SGD' | 'AED' | 'SOL';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatPrice: (usdAmount: number) => string;
  exchangeRate: number;
  symbol: string;
}

const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  INR: 83.45,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 154.80,
  SGD: 1.34,
  AED: 3.67,
  SOL: 0.0068,
};

const SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  SGD: 'S$',
  AED: 'د.إ',
  SOL: '◎',
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const formatPrice = useCallback((usdAmount: number): string => {
    const rate = EXCHANGE_RATES[currency];
    const amount = usdAmount * rate;

    if (currency === 'SOL') {
      return `◎${amount.toFixed(4)}`;
    }

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: currency === 'JPY' ? 0 : 2,
        maximumFractionDigits: currency === 'JPY' ? 0 : 2,
      }).format(amount);
    } catch {
      return `${SYMBOLS[currency]}${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      formatPrice,
      exchangeRate: EXCHANGE_RATES[currency],
      symbol: SYMBOLS[currency],
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
