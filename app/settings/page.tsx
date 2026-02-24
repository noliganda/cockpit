'use client';

import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-[#A0A0A0] mt-0.5">App configuration</p>
      </motion.div>

      <div className="flex items-center justify-center h-64 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
        <div className="text-center">
          <Settings className="w-8 h-8 text-[#A0A0A0] mx-auto mb-3" />
          <p className="text-sm text-[#A0A0A0]">Settings coming soon</p>
        </div>
      </div>
    </div>
  );
}
