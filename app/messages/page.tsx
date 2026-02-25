'use client';

import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';

export default function MessagesPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);

  return (
    <div className="p-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-xl font-bold text-white">Messages</h1>
        <p className="text-sm text-[#A0A0A0] mt-0.5">Project conversations and communication</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 bg-[#1A1A1A] border border-[#2A2A2A] border-dashed rounded-xl"
      >
        <MessageSquare className="w-10 h-10 text-[#3A3A3A] mb-3" />
        <p className="text-sm text-[#A0A0A0] font-medium">Messages coming soon</p>
        <p className="text-xs text-[#6B7280] mt-1 max-w-xs text-center">
          Project-linked conversations, email threads, and notifications will appear here
        </p>
      </motion.div>
    </div>
  );
}
