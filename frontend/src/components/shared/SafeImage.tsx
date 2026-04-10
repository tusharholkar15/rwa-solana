'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Home, Landmark, Factory, Trees } from 'lucide-react';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  assetType?: string;
}

export default function SafeImage({ src, alt, className = "", assetType = "Residential" }: SafeImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const getFallbackIcon = () => {
    const type = assetType.toLowerCase();
    if (type.includes('commercial')) return <Building2 size={48} />;
    if (type.includes('residential')) return <Home size={48} />;
    if (type.includes('industrial')) return <Factory size={48} />;
    if (type.includes('land')) return <Trees size={48} />;
    return <Landmark size={48} />;
  };

  const getFallbackGradient = () => {
    const type = assetType.toLowerCase();
    if (type.includes('commercial')) return 'from-indigo-900/60 to-surface-900';
    if (type.includes('residential')) return 'from-emerald-900/60 to-surface-900';
    if (type.includes('industrial')) return 'from-rose-900/60 to-surface-900';
    return 'from-cyan-900/60 to-surface-900';
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        {!error && src ? (
          <motion.img
            key="image"
            src={src}
            alt={alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: loading ? 0 : 1 }}
            onLoad={() => setLoading(false)}
            onError={() => setError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <motion.div
            key="fallback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`w-full h-full bg-gradient-to-br ${getFallbackGradient()} flex flex-col items-center justify-center p-8 gap-4 border border-white/5`}
          >
            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 shadow-2xl">
               {getFallbackIcon()}
            </div>
            <div className="text-center group-hover:scale-105 transition-transform duration-500">
               <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-1">{assetType} Registry</div>
               <div className="text-sm font-display font-bold text-white/60 tracking-tight leading-tight uppercase px-4">{alt}</div>
            </div>
            {/* Security Overlay Elements */}
            <div className="absolute top-4 right-4 text-[8px] font-mono text-white/10 uppercase tracking-widest">Property Spec • ID-V2</div>
            <div className="absolute bottom-4 left-4 w-12 h-1 bg-white/10 rounded-full" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Shimmer */}
      {loading && !error && src && (
        <div className="absolute inset-0 bg-white/5 animate-pulse" />
      )}
    </div>
  );
}
