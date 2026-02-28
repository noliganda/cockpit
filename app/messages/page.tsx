'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Mail, Phone } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function MessagesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-semibold text-white">Messages</h1>
        <p className="text-sm text-[#A0A0A0] mt-0.5">Unified communications feed</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col items-center justify-center py-24 gap-4"
      >
        <div className="h-16 w-16 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
          <MessageSquare className="h-8 w-8 text-[#6B7280]" />
        </div>
        <h2 className="text-lg font-medium text-white">Messages — Coming Soon</h2>
        <p className="text-sm text-[#6B7280] text-center max-w-sm">
          A unified inbox for email, WhatsApp, and Telegram. All your business communications in one place, linked to contacts and projects.
        </p>
        <div className="flex gap-3 mt-2">
          <Card className="flex items-center gap-2 px-4 py-2 opacity-50 cursor-not-allowed">
            <Mail className="h-4 w-4 text-[#3B82F6]" />
            <span className="text-sm text-[#A0A0A0]">Email</span>
          </Card>
          <Card className="flex items-center gap-2 px-4 py-2 opacity-50 cursor-not-allowed">
            <Phone className="h-4 w-4 text-[#22C55E]" />
            <span className="text-sm text-[#A0A0A0]">WhatsApp</span>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
