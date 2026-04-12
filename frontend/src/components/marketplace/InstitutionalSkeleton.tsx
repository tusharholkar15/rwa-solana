'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function InstitutionalSkeleton() {
  return (
    <div className="institutional-card-optimized overflow-hidden bg-surface-900 border border-white/5 rounded-2xl h-[580px]">
      {/* Header Image Skeleton */}
      <div className="relative h-60 bg-white/5 overflow-hidden">
        <motion.div
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shadow-xl"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="w-16 h-4 bg-white/10 rounded" />
          <div className="w-12 h-4 bg-white/10 rounded" />
        </div>
      </div>

      {/* Body Skeleton */}
      <div className="p-5">
        <div className="w-2/3 h-6 bg-white/10 rounded mb-6" />
        
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <div className="w-12 h-3 bg-white/5 rounded mb-2" />
            <div className="w-20 h-5 bg-white/10 rounded" />
          </div>
          <div>
            <div className="w-12 h-3 bg-white/5 rounded mb-2" />
            <div className="w-20 h-5 bg-white/10 rounded" />
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <div className="w-16 h-3 bg-white/5 rounded" />
            <div className="w-8 h-3 bg-white/5 rounded" />
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
             <div className="w-1/3 h-full bg-white/10" />
          </div>
        </div>

        <div className="pt-4 border-t border-white/5 flex justify-between">
          <div className="w-16 h-4 bg-white/5 rounded" />
          <div className="w-24 h-4 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}
