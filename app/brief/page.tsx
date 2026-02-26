'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Cloud, Waves, Wind, CheckSquare, Mail, Calendar, Youtube, Rss, AlertCircle, ArrowRight, Check, Clock, Timer, TriangleAlert } from 'lucide-react';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { useTaskStore } from '@/stores/task-store';
import { useProjectStore } from '@/stores/project-store';
import { useSprintStore } from '@/stores/sprint-store';
import { WORKSPACES, getTerminalStatusIds, getTaskStatusesForWorkspace } from '@/types';
import Link from 'next/link';
import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';

// ── Weather helpers ───────────────────────────────────────────────────────────

type WeatherData = {
  temperature: number | null;
  apparentTemperature: number | null;
  weatherCode: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  uvIndex: number | null;
  precipitation: number | null;
  uvIndexMax: number | null;
  sunrise: string | null;
  sunset: string | null;
  waveHeight: number | null;
  swellHeight: number | null;
  wavePeriod: number | null;
  waveDirection: number | null;
};

function weatherInfo(code: number | null): { emoji: string; label: string } {
  if (code === null) return { emoji: '—', label: 'Unknown' };
  if (code === 0) return { emoji: '☀️', label: 'Clear' };
  if (code <= 2) return { emoji: '🌤️', label: 'Partly cloudy' };
  if (code <= 3) return { emoji: '☁️', label: 'Overcast' };
  if (code <= 49) return { emoji: '🌫️', label: 'Foggy' };
  if (code <= 55) return { emoji: '🌦️', label: 'Drizzle' };
  if (code <= 67) return { emoji: '🌧️', label: 'Rain' };
  if (code <= 77) return { emoji: '🌨️', label: 'Snow' };
  if (code <= 82) return { emoji: '🌦️', label: 'Showers' };
  return { emoji: '⛈️', label: 'Thunderstorm' };
}

function windCompass(deg: number | null): string {
  if (deg === null) return '—';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function uvLabel(uv: number | null): string {
  if (uv === null) return '—';
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very High';
  return 'Extreme';
}

function swellRating(h: number | null): { label: string; color: string } {
  if (!h || h < 0.2) return { label: 'Flat', color: '#6B7280' };
  if (h < 0.5) return { label: 'Ankle–knee', color: '#3B82F6' };
  if (h < 0.8) return { label: 'Knee–waist', color: '#10B981' };
  if (h < 1.2) return { label: 'Waist–chest', color: '#F59E0B' };
  if (h < 1.8) return { label: 'Head-high', color: '#EF4444' };
  return { label: 'Overhead+', color: '#8B5CF6' };
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  try { return format(new Date(iso), 'h:mm a'); } catch { return '—'; }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BriefPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { sprints } = useSprintStore();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = format(now, 'EEEE, MMMM d, yyyy');

  // Weather state
  const [weather, setWeather] = useState<{ data: WeatherData | null; loading: boolean; error: boolean }>({
    data: null,
    loading: true,
    error: false,
  });

  useEffect(() => {
    fetch('/api/weather')
      .then(r => r.json())
      .then(d => {
        if (d.error) setWeather({ data: null, loading: false, error: true });
        else setWeather({ data: d, loading: false, error: false });
      })
      .catch(() => setWeather({ data: null, loading: false, error: true }));
  }, []);

  // Urgent tasks across ALL workspaces
  const urgentByWorkspace = useMemo(() => {
    return WORKSPACES.map(ws => {
      const termIds = getTerminalStatusIds(ws.id);
      const wsTasks = tasks.filter(
        t => t.workspaceId === ws.id && (t.priority === 'urgent' || t.priority === 'high') && !termIds.includes(t.status),
      );
      return { workspace: ws, tasks: wsTasks };
    }).filter(g => g.tasks.length > 0);
  }, [tasks]);

  // Overnight work — tasks updated or created in the last 8 hours
  const overnightWork = useMemo(() => {
    const cutoff = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const recentDone = tasks.filter(t => getTerminalStatusIds(t.workspaceId).includes(t.status) && new Date(t.updatedAt) > cutoff);
    const recentStarted = tasks.filter(t => {
      const wsStatuses = getTaskStatusesForWorkspace(t.workspaceId);
      const firstId = wsStatuses[0]?.id;
      const termIds = getTerminalStatusIds(t.workspaceId);
      const isMidPipeline = !termIds.includes(t.status) && t.status !== firstId;
      return isMidPipeline && new Date(t.updatedAt) > cutoff && new Date(t.createdAt) > cutoff;
    });
    return { done: recentDone, started: recentStarted };
  }, [tasks]);

  const hasOvernightWork = overnightWork.done.length > 0 || overnightWork.started.length > 0;

  // Overdue tasks — past due date, not terminal, across all workspaces
  const overdueTasks = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return tasks
      .filter(t => t.dueDate && t.dueDate < today && !getTerminalStatusIds(t.workspaceId).includes(t.status))
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  }, [tasks]);

  // Active sprint progress across all workspaces
  const sprintProgress = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return sprints
      .filter(s => s.status === 'active')
      .map(sprint => {
        const sprintTasks = tasks.filter(t => sprint.taskIds.includes(t.id));
        const done = sprintTasks.filter(t => getTerminalStatusIds(sprint.workspaceId).includes(t.status)).length;
        const pct = sprintTasks.length > 0 ? Math.round((done / sprintTasks.length) * 100) : 0;
        const daysLeft = sprint.endDate ? differenceInDays(parseISO(sprint.endDate), new Date()) : null;
        const ws = WORKSPACES.find(w => w.id === sprint.workspaceId);
        return { sprint, total: sprintTasks.length, done, pct, daysLeft, ws };
      });
  }, [sprints, tasks]);

  // Surf data to display (prefer swell height over wave height for quality)
  const surfH = weather.data?.swellHeight ?? weather.data?.waveHeight ?? null;
  const swell = swellRating(surfH);
  const wi = weatherInfo(weather.data?.weatherCode ?? null);

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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Cloud className="w-4 h-4 text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-white">Weather & Surf</h2>
            <span className="text-[10px] text-[#6B7280] ml-auto">Byron Bay, NSW</span>
          </div>

          {weather.loading && (
            <div className="py-5 text-center">
              <div className="text-xs text-[#6B7280] animate-pulse">Loading weather…</div>
            </div>
          )}

          {weather.error && (
            <div className="py-5 text-center">
              <Waves className="w-6 h-6 text-[#3A3A3A] mx-auto mb-2" />
              <p className="text-xs text-[#6B7280]">Couldn't load weather data</p>
            </div>
          )}

          {weather.data && !weather.loading && (
            <div className="space-y-4">
              {/* Temperature + condition */}
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-white leading-none">
                  {weather.data.temperature !== null ? `${Math.round(weather.data.temperature)}°` : '—'}
                </span>
                <div className="pb-0.5">
                  <div className="text-xl leading-none">{wi.emoji}</div>
                </div>
                <div className="pb-0.5 space-y-0.5">
                  <p className="text-sm text-white">{wi.label}</p>
                  {weather.data.apparentTemperature !== null && (
                    <p className="text-xs text-[#6B7280]">Feels {Math.round(weather.data.apparentTemperature)}°</p>
                  )}
                </div>
              </div>

              {/* Stats chips */}
              <div className="flex flex-wrap gap-2">
                {weather.data.windSpeed !== null && (
                  <span className="flex items-center gap-1 text-xs text-[#A0A0A0] bg-[#2A2A2A] px-2.5 py-1 rounded-full">
                    <Wind className="w-3 h-3" />
                    {Math.round(weather.data.windSpeed)} km/h {windCompass(weather.data.windDirection)}
                  </span>
                )}
                {weather.data.uvIndex !== null && (
                  <span className="text-xs text-[#A0A0A0] bg-[#2A2A2A] px-2.5 py-1 rounded-full">
                    ☀ UV {Math.round(weather.data.uvIndex)} · {uvLabel(weather.data.uvIndex)}
                  </span>
                )}
                {weather.data.precipitation !== null && weather.data.precipitation > 0 && (
                  <span className="text-xs text-[#3B82F6] bg-[#3B82F6]/10 px-2.5 py-1 rounded-full">
                    🌧 {weather.data.precipitation} mm
                  </span>
                )}
              </div>

              {/* Sunrise / Sunset */}
              <div className="flex gap-4 text-xs text-[#6B7280]">
                <span>🌅 {formatTime(weather.data.sunrise)}</span>
                <span>🌇 {formatTime(weather.data.sunset)}</span>
              </div>

              {/* Surf */}
              <div className="border-t border-[#2A2A2A] pt-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Waves className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span className="text-xs text-[#6B7280]">Surf</span>
                  <span className="text-xs font-semibold" style={{ color: swell.color }}>{swell.label}</span>
                  {surfH !== null && (
                    <span className="text-xs text-[#6B7280]">· {surfH.toFixed(1)}m</span>
                  )}
                  {weather.data.wavePeriod !== null && (
                    <span className="text-xs text-[#6B7280]">· {Math.round(weather.data.wavePeriod)}s period</span>
                  )}
                  {weather.data.waveDirection !== null && (
                    <span className="text-xs text-[#6B7280]">· {windCompass(weather.data.waveDirection)} swell</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Overnight Work ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare className="w-4 h-4 text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-white">Overnight Work</h2>
            <span className="text-[10px] text-[#6B7280] ml-auto">Last 8 hours</span>
          </div>

          {!hasOvernightWork ? (
            <p className="text-xs text-[#6B7280] py-4 text-center">No completed or started tasks overnight — check back in the morning</p>
          ) : (
            <div className="space-y-3">
              {overnightWork.done.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-[#10B981] uppercase tracking-wide mb-2">Completed</p>
                  <div className="space-y-1">
                    {overnightWork.done.map(t => (
                      <div key={t.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-[#2A2A2A] transition-colors">
                        <Check className="w-3.5 h-3.5 text-[#10B981] mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white truncate">{t.title}</p>
                          <p className="text-[10px] text-[#6B7280]">{formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}</p>
                        </div>
                        <div className="text-[10px] text-[#6B7280] shrink-0">{WORKSPACES.find(w => w.id === t.workspaceId)?.name.split(' ')[0]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {overnightWork.started.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-[#F59E0B] uppercase tracking-wide mb-2">Started</p>
                  <div className="space-y-1">
                    {overnightWork.started.map(t => (
                      <div key={t.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-[#2A2A2A] transition-colors">
                        <Clock className="w-3.5 h-3.5 text-[#F59E0B] mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white truncate">{t.title}</p>
                          <p className="text-[10px] text-[#6B7280]">{formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</p>
                        </div>
                        <div className="text-[10px] text-[#6B7280] shrink-0">{WORKSPACES.find(w => w.id === t.workspaceId)?.name.split(' ')[0]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* ── Email Triage ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
        >
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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#6B7280]" />
              <h2 className="text-sm font-semibold text-white">Today's Priorities</h2>
            </div>
            <Link href="/tasks" className="text-xs text-[#6B7280] hover:text-white flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
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
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: t.priority === 'urgent' ? '#EF4444' : '#F59E0B' }}
                        />
                        <span className="text-xs text-white flex-1 truncate">{t.title}</span>
                        {t.dueDate && (
                          <span className="text-[10px] text-[#6B7280] shrink-0">{format(new Date(t.dueDate), 'MMM d')}</span>
                        )}
                      </div>
                    ))}
                    {wsTasks.length > 4 && (
                      <p className="text-[10px] text-[#6B7280] px-2">+{wsTasks.length - 4} more</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Overdue Tasks ──────────────────────────────────────── */}
        {overdueTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="bg-[#1A1A1A] border border-[#EF4444]/20 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TriangleAlert className="w-4 h-4 text-[#EF4444]" />
                <h2 className="text-sm font-semibold text-white">Overdue</h2>
                <span className="text-[10px] text-[#EF4444] bg-[#EF4444]/10 px-1.5 py-0.5 rounded-full">{overdueTasks.length}</span>
              </div>
              <Link href="/tasks" className="text-xs text-[#6B7280] hover:text-white flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-1">
              {overdueTasks.slice(0, 6).map(t => {
                const ws = WORKSPACES.find(w => w.id === t.workspaceId);
                const daysAgo = t.dueDate ? differenceInDays(new Date(), parseISO(t.dueDate)) : 0;
                return (
                  <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#2A2A2A] transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0" />
                    <span className="text-xs text-white flex-1 truncate">{t.title}</span>
                    <span className="text-[10px] text-[#EF4444] shrink-0">{daysAgo}d overdue</span>
                    {ws && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ws.color }} />}
                  </div>
                );
              })}
              {overdueTasks.length > 6 && (
                <p className="text-[10px] text-[#6B7280] px-2">+{overdueTasks.length - 6} more overdue</p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Active Sprints ─────────────────────────────────────── */}
        {sprintProgress.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Timer className="w-4 h-4 text-[#6B7280]" />
              <h2 className="text-sm font-semibold text-white">Active Sprints</h2>
            </div>
            <div className="space-y-4">
              {sprintProgress.map(({ sprint, total, done, pct, daysLeft, ws }) => (
                <div key={sprint.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {ws && <div className="w-2 h-2 rounded-full" style={{ background: ws.color }} />}
                      <Link href={`/sprints/${sprint.id}`} className="text-xs font-medium text-white hover:underline">
                        {sprint.name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#6B7280]">
                      <span>{done}/{total} done</span>
                      {daysLeft !== null && (
                        <span className={daysLeft <= 2 ? 'text-[#EF4444]' : daysLeft <= 5 ? 'text-[#F59E0B]' : ''}>
                          {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? 'Due today' : `${Math.abs(daysLeft)}d over`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : accentColor }}
                    />
                  </div>
                  {sprint.goal && (
                    <p className="text-[10px] text-[#6B7280] mt-1 truncate">{sprint.goal}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Today's Agenda ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-white">Today's Agenda</h2>
          </div>
          <p className="text-xs text-[#6B7280] py-4 text-center">
            Google Calendar integration coming soon — events will be colour-coded by workspace
          </p>
        </motion.div>

        {/* ── YouTube TLDRs ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Youtube className="w-4 h-4 text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-white">YouTube TLDRs</h2>
          </div>
          <p className="text-xs text-[#6B7280] py-4 text-center">
            Video summaries from your Charlie Channel will appear here
          </p>
        </motion.div>

        {/* ── RSS / Content Feed ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Rss className="w-4 h-4 text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-white">Content Feed</h2>
          </div>
          <p className="text-xs text-[#6B7280] py-4 text-center">
            Your curated links, videos, articles, and podcasts — reviewed daily, compiled weekly into newsletter + video script ideas
          </p>
        </motion.div>
      </div>
    </div>
  );
}
