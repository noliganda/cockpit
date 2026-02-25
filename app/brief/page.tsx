'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sun, Cloud, Waves, CheckSquare, Mail, Calendar, Youtube, Rss, AlertCircle, ArrowRight } from 'lucide-react';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { useTaskStore } from '@/stores/task-store';
import { useProjectStore } from '@/stores/project-store';
import { TASK_STATUSES, WORKSPACES } from '@/types';
import Link from 'next/link';
import { format } from 'date-fns';

export default function BriefPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = format(now, 'EEEE, MMMM d, yyyy');

  // Urgent tasks across ALL workspaces (morning brief is cross-workspace)
  const urgentByWorkspace = useMemo(() => {
    return WORKSPACES.map(ws => {
      const wsTasks = tasks.filter(t => t.workspaceId === ws.id && (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'done');
      return { workspace: ws, tasks: wsTasks };
    }).filter(g => g.tasks.length > 0);
  }, [tasks]);

  return (
    <div className="p-6 max-w-4xl">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <Sun className="w-5 h-5" style={{ color: accentColor }} />
          <h1 className="text-2xl font-bold text-white">{greeting}, Oli</h1>
        </div>
        <p className="text-sm text-[#A0A0A0]">{dateLabel}</p>
      </motion.div>

      <div className="space-y-4">
        {/* ── Weather & Surf ──────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Cloud className="w-4 h-4 text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-white">Weather & Surf</h2>
          </div>
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <Waves className="w-8 h-8 text-[#3A3A3A] mx-auto mb-2" />
              <p className="text-xs text-[#6B7280]">Live weather, UV, sunrise/sunset, and surf data coming soon</p>
              <p className="text-[10px] text-[#3A3A3A] mt-1">Byron Bay · South Golden Beach</p>
            </div>
          </div>
        </motion.div>

        {/* ── Overnight Work ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare className="w-4 h-4 text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-white">Overnight Work</h2>
          </div>
          <p className="text-xs text-[#6B7280] py-4 text-center">Development tasks and completed work will appear here</p>
        </motion.div>

        {/* ── Email Triage ───────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-white">Email Triage</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {WORKSPACES.map(ws => (
              <div key={ws.id} className="p-3 rounded-lg border border-[#2A2A2A]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: ws.color }} />
                  <span className="text-xs font-medium text-white">{ws.name}</span>
                </div>
                <p className="text-xs text-[#6B7280]">Gmail integration pending</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Today's Priorities ──────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#6B7280]" />
              <h2 className="text-sm font-semibold text-white">Today's Priorities</h2>
            </div>
            <Link href="/tasks" className="text-xs text-[#6B7280] hover:text-white flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {urgentByWorkspace.length === 0 ? (
            <p className="text-xs text-[#6B7280] py-4 text-center">No urgent tasks — nice work 🎉</p>
          ) : (
            <div className="space-y-4">
              {urgentByWorkspace.map(({ workspace: ws, tasks: wsTasks }) => (
                <div key={ws.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: ws.color }} />
                    <span className="text-xs font-semibold" style={{ color: ws.color }}>{ws.name}</span>
                    <span className="text-[10px] text-[#6B7280] bg-[#2A2A2A] px-1.5 py-0.5 rounded-full">{wsTasks.length}</span>
                  </div>
                  <div className="space-y-1">
                    {wsTasks.slice(0, 4).map(t => (
                      <div key={t.id} className="flex items-center gap-2 px-2 py-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: t.priority === 'urgent' ? '#EF4444' : '#F59E0B' }} />
                        <span className="text-xs text-white flex-1 truncate">{t.title}</span>
                        {t.dueDate && <span className="text-[10px] text-[#6B7280]">{format(new Date(t.dueDate), 'MMM d')}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Today's Agenda ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-white">Today's Agenda</h2>
          </div>
          <p className="text-xs text-[#6B7280] py-4 text-center">Google Calendar integration coming soon — events will be colour-coded by workspace</p>
        </motion.div>

        {/* ── YouTube TLDRs ──────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Youtube className="w-4 h-4 text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-white">YouTube TLDRs</h2>
          </div>
          <p className="text-xs text-[#6B7280] py-4 text-center">Video summaries and key takeaways from your Charlie Channel will appear here</p>
        </motion.div>

        {/* ── RSS / Content Feed ──────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Rss className="w-4 h-4 text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-white">Content Feed</h2>
          </div>
          <p className="text-xs text-[#6B7280] py-4 text-center">Your curated links, videos, articles, and podcasts — reviewed daily, compiled weekly into newsletter + video script ideas</p>
        </motion.div>
      </div>
    </div>
  );
}
