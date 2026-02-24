'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Mail, Phone, Globe, MapPin, Tag, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useWorkspace } from '@/hooks/use-workspace';
import { MOCK_CONTACTS } from '@/lib/data';
import { KORUS_STATUSES, BYRON_FILM_STATUSES } from '@/types';

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

export default function CRMPage() {
  const { workspace } = useWorkspace();
  const accentColor = workspace.slug === 'korus' ? '#3B82F6' : '#C8FF3D';
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [view, setView] = useState<'list' | 'pipeline'>('list');

  const allContacts = MOCK_CONTACTS.filter(c => c.workspaceId === workspace.id);
  const stages = workspace.slug === 'korus' ? KORUS_STATUSES : BYRON_FILM_STATUSES;

  const filteredContacts = useMemo(() => {
    return allContacts.filter(c => {
      const matchSearch = !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.company?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase());
      const matchStage = filterStage === 'all' || c.pipelineStage === filterStage;
      return matchSearch && matchStage;
    });
  }, [allContacts, search, filterStage]);

  return (
    <div className="p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-xl font-bold text-white">CRM</h1>
          <p className="text-sm text-[#A0A0A0] mt-0.5">{allContacts.length} contacts · {workspace.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${view === 'list' ? 'text-white bg-[#2A2A2A]' : 'text-[#A0A0A0] hover:text-white'}`}
          >
            List
          </button>
          <button
            onClick={() => setView('pipeline')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${view === 'pipeline' ? 'text-white bg-[#2A2A2A]' : 'text-[#A0A0A0] hover:text-white'}`}
          >
            Pipeline
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex items-center gap-3 mb-5"
      >
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3A3A3A] transition-colors"
          />
        </div>
        <select
          value={filterStage}
          onChange={e => setFilterStage(e.target.value)}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-[#A0A0A0] focus:outline-none focus:border-[#3A3A3A] transition-colors"
        >
          <option value="all">All Stages</option>
          {stages.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </motion.div>

      {view === 'list' ? (
        /* List view */
        <div className="space-y-2">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-[#A0A0A0]">
              <p className="text-sm">No contacts found</p>
            </div>
          ) : (
            filteredContacts.map((contact, i) => {
              const stageColor = STAGE_COLORS[contact.pipelineStage ?? ''] ?? '#6B7280';
              return (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                >
                  <Link href={`/crm/${contact.id}`}>
                    <div className="flex items-center gap-4 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-[#3A3A3A] transition-colors group">
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: `${accentColor}20`, color: accentColor }}
                      >
                        {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{contact.name}</span>
                          {contact.pipelineStage && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                              style={{ background: `${stageColor}20`, color: stageColor }}
                            >
                              {contact.pipelineStage.replace('-', ' ')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#A0A0A0] mt-0.5">
                          {contact.role && <span>{contact.role}</span>}
                          {contact.role && contact.company && <span className="mx-1">·</span>}
                          {contact.company && <span>{contact.company}</span>}
                        </div>
                      </div>

                      {/* Contact details */}
                      <div className="hidden md:flex items-center gap-4 shrink-0">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-[#A0A0A0] hover:text-white transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span className="hidden lg:block">{contact.email}</span>
                          </a>
                        )}
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-[#A0A0A0] hover:text-white transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span className="hidden lg:block">{contact.phone}</span>
                          </a>
                        )}
                        {contact.website && (
                          <a
                            href={contact.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-[#A0A0A0] hover:text-white transition-colors"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {contact.lastContact && (
                        <span className="hidden xl:block text-xs text-[#6B7280] shrink-0">
                          Last: {contact.lastContact}
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })
          )}
        </div>
      ) : (
        /* Pipeline kanban view */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage, colIdx) => {
            const stageContacts = filteredContacts.filter(c => c.pipelineStage === stage.id);
            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: colIdx * 0.04 }}
                className="flex-shrink-0 w-[240px]"
              >
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-xs font-semibold text-white">{stage.name}</span>
                  <span className="text-xs text-[#A0A0A0] bg-[#2A2A2A] px-1.5 py-0.5 rounded-full">
                    {stageContacts.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {stageContacts.map(contact => (
                    <Link key={contact.id} href={`/crm/${contact.id}`}>
                      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 hover:border-[#3A3A3A] transition-colors cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: `${accentColor}20`, color: accentColor }}
                          >
                            {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="text-sm font-medium text-white truncate">{contact.name}</span>
                        </div>
                        {contact.company && (
                          <p className="text-xs text-[#A0A0A0]">{contact.company}</p>
                        )}
                        {contact.email && (
                          <p className="text-xs text-[#6B7280] truncate mt-1">{contact.email}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
