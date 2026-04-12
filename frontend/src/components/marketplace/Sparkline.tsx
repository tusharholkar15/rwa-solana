'use client';

import React, { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

/**
 * High-performance Sparkline: No animations, no gradients, exactly 30 points max.
 */
const Sparkline = React.memo(function Sparkline({ 
  data, 
  color = '#10b981', 
  width = 100, 
  height = 30 
}: SparklineProps) {
  // 1. Efficient Downsampling (max 30 points)
  const downsampledData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (data.length <= 30) return data;
    
    const result = [];
    const step = (data.length - 1) / 29;
    for (let i = 0; i < 30; i++) {
      result.push(data[Math.round(i * step)]);
    }
    return result;
  }, [data]);

  // 2. Memoized Path Generation
  const path = useMemo(() => {
    if (downsampledData.length < 2) return '';
    
    const min = Math.min(...downsampledData);
    const max = Math.max(...downsampledData);
    const range = max - min || 1;
    
    return downsampledData.map((val, i) => {
      const x = (i / (downsampledData.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [downsampledData, width, height]);

  if (!path) return <div style={{ width, height }} />;

  return (
    <div className="sparkline-container" style={{ width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          d={path}
          style={{ vectorEffect: 'non-scaling-stroke' }}
        />
      </svg>
    </div>
  );
});

export default Sparkline;
