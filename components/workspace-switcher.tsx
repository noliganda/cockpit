'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { WORKSPACES, type WorkspaceId } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function WorkspaceSwitcher({ collapsed }: { collapsed?: boolean }) {
  const [current, setCurrent] = useState<WorkspaceId>('byron-film');

  useEffect(() => {
    const stored = localStorage.getItem('workspace') as WorkspaceId | null;
    if (stored && WORKSPACES.find((w) => w.id === stored)) {
      setCurrent(stored);
    }
  }, []);

  const workspace = WORKSPACES.find((w) => w.id === current)!;

  const select = (id: WorkspaceId) => {
    setCurrent(id);
    localStorage.setItem('workspace', id);
    window.dispatchEvent(new CustomEvent('workspace-change', { detail: id }));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[#222222] transition-colors">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs"
            style={{ backgroundColor: workspace.color + '33', color: workspace.color }}
          >
            {workspace.icon}
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left font-medium text-white">{workspace.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#6B7280]" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {WORKSPACES.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => select(ws.id)}
            className="gap-2"
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded text-xs"
              style={{ backgroundColor: ws.color + '33', color: ws.color }}
            >
              {ws.icon}
            </span>
            <span>{ws.name}</span>
            {current === ws.id && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ws.color }} />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
