'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function NotionSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch('/api/sync/notion', { method: 'POST' });
      const json = await res.json();
      if (json.data) {
        setResult(`Synced ${json.data.synced} tasks (${json.data.created} new)`);
      } else {
        setResult('Sync failed');
      }
    } catch {
      setResult('Sync error');
    } finally {
      setSyncing(false);
      setTimeout(() => setResult(null), 4000);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {result && (
          <span className="text-xs text-[#A0A0A0]">{result}</span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSync}
              disabled={syncing}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sync from Notion</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
