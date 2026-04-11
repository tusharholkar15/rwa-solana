'use client';

import React, { useMemo, useId } from 'react';
import { motion } from 'framer-motion';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

const Sparkline = React.memo(function Sparkline({ 
  data, 
  color = '#10b981', 
  width = 100, 
  height = 30 
}: SparklineProps) {
  const gradientId = useId();

  const stats = useMemo(() => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return { min, max, range };
  }, [data]);

  const pointsData = useMemo(() => {
    if (!stats) return null;
    const { min, range } = stats;
    
    const pointsList = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    });

    const pathPoints = pointsList.join(' ');
    const lastPoint = {
      x: width,
      y: height - ((data[data.length - 1] - min) / range) * height
    };

    return { pathPoints, lastPoint };
  }, [data, stats, width, height]);

  if (!stats || !pointsData) return null;

  return (
    <div className="relative group/spark" style={{ width, height }}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        
        {/* Fill Area */}
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          d={`M 0,${height} L ${pointsData.pathPoints} L ${width},${height} Z`}
          fill={`url(#${gradientId})`}
          className="transition-opacity duration-500"
        />

        {/* Line */}
        <motion.polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointsData.pathPoints}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Last Point Indicator */}
        <motion.circle
          cx={pointsData.lastPoint.x}
          cy={pointsData.lastPoint.y}
          r="3"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.2 }}
          className="shadow-[0_0_8px_rgba(16,185,129,1)]"
        />
      </svg>
    </div>
  );
});

export default Sparkline;
