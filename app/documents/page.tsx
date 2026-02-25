'use client';

import { motion } from 'framer-motion';
import { FolderOpen } from 'lucide-react';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';

export default function DocumentsPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);

  return (
    <div className="p-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-xl font-bold text-white">Documents</h1>
        <p className="text-sm text-[#A0A0A0] mt-0.5">Files linked to your {workspace.name} projects</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 bg-[#1A1A1A] border border-[#2A2A2A] border-dashed rounded-xl"
      >
        <FolderOpen className="w-10 h-10 text-[#3A3A3A] mb-3" />
        <p className="text-sm text-[#A0A0A0] font-medium">Documents coming soon</p>
        <p className="text-xs text-[#6B7280] mt-1 max-w-xs text-center">
          Google Drive and OneDrive integration will surface your workspace files here
        </p>
      </motion.div>
    </div>
  );
}
