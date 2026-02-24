'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { WORKSPACES, Workspace } from '@/types';
import { useWorkspace } from '@/hooks/use-workspace';

export function WorkspaceSwitcher() {
  const { workspace, setWorkspaceId } = useWorkspace();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-[#2A2A2A] transition-colors group"
      >
        <span className="text-lg leading-none">{workspace.icon}</span>
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-semibold text-white truncate">{workspace.name}</div>
          <div className="text-xs text-[#A0A0A0] truncate">Workspace</div>
        </div>
        <ChevronDown
          className="w-4 h-4 text-[#A0A0A0] transition-transform shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-1 left-0 right-0 z-20 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg overflow-hidden shadow-xl"
            >
              {WORKSPACES.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setWorkspaceId(ws.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-[#2A2A2A] transition-colors"
                >
                  <span className="text-base">{ws.icon}</span>
                  <span className="text-sm text-white flex-1 text-left">{ws.name}</span>
                  {ws.id === workspace.id && (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: ws.color }}
                    />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
