'use client';

import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';

export default function CRMPage() {
  const { workspace } = useWorkspace();
  const accentColor = workspace.slug === 'korus' ? '#3B82F6' : '#C8FF3D';

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h1 className="text-xl font-bold text-white">CRM</h1>
        <p className="text-sm text-[#A0A0A0] mt-0.5">Pipeline & contacts · {workspace.name}</p>
      </motion.div>

      <div className="flex items-center justify-center h-64 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
        <div className="text-center">
          <Users className="w-8 h-8 text-[#A0A0A0] mx-auto mb-3" />
          <p className="text-sm text-[#A0A0A0]">CRM coming soon</p>
          <p className="text-xs text-[#6B7280] mt-1">Pipeline + contacts view</p>
        </div>
      </div>
    </div>
  );
}
