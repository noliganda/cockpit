'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, Tag, FolderOpen, User, FileText, Zap, Target, CheckSquare } from 'lucide-react';
import type { ActivityLog } from '@/types';
import { WORKSPACES } from '@/types';
import { formatRelativeDate } from '@/lib/utils';

const ENTITY_ICONS: Record<string, React.ElementType> = {
  task: CheckSquare,
  project: FolderOpen,
  contact: User,
  organisation: User,
  note: FileText,
  sprint: Zap,
  area: Target,
};

const ENTITY_PATHS: Record<string, (id: string) => string> = {
  task: () => '/tasks',
  project: (id) => `/projects/${id}`,
  contact: (id) => `/crm/${id}`,
  organisation: () => '/crm',
  note: () => '/notes',
  sprint: (id) => `/sprints/${id}`,
  area: (id) => `/areas/${id}`,
};

export function SearchBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cmd+/ to focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
        setResults([]);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, limit: 10 }),
      });
      const data = await res.json();
      if (data.data) setResults(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(val), 300);
  }

  function navigate(log: ActivityLog) {
    const pathFn = ENTITY_PATHS[log.entityType];
    if (pathFn) router.push(pathFn(log.entityId));
    setOpen(false);
    setQuery('');
    setResults([]);
  }

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 px-3 h-8 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] text-[#6B7280] hover:border-[#3A3A3A] hover:text-white transition-colors text-xs"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:block">Search</span>
        <kbd className="hidden sm:block border border-[#3A3A3A] rounded px-1 py-0.5 text-[10px]">⌘/</kbd>
      </button>

      {/* Modal overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => { setOpen(false); setQuery(''); setResults([]); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15 }}
              className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4"
            >
              <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-2xl overflow-hidden">
                {/* Input */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2A2A2A]">
                  <Search className="h-4 w-4 text-[#6B7280] shrink-0" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => handleInput(e.target.value)}
                    placeholder="Search tasks, projects, contacts…"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-[#6B7280] outline-none"
                  />
                  {query && (
                    <button onClick={() => { setQuery(''); setResults([]); }} className="text-[#6B7280] hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                  {loading && (
                    <div className="py-6 text-center text-xs text-[#6B7280]">Searching…</div>
                  )}
                  {!loading && query && results.length === 0 && (
                    <div className="py-6 text-center text-xs text-[#6B7280]">
                      No results for &quot;{query}&quot;
                    </div>
                  )}
                  {!loading && results.length > 0 && (
                    <div className="py-1">
                      {results.map((log) => {
                        const Icon = ENTITY_ICONS[log.entityType] ?? Tag;
                        const ws = WORKSPACES.find((w) => w.id === log.workspaceId);
                        return (
                          <button
                            key={log.id}
                            onClick={() => navigate(log)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#222222] transition-colors text-left"
                          >
                            <div className="h-7 w-7 rounded-lg bg-[#2A2A2A] flex items-center justify-center shrink-0">
                              <Icon className="h-3.5 w-3.5 text-[#A0A0A0]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{log.entityTitle}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-[#6B7280] capitalize">{log.entityType}</span>
                                {ws && (
                                  <span className="text-[10px]" style={{ color: ws.color }}>{ws.icon} {ws.name}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-[#6B7280] shrink-0">
                              <Clock className="h-3 w-3" />
                              {formatRelativeDate(log.timestamp)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!query && (
                    <div className="py-6 text-center text-xs text-[#6B7280]">
                      Type to search across all entities
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
