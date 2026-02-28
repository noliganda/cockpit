'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CheckSquare, FolderOpen, Users, FileText, Home, Target, Zap, BarChart2, Settings } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/areas', label: 'Areas', icon: Target },
  { href: '/sprints', label: 'Sprints', icon: Zap },
  { href: '/crm', label: 'CRM', icon: Users },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/metrics', label: 'Metrics', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const filtered = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const navigate = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg p-0">
        <div className="flex items-center gap-2 border-b border-[#2A2A2A] px-4 py-3">
          <Search className="h-4 w-4 text-[#6B7280] shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages or type a command..."
            className="border-0 bg-transparent px-0 focus:border-0 text-sm"
            autoFocus
          />
          <kbd className="text-xs text-[#6B7280] border border-[#2A2A2A] rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="py-2 max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[#6B7280]">No results</p>
          ) : (
            filtered.map(({ href, label, icon: Icon }) => (
              <button
                key={href}
                onClick={() => navigate(href)}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[#A0A0A0] hover:bg-[#222222] hover:text-white transition-colors"
              >
                <Icon className="h-4 w-4 text-[#6B7280]" />
                {label}
              </button>
            ))
          )}
        </div>
        <div className="border-t border-[#2A2A2A] px-4 py-2">
          <p className="text-xs text-[#6B7280]">
            <kbd className="border border-[#2A2A2A] rounded px-1 py-0.5 mr-1">↑↓</kbd> navigate
            <span className="mx-2">·</span>
            <kbd className="border border-[#2A2A2A] rounded px-1 py-0.5 mr-1">↵</kbd> open
            <span className="mx-2">·</span>
            <kbd className="border border-[#2A2A2A] rounded px-1 py-0.5">⌘K</kbd> toggle
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
