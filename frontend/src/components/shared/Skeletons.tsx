'use client';

import React from 'react';
import { motion } from 'framer-motion';

/** Skeleton line shimmer */
export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-white/[0.04] ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

/** Skeleton card for dashboard panels */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="institutional-glass p-6 space-y-4 animate-pulse">
      <SkeletonLine className="h-4 w-1/3" />
      <SkeletonLine className="h-8 w-2/3" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonLine key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}

/** Skeleton table row */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonLine key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

/** Full-page skeleton for dashboard views */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-end justify-between">
        <div className="space-y-3">
          <SkeletonLine className="h-3 w-32" />
          <SkeletonLine className="h-10 w-64" />
        </div>
        <SkeletonLine className="h-12 w-40 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
      <div className="institutional-glass p-0 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} cols={5} />
        ))}
      </div>
    </div>
  );
}
