'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface RealtimeContextType {
  socket: Socket | null;
  isConnected: boolean;
  marketEvents: any[];
}

const RealtimeContext = createContext<RealtimeContextType>({
  socket: null,
  isConnected: false,
  marketEvents: [],
});

export const useRealtime = () => useContext(RealtimeContext);

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [marketEvents, setMarketEvents] = useState<any[]>([]);

  useEffect(() => {
    const s = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 5000,
    });

    s.on('connect', () => {
      console.log('[Realtime] Connected to institutional node');
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      console.warn('[Realtime] Disconnected from institutional node');
      setIsConnected(false);
    });

    s.on('asset_event', (payload: any) => {
      // General asset events (price updates, etc) can be handled by individual components
      // or we can push to a global event log
    });

    s.on('trade_event', (payload: any) => {
      const newEvent = {
        id: Date.now(),
        type: payload.type === 'ORDER_FILLED' ? 'TRADE' : 'MINT',
        msg: `${payload.type === 'ORDER_FILLED' ? 'Trade' : 'Mint'} Executed: ${payload.assetId.substring(0, 8)}... [${payload.data.shares} Shares]`,
        time: 'Just now',
      };
      setMarketEvents(prev => [newEvent, ...prev].slice(0, 10));
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ socket, isConnected, marketEvents }}>
      {children}
    </RealtimeContext.Provider>
  );
};
