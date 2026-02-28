'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ActivityLog } from '@/types';
import { Minus, Plus, DollarSign, Clock, TrendingUp, Target } from 'lucide-react';

const CURRENCY_RATES: Record<string, number> = { AUD: 1, USD: 0.64, EUR: 0.59 };
const CURRENCY_SYMBOLS: Record<string, string> = { AUD: 'A$', USD: '$', EUR: '€' };

const CATEGORIES = [
  { key: 'email', label: 'Email & Comms', color: '#3B82F6', weight: 0.20 },
  { key: 'research', label: 'Research', color: '#8B5CF6', weight: 0.18 },
  { key: 'recruitment', label: 'Recruitment', color: '#F59E0B', weight: 0.15 },
  { key: 'admin', label: 'Admin & Ops', color: '#22C55E', weight: 0.17 },
  { key: 'coordination', label: 'Coordination', color: '#EC4899', weight: 0.12 },
  { key: 'legal', label: 'Legal & Entity', color: '#EF4444', weight: 0.10 },
  { key: 'production', label: 'Production', color: '#D4A017', weight: 0.08 },
];

const PRESETS = [
  { label: 'Junior', rate: 35 },
  { label: 'Mid', rate: 75 },
  { label: 'Senior', rate: 120 },
  { label: 'Executive', rate: 250 },
];

export default function MetricsPage() {
  const [rate, setRate] = useState(75);
  const [currency, setCurrency] = useState('AUD');
  const [period, setPeriod] = useState(30);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    const res = await fetch(`/api/activity?limit=200`);
    const data = await res.json();
    if (data.data) setActivity(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  // Filter to period
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - period);
  const periodActivity = activity.filter((a) => new Date(a.timestamp) >= cutoff);

  // Compute stats
  const taskCount = periodActivity.filter((a) => a.entityType === 'task').length;
  // Estimate hours: each activity averages ~0.5 hrs equivalent work
  const hoursEstimate = Math.round(taskCount * 0.5 + periodActivity.length * 0.2);
  const conversionRate = CURRENCY_RATES[currency] ?? 1;
  const symbol = CURRENCY_SYMBOLS[currency] ?? '$';
  const savings = Math.round(hoursEstimate * rate * conversionRate);
  const humanCost = Math.round(hoursEstimate * (rate * 2.5) * conversionRate); // 2.5x for employee overhead
  const roi = humanCost > 0 ? Math.round(((humanCost - savings) / savings) * 100) : 0;

  // Category breakdown
  const categoryData = CATEGORIES.map((c) => ({
    ...c,
    hours: Math.round(hoursEstimate * c.weight),
    value: Math.round(hoursEstimate * c.weight * rate * conversionRate),
  }));

  const SECTION_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.08 } }),
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold text-white">Cost Efficiency</h1>
        <p className="text-sm text-[#A0A0A0] mt-0.5">
          Calculate the value of AI-assisted operations
        </p>
      </motion.div>

      {/* Controls */}
      <motion.div custom={0} initial="hidden" animate="show" variants={SECTION_VARIANTS}>
        <Card className="p-5 space-y-5">
          {/* Rate slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Hourly Rate (AUD equivalent)</Label>
              <span className="text-lg font-mono font-bold text-white">{symbol}{Math.round(rate * conversionRate)}/hr</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setRate((r) => Math.max(10, r - 5))}
                className="h-7 w-7 rounded-lg border border-[#2A2A2A] flex items-center justify-center hover:bg-[#222222] transition-colors"
              >
                <Minus className="h-3.5 w-3.5 text-[#A0A0A0]" />
              </button>
              <div className="flex-1">
                <input
                  type="range"
                  min={10}
                  max={500}
                  step={5}
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full accent-[#3B82F6]"
                />
              </div>
              <button
                onClick={() => setRate((r) => Math.min(500, r + 5))}
                className="h-7 w-7 rounded-lg border border-[#2A2A2A] flex items-center justify-center hover:bg-[#222222] transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-[#A0A0A0]" />
              </button>
            </div>
            <div className="flex gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setRate(p.rate)}
                  className="px-2.5 py-1 rounded-lg text-xs transition-colors"
                  style={
                    rate === p.rate
                      ? { backgroundColor: '#3B82F6', color: '#fff' }
                      : { backgroundColor: '#1A1A1A', color: '#A0A0A0', border: '1px solid #2A2A2A' }
                  }
                >
                  {p.label} ({symbol}{Math.round(p.rate * conversionRate)})
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            {/* Currency */}
            <div className="space-y-2">
              <Label>Currency</Label>
              <div className="flex gap-2">
                {['AUD', 'USD', 'EUR'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    style={
                      currency === c
                        ? { backgroundColor: '#3B82F6', color: '#fff' }
                        : { backgroundColor: '#1A1A1A', color: '#A0A0A0', border: '1px solid #2A2A2A' }
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Period */}
            <div className="space-y-2">
              <Label>Period</Label>
              <div className="flex gap-2">
                {[7, 30, 90, 365].map((d) => (
                  <button
                    key={d}
                    onClick={() => setPeriod(d)}
                    className="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    style={
                      period === d
                        ? { backgroundColor: '#3B82F6', color: '#fff' }
                        : { backgroundColor: '#1A1A1A', color: '#A0A0A0', border: '1px solid #2A2A2A' }
                    }
                  >
                    {d === 365 ? '1yr' : `${d}d`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Headline stats */}
      <motion.div
        custom={1}
        initial="hidden"
        animate="show"
        variants={SECTION_VARIANTS}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        <StatCard icon={DollarSign} label="Total Savings" value={`${symbol}${savings.toLocaleString()}`} color="#22C55E" />
        <StatCard icon={TrendingUp} label="ROI" value={`${roi}%`} color="#3B82F6" />
        <StatCard icon={Clock} label="Hours Saved" value={`${hoursEstimate}h`} color="#8B5CF6" />
        <StatCard icon={Target} label="Actions Logged" value={String(periodActivity.length)} color="#F59E0B" />
      </motion.div>

      {/* Category breakdown */}
      <motion.div custom={2} initial="hidden" animate="show" variants={SECTION_VARIANTS}>
        <Card className="p-5">
          <h2 className="text-sm font-medium text-white mb-4">Category Breakdown — Last {period} Days</h2>
          {loading ? (
            <div className="py-8 text-center text-sm text-[#6B7280]">Loading activity data…</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fill: '#A0A0A0', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(val: number | undefined) => [`${val ?? 0}h`, 'Hours']}
                  />
                  <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                    {categoryData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 space-y-2">
                {categoryData.map((c) => (
                  <div key={c.key} className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-xs text-[#A0A0A0] w-36">{c.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[#2A2A2A] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(c.weight * 100)}%`, backgroundColor: c.color }}
                      />
                    </div>
                    <span className="text-xs text-[#A0A0A0] w-16 text-right">{c.hours}h</span>
                    <span className="text-xs font-medium text-white w-20 text-right">
                      {symbol}{c.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </motion.div>

      {/* View KORUS dashboard */}
      <motion.div custom={3} initial="hidden" animate="show" variants={SECTION_VARIANTS}>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-white">KORUS APAC Operations Dashboard</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Full executive dashboard for the KORUS board (Copil)</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => window.open('/metrics/korus', '_blank')}>
              Open Dashboard
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-[#A0A0A0]">{children}</p>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '22' }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <p className="text-xl font-bold text-white font-mono">{value}</p>
      <p className="text-xs text-[#6B7280] mt-0.5">{label}</p>
    </Card>
  );
}
