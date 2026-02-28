'use client';

import { useEffect, useState, use } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Contact, ActivityLog } from '@/types';
import { WORKSPACES } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  Mail, Phone, Globe, Building2, ArrowLeft, User, Clock,
  CheckSquare, Tag,
} from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  created: '#22C55E',
  updated: '#3B82F6',
  deleted: '#EF4444',
  synced: '#8B5CF6',
  exported: '#F59E0B',
};

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [cr, ar] = await Promise.all([
        fetch(`/api/contacts/${id}`).then((r) => r.json()),
        fetch(`/api/activity?entityType=contact&entityId=${id}`).then((r) => r.json()),
      ]);
      if (cr.data) setContact(cr.data);
      if (ar.data) setActivity(ar.data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-[#6B7280]">Loading...</div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-[#6B7280]">Contact not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/crm')}>
          Back to CRM
        </Button>
      </div>
    );
  }

  const ws = WORKSPACES.find((w) => w.id === contact.workspaceId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push('/crm')} className="text-[#A0A0A0] -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          CRM
        </Button>
      </motion.div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
        <div className="flex items-start gap-4">
          <div
            className="h-14 w-14 rounded-xl flex items-center justify-center text-xl font-bold shrink-0"
            style={{ backgroundColor: (ws?.color ?? '#6B7280') + '33', color: ws?.color ?? '#6B7280' }}
          >
            {contact.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">{contact.name}</h1>
            {contact.role && <p className="text-sm text-[#A0A0A0] mt-0.5">{contact.role}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {ws && (
                <Badge style={{ backgroundColor: ws.color + '22', color: ws.color, border: `1px solid ${ws.color}44` }}>
                  {ws.icon} {ws.name}
                </Badge>
              )}
              {contact.pipelineStage && (
                <Badge>{contact.pipelineStage}</Badge>
              )}
              {(contact.tags ?? []).map((tag) => (
                <Badge key={tag} className="text-[10px]">
                  <Tag className="h-2.5 w-2.5 mr-1" />{tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="lg:col-span-1 space-y-4"
        >
          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-medium text-white flex items-center gap-2">
              <User className="h-4 w-4 text-[#6B7280]" />
              Contact Info
            </h2>
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#6B7280] shrink-0" />
                <a href={`mailto:${contact.email}`} className="text-sm text-[#3B82F6] hover:underline truncate">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#6B7280] shrink-0" />
                <a href={`tel:${contact.phone}`} className="text-sm text-[#A0A0A0] hover:text-white">
                  {contact.phone}
                </a>
              </div>
            )}
            {contact.company && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#6B7280] shrink-0" />
                <span className="text-sm text-[#A0A0A0]">{contact.company}</span>
              </div>
            )}
            {contact.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#6B7280] shrink-0" />
                <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[#3B82F6] hover:underline truncate">
                  {contact.website}
                </a>
              </div>
            )}
            {contact.address && (
              <div className="text-sm text-[#A0A0A0] pl-6">{contact.address}</div>
            )}
            <div className="border-t border-[#2A2A2A] pt-3 space-y-1">
              <p className="text-xs text-[#6B7280]">Added {formatDate(contact.createdAt)}</p>
              <p className="text-xs text-[#6B7280]">Updated {formatDate(contact.updatedAt)}</p>
            </div>
          </Card>

          {contact.notes && (
            <Card className="p-4">
              <h2 className="text-sm font-medium text-white mb-2">Notes</h2>
              <p className="text-sm text-[#A0A0A0] whitespace-pre-wrap">{contact.notes}</p>
            </Card>
          )}
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="lg:col-span-2"
        >
          <Card className="p-4">
            <h2 className="text-sm font-medium text-white flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-[#6B7280]" />
              Interaction History
              <span className="text-xs text-[#6B7280] ml-1">({activity.length})</span>
            </h2>
            {activity.length === 0 ? (
              <div className="py-8 text-center">
                <CheckSquare className="h-8 w-8 text-[#2A2A2A] mx-auto mb-2" />
                <p className="text-sm text-[#6B7280]">No activity recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activity.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div
                      className="mt-1 h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: ACTION_COLORS[log.action] ?? '#6B7280' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white">
                        <span className="capitalize">{log.actor}</span>{' '}
                        <span className="text-[#A0A0A0]">{log.action}</span>{' '}
                        <span className="font-medium">{log.entityTitle}</span>
                      </p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{formatDate(log.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
