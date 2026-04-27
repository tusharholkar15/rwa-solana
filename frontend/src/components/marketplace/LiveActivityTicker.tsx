'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useRealtime } from '@/context/RealtimeContext';

export default function LiveActivityTicker() {
  const { marketEvents } = useRealtime();
  const [liveEvents, setLiveEvents] = useState([
    { id: 1, type: 'MINT', msg: 'New Institutional Mint: Austin Resi-Portfolio [+540.2 SOL]', time: '2m ago' },
    { id: 2, type: 'SWAP', msg: 'Large Whale Swap: Miami Industrial v2 [1,200 ASSET]', time: '5m ago' },
  ]);

  useEffect(() => {
    if (marketEvents.length > 0) {
      setLiveEvents(prev => [...marketEvents, ...prev].slice(0, 10));
    }
  }, [marketEvents]);

  return (
    <div className="hidden xl:block min-w-[300px]">
      <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
        <Activity size={10} className="text-emerald-400 animate-pulse" />
        Institutional Activity
      </div>
      <div className="h-8 overflow-hidden relative">
        <AnimatePresence mode="popLayout">
          {liveEvents.slice(0, 1).map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-[11px] font-bold text-white/70 truncate flex items-center gap-2"
            >
              <span className={`px-1.5 py-0.5 rounded-[3px] text-[8px] ${
                event.type === 'MINT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {event.type}
              </span>
              {event.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
