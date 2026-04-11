import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export interface AssetStreamData {
  prices: { navPrice: number; provider: string; confidenceInterval: number; sourceTags: string[] } | null;
  rent: { amount: number; period: string; timestamp: Date } | null;
  trades: { eventType: string; signature: string; timestamp: Date }[];
  governance: any[];
}

/**
 * Hook to consume live data feeds for an asset via WebSockets.
 * Listens to RealtimeService backend.
 */
export function useAssetStream(assetId?: string) {
  const [data, setData] = useState<AssetStreamData>({
    prices: null,
    rent: null,
    trades: [],
    governance: [],
  });

  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!assetId) return;

    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Join specific rooms
      socket.emit('subscribe:asset', assetId);
      socket.emit('subscribe:governance');
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Listen to specific events
    socket.on('asset_event', (payload: any) => {
      if (payload.type === 'PRICE_UPDATE') {
        setData(prev => ({ ...prev, prices: payload.data }));
      }
      if (payload.type === 'RENT_COLLECTED') {
        setData(prev => ({ ...prev, rent: payload.data }));
      }
    });

    socket.on('trade_event', (payload: any) => {
      setData(prev => ({
        ...prev,
        trades: [payload, ...prev.trades].slice(0, 50) // Keep last 50
      }));
    });

    socket.on('gov_event', (payload: any) => {
       setData(prev => ({
          ...prev,
          governance: [payload, ...prev.governance].slice(0, 20)
       }));
    });

    return () => {
      socket.emit('unsubscribe:asset', assetId);
      socket.disconnect();
    };
  }, [assetId]);

  return { streamData: data, isConnected: connected };
}
