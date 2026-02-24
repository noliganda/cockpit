'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number; // percentage change
  icon?: React.ReactNode;
  accentColor?: string;
  index?: number;
}

export function MetricCard({
  label,
  value,
  subValue,
  trend,
  icon,
  accentColor = '#C8FF3D',
  index = 0,
}: MetricCardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 hover:border-[#3A3A3A] transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">{label}</span>
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${accentColor}20` }}
          >
            <div style={{ color: accentColor }}>{icon}</div>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="flex items-center gap-2">
        {subValue && (
          <span className="text-xs text-[#A0A0A0]">{subValue}</span>
        )}
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-medium`}
            style={{ color: isPositive ? '#10B981' : '#EF4444' }}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </motion.div>
  );
}
