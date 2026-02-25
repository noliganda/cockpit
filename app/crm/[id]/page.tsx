'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Phone, Globe, MapPin, Tag, ExternalLink, Building2, User, Calendar } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import { useWorkspace } from '@/hooks/use-workspace';
import { useContactStore } from '@/stores/contact-store';

const STAGE_COLORS: Record<string, string> = {
  lead: '#6B7280',
  qualification: '#8B5CF6',
  proposal: '#F59E0B',
  negotiation: '#3B82F6',
  won: '#10B981',
  lost: '#EF4444',
  'on-hold': '#EC4899',
  active: '#10B981',
};

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { workspace } = useWorkspace();
  const accentColor = workspace.slug === 'korus' ? '#3B82F6' : '#C8FF3D';
  const { getContactById } = useContactStore();

  const contact = getContactById(id);

  if (!contact) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <p className="text-[#A0A0A0] text-sm mb-3">Contact not found</p>
          <Link
            href="/crm"
            className="text-xs font-medium inline-flex items-center gap-1 hover:opacity-80"
            style={{ color: accentColor }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to CRM
          </Link>
        </div>
      </div>
    );
  }

  const stageColor = STAGE_COLORS[contact.pipelineStage ?? ''] ?? '#6B7280';
  const initials = contact.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const mapsUrl = contact.address
    ? `https://www.google.com/maps?q=${encodeURIComponent(contact.address)}`
    : null;

  return (
    <div className="p-6 max-w-3xl">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/crm"
          className="inline-flex items-center gap-1.5 text-xs text-[#A0A0A0] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All Contacts
        </Link>

        {/* Contact header */}
        <div className="flex items-start gap-5 mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: `${accentColor}20`, color: accentColor }}
          >
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{contact.name}</h1>
              {contact.pipelineStage && (
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium capitalize"
                  style={{ background: `${stageColor}20`, color: stageColor }}
                >
                  {contact.pipelineStage.replace('-', ' ')}
                </span>
              )}
            </div>
            {(contact.role || contact.company) && (
              <p className="text-[#A0A0A0] text-sm mt-1">
                {contact.role}
                {contact.role && contact.company && ' · '}
                {contact.company}
              </p>
            )}
            {contact.lastContact && (
              <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Last contact: {contact.lastContact}
              </p>
            )}
          </div>
        </div>

        {/* Contact details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {contact.email && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-2">Email</p>
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-sm text-white hover:opacity-80 transition-opacity"
              >
                <Mail className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                {contact.email}
              </a>
            </div>
          )}

          {contact.phone && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-2">Phone</p>
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-2 text-sm text-white hover:opacity-80 transition-opacity"
              >
                <Phone className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                {contact.phone}
              </a>
            </div>
          )}

          {contact.website && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-2">Website</p>
              <a
                href={contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-white hover:opacity-80 transition-opacity"
              >
                <Globe className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                {contact.website.replace(/^https?:\/\//, '')}
                <ExternalLink className="w-3 h-3 text-[#6B7280] ml-auto" />
              </a>
            </div>
          )}

          {contact.address && mapsUrl && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-2">Address</p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-sm text-white hover:opacity-80 transition-opacity"
              >
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accentColor }} />
                <span>{contact.address}</span>
                <ExternalLink className="w-3 h-3 text-[#6B7280] ml-auto shrink-0 mt-0.5" />
              </a>
            </div>
          )}

          {contact.company && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-2">Company</p>
              <div className="flex items-center gap-2 text-sm text-white">
                <Building2 className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                {contact.company}
              </div>
            </div>
          )}

          {contact.role && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-2">Role</p>
              <div className="flex items-center gap-2 text-sm text-white">
                <User className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                {contact.role}
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 mb-6">
            <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-3">Tags</p>
            <div className="flex flex-wrap gap-2">
              {contact.tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[#2A2A2A] text-[#A0A0A0]"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {contact.notes && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-3">Notes</p>
            <p className="text-sm text-[#A0A0A0] leading-relaxed">{contact.notes}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
