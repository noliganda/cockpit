'use client';

import { motion } from 'framer-motion';
import { BookOpen, Sun, CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function BriefPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-semibold text-white">Morning Brief</h1>
        <p className="text-sm text-[#A0A0A0] mt-0.5">Your daily AI-generated operations summary</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col items-center justify-center py-24 gap-4"
      >
        <div className="h-16 w-16 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
          <BookOpen className="h-8 w-8 text-[#6B7280]" />
        </div>
        <h2 className="text-lg font-medium text-white">Morning Brief — Coming Soon</h2>
        <p className="text-sm text-[#6B7280] text-center max-w-sm">
          Every morning, Charlie will generate a personalised briefing: overdue tasks, today&apos;s agenda, key metrics, and priority actions across all workspaces.
        </p>
        <div className="flex gap-3 mt-2">
          <Card className="flex items-center gap-2 px-4 py-2 opacity-50 cursor-not-allowed">
            <Sun className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-sm text-[#A0A0A0]">Daily Summary</span>
          </Card>
          <Card className="flex items-center gap-2 px-4 py-2 opacity-50 cursor-not-allowed">
            <CalendarDays className="h-4 w-4 text-[#3B82F6]" />
            <span className="text-sm text-[#A0A0A0]">Agenda View</span>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
