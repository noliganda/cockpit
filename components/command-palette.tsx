'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, CornerDownLeft,
  CheckSquare, FolderOpen, Users, Timer, Layers,
  LayoutDashboard, Sun, BarChart2, DollarSign, MessageSquare, FileText, NotebookPen,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTaskStore } from '@/stores/task-store';
import { useProjectStore } from '@/stores/project-store';
import { useContactStore } from '@/stores/contact-store';
import { useSprintStore } from '@/stores/sprint-store';
import { useAreaStore } from '@/stores/area-store';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';

// ── Types ─────────────────────────────────────────────────────────────────────

type ResultItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
  type: 'Task' | 'Project' | 'Contact' | 'Sprint' | 'Area';
  color: string;
};

const QUICK_LINKS = [
  { title: 'Dashboard', href: '/', icon: <LayoutDashboard className="w-4 h-4" />, subtitle: 'Home overview' },
  { title: 'Tasks', href: '/tasks', icon: <CheckSquare className="w-4 h-4" />, subtitle: 'Task list' },
  { title: 'Kanban Board', href: '/tasks/kanban', icon: <CheckSquare className="w-4 h-4" />, subtitle: 'Drag & drop board' },
  { title: 'Projects', href: '/projects', icon: <FolderOpen className="w-4 h-4" />, subtitle: 'All projects' },
  { title: 'CRM', href: '/crm', icon: <Users className="w-4 h-4" />, subtitle: 'Pipeline & contacts' },
  { title: 'Sprints', href: '/sprints', icon: <Timer className="w-4 h-4" />, subtitle: 'Sprint management' },
  { title: 'Metrics', href: '/metrics', icon: <BarChart2 className="w-4 h-4" />, subtitle: 'Stats & KPIs' },
  { title: 'Morning Brief', href: '/brief', icon: <Sun className="w-4 h-4" />, subtitle: 'Daily summary' },
  { title: 'Notes', href: '/notes', icon: <NotebookPen className="w-4 h-4" />, subtitle: 'Workspace notepad' },
  { title: 'Documents', href: '/documents', icon: <FileText className="w-4 h-4" />, subtitle: 'File browser' },
  { title: 'Messages', href: '/messages', icon: <MessageSquare className="w-4 h-4" />, subtitle: 'Message feed' },
  { title: 'Costs', href: '/costs', icon: <DollarSign className="w-4 h-4" />, subtitle: 'Budget & expenses' },
];

const RESULT_TYPES: ResultItem['type'][] = ['Task', 'Project', 'Contact', 'Sprint', 'Area'];

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { getContactsForWorkspace } = useContactStore();
  const { sprints } = useSprintStore();
  const { getAreasForWorkspace } = useAreaStore();

  // Open / close with ⌘K or custom event from sidebar button
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(v => !v);
        setQuery('');
        setSelected(0);
      }
    };
    const openHandler = () => {
      setOpen(true);
      setQuery('');
      setSelected(0);
    };
    window.addEventListener('keydown', keyHandler);
    window.addEventListener('cmd-palette-open', openHandler);
    return () => {
      window.removeEventListener('keydown', keyHandler);
      window.removeEventListener('cmd-palette-open', openHandler);
    };
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const close = () => setOpen(false);

  // Build search results
  const items = useMemo<ResultItem[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const res: ResultItem[] = [];

    tasks
      .filter(t => t.workspaceId === workspace.id && t.title.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach(t => res.push({
        id: t.id,
        title: t.title,
        subtitle: `Task · ${t.status.replace(/-/g, ' ')}`,
        href: '/tasks/kanban',
        icon: <CheckSquare className="w-3.5 h-3.5" />,
        type: 'Task',
        color: '#6B7280',
      }));

    projects
      .filter(p => p.workspaceId === workspace.id && p.name.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach(p => res.push({
        id: p.id,
        title: p.name,
        subtitle: `Project · ${p.status}`,
        href: `/projects/${p.id}`,
        icon: <FolderOpen className="w-3.5 h-3.5" />,
        type: 'Project',
        color: accentColor,
      }));

    getContactsForWorkspace(workspace.id)
      .filter(c => c.name.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach(c => res.push({
        id: c.id,
        title: c.name,
        subtitle: `Contact · ${c.company ?? c.role ?? 'CRM'}`,
        href: `/crm/${c.id}`,
        icon: <Users className="w-3.5 h-3.5" />,
        type: 'Contact',
        color: '#8B5CF6',
      }));

    sprints
      .filter(s => s.workspaceId === workspace.id && s.name.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach(s => res.push({
        id: s.id,
        title: s.name,
        subtitle: `Sprint · ${s.status}`,
        href: `/sprints/${s.id}`,
        icon: <Timer className="w-3.5 h-3.5" />,
        type: 'Sprint',
        color: '#F59E0B',
      }));

    getAreasForWorkspace(workspace.id)
      .filter(a => a.name.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach(a => res.push({
        id: a.id,
        title: a.name,
        subtitle: 'Area',
        href: '/areas',
        icon: <Layers className="w-3.5 h-3.5" />,
        type: 'Area',
        color: a.color,
      }));

    return res;
  }, [query, tasks, projects, sprints, getContactsForWorkspace, getAreasForWorkspace, workspace.id, accentColor]);

  const listCount = query ? items.length : QUICK_LINKS.length;

  // Keyboard navigation within palette
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(v => Math.min(v + 1, listCount - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(v => Math.max(v - 1, 0)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const href = query ? items[selected]?.href : QUICK_LINKS[selected]?.href;
        if (href) { router.push(href); close(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, query, items, selected, listCount, router]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[18vh]"
          onClick={e => { if (e.target === e.currentTarget) close(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg mx-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Input row */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#2A2A2A]">
              <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(0); }}
                placeholder="Search tasks, projects, contacts…"
                className="flex-1 bg-transparent text-sm text-white placeholder-[#6B7280] outline-none"
              />
              {query ? (
                <button onClick={() => { setQuery(''); setSelected(0); }} className="text-[#6B7280] hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="text-[10px] text-[#6B7280] bg-[#2A2A2A] px-1.5 py-0.5 rounded font-mono shrink-0">ESC</kbd>
              )}
            </div>

            {/* Results list */}
            <div className="max-h-[340px] overflow-y-auto py-1.5">
              {!query ? (
                <>
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Quick navigation</p>
                  {QUICK_LINKS.map((link, i) => (
                    <ResultRow
                      key={link.href}
                      icon={link.icon}
                      title={link.title}
                      subtitle={link.subtitle}
                      isSelected={i === selected}
                      accentColor={accentColor}
                      color={i === selected ? accentColor : '#6B7280'}
                      onHover={() => setSelected(i)}
                      onClick={() => { router.push(link.href); close(); }}
                    />
                  ))}
                </>
              ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-[#6B7280]">No results for <span className="text-white">"{query}"</span></p>
                </div>
              ) : (
                RESULT_TYPES.map(type => {
                  const group = items.filter(r => r.type === type);
                  if (group.length === 0) return null;
                  return (
                    <div key={type}>
                      <p className="px-4 py-1.5 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">{type}s</p>
                      {group.map(item => {
                        const idx = items.indexOf(item);
                        return (
                          <ResultRow
                            key={item.id}
                            icon={item.icon}
                            title={item.title}
                            subtitle={item.subtitle}
                            isSelected={idx === selected}
                            accentColor={accentColor}
                            color={item.color}
                            onHover={() => setSelected(idx)}
                            onClick={() => { router.push(item.href); close(); }}
                          />
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer hints */}
            <div className="px-4 py-2 border-t border-[#2A2A2A] flex items-center gap-3 text-[10px] text-[#6B7280]">
              <span><Kbd>↑↓</Kbd> navigate</span>
              <span><Kbd>↵</Kbd> open</span>
              <span><Kbd>esc</Kbd> close</span>
              <div className="ml-auto flex items-center gap-0.5 text-[#4A4A4A]">
                <Kbd>⌘</Kbd><Kbd>K</Kbd>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ResultRow({
  icon, title, subtitle, isSelected, accentColor, color, onHover, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  isSelected: boolean;
  accentColor: string;
  color: string;
  onHover: () => void;
  onClick: () => void;
}) {
  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
      style={{ background: isSelected ? '#222' : 'transparent' }}
      onMouseEnter={onHover}
      onClick={onClick}
    >
      <span style={{ color }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{title}</p>
        <p className="text-xs text-[#6B7280] truncate">{subtitle}</p>
      </div>
      {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-[#2A2A2A] px-1.5 py-0.5 rounded font-mono">{children}</kbd>
  );
}
