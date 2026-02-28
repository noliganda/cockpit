'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export function NotionSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [lastCount, setLastCount] = useState<number | null>(null);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      // 1. Trigger Notion → Postgres sync
      await fetch('/api/sync/notion', { method: 'POST' });

      // 2. Fetch synced tasks from Postgres
      const res = await fetch('/api/tasks/synced');
      const data = await res.json();

      if (data.tasks?.length > 0) {
        // 3. Merge into localStorage (keep local-only, replace Notion tasks)
        const existing = JSON.parse(localStorage.getItem('ops_tasks') || '[]');
        const localOnly = existing.filter((t: Record<string, unknown>) => !t.notionId);
        localStorage.setItem('ops_tasks', JSON.stringify([...localOnly, ...data.tasks]));
        setLastCount(data.count);
        window.location.reload();
      } else {
        setLastCount(0);
      }
    } catch {
      setLastCount(-1);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      title={lastCount !== null ? `Last sync: ${lastCount} tasks` : 'Sync tasks from Notion'}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[#2A2A2A] text-[#6B7280] hover:text-white hover:border-[#3A3A3A] transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Syncing…' : 'Notion'}
    </button>
  );
}
