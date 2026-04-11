'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Building2, Globe, ArrowRight } from 'lucide-react';

interface MarketMapProps {
  assets: any[];
}

// Simple geographic coordinates mapping for demo cities
const CITY_COORDS: Record<string, { x: number, y: number }> = {
  'New York': { x: 25, y: 35 },
  'London': { x: 48, y: 28 },
  'Miami': { x: 26, y: 42 },
  'Dubai': { x: 62, y: 40 },
  'Singapore': { x: 82, y: 58 },
  'Tokyo': { x: 88, y: 35 },
  'Austin': { x: 22, y: 42 },
  'Berlin': { x: 52, y: 28 },
  'Mumbai': { x: 74, y: 45 },
  'Sao Paulo': { x: 35, y: 65 },
  'Lagos': { x: 48, y: 52 },
  'Shenzhen': { x: 84, y: 40 },
};

export default function MarketMap({ assets }: MarketMapProps) {
  const [hoveredAsset, setHoveredAsset] = useState<any | null>(null);

  // Group assets by city for the map pins - memoized to prevent lag during hover state changes
  const cityGroups = React.useMemo(() => {
    return assets.reduce((acc: any, asset) => {
      const city = asset.location?.city || 'Unknown';
      if (!acc[city]) acc[city] = [];
      acc[city].push(asset);
      return acc;
    }, {});
  }, [assets]);

  return (
    <div className="relative w-full aspect-[21/9] institutional-glass bg-surface-900 overflow-hidden border-white/5">
      {/* Abstract World Map Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg viewBox="0 0 100 60" className="w-full h-full fill-white/10">
           {/* Abstract continental shapes */}
           <path d="M15,20 Q20,15 30,20 Q35,25 30,40 Q25,50 15,45 Z" /> {/* Americas snippet */}
           <path d="M45,15 Q55,10 65,15 Q70,25 60,40 Q50,55 45,45 Z" /> {/* Eurasia snippet */}
           <path d="M48,42 Q55,45 58,55 Q50,65 42,55 Z" /> {/* Africa snippet */}
           <path d="M75,50 Q85,45 90,55 Q85,65 75,60 Z" /> {/* Oceania snippet */}
        </svg>
      </div>

      {/* Connection Lines (Aesthetic) */}
      <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full pointer-events-none">
        {Object.keys(CITY_COORDS).slice(0, 4).map((city, i, arr) => {
           if (i === arr.length - 1) return null;
           const start = CITY_COORDS[city];
           const end = CITY_COORDS[arr[i+1]];
           return (
             <motion.path
               key={i}
               d={`M ${start.x} ${start.y} Q ${(start.x + end.x)/2} ${(start.y + end.y)/2 - 10} ${end.x} ${end.y}`}
               fill="none"
               stroke="url(#lineGradient)"
               strokeWidth="0.1"
               initial={{ pathLength: 0, opacity: 0 }}
               animate={{ pathLength: 1, opacity: 0.3 }}
               transition={{ duration: 3, repeat: Infinity, repeatType: "loop" }}
             />
           );
        })}
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Map Content Overlay */}
      <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none">
         <div className="flex justify-between items-start">
            <div>
               <h3 className="text-xl font-display font-bold text-white mb-2">Global Distribution</h3>
               <div className="flex items-center gap-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Globe size={10} className="text-emerald-500" /> 12 Strategic Nodes</span>
                  <span className="flex items-center gap-1"><Building2 size={10} className="text-indigo-500" /> {assets.length} Active Listings</span>
               </div>
            </div>
            <div className="institutional-glass bg-white/5 px-4 py-2 flex items-center gap-4 backdrop-blur-md">
               <div className="flex -space-x-2">
                  {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border border-surface-950 bg-emerald-500/20" />)}
               </div>
               <span className="text-[9px] font-bold text-white/60 tracking-widest uppercase">Verified Issuers</span>
            </div>
         </div>
      </div>

      {/* Pins */}
      {Object.entries(cityGroups).map(([city, cityAssets]: [string, any]) => {
        const coords = CITY_COORDS[city] || { x: Math.random() * 80 + 10, y: Math.random() * 40 + 10 };
        return (
          <div 
            key={city}
            className="absolute cursor-pointer pointer-events-auto"
            style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
            onMouseEnter={() => setHoveredAsset(cityAssets[0])}
            onMouseLeave={() => setHoveredAsset(null)}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.2 }}
              className="relative group"
            >
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-emerald-500/30 animate-ping opacity-20" />
              
              {/* Tooltip */}
              <AnimatePresence>
                {hoveredAsset && hoveredAsset.location?.city === city && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: -45, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute z-50 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg bg-surface-950 border border-white/10 shadow-2xl whitespace-nowrap"
                  >
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">{city}</div>
                    <div className="text-xs font-bold text-white">{cityAssets.length} Propert{cityAssets.length > 1 ? 'ies' : 'y'}</div>
                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-surface-950" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-6 right-8 flex items-center gap-6 pointer-events-none">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Active Yielding</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Pipeline Prep</span>
         </div>
      </div>
    </div>
  );
}
