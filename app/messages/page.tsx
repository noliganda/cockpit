'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, AtSign, CheckSquare, RefreshCw, Paperclip,
  AlertCircle, Bell, Send, ArrowUpRight, Search, Pencil,
} from 'lucide-react';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';

// ─── types ────────────────────────────────────────────────────────────────────

type MessageType = 'message' | 'mention' | 'task_assigned' | 'task_updated' | 'file_shared' | 'deadline';

interface Message {
  id: string;
  workspaceId: string;
  type: MessageType;
  sender: string;
  senderInitials: string;
  senderColor: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
  relatedLabel?: string;
  relatedHref?: string;
}

// ─── mock data ────────────────────────────────────────────────────────────────

const MOCK_MESSAGES: Message[] = [
  // ── Byron Film ──
  {
    id: 'msg-1', workspaceId: 'byron-film', type: 'deadline',
    sender: 'System', senderInitials: 'SY', senderColor: '#EF4444',
    subject: 'Overdue: Pacific Wellness edit',
    body: 'The task "Edit reel for Pacific Wellness campaign" is overdue. It was due on 5 Mar. Please update the status or reschedule.',
    timestamp: '2026-02-25T08:00:00Z', read: false,
    relatedLabel: 'View task', relatedHref: '/tasks',
  },
  {
    id: 'msg-2', workspaceId: 'byron-film', type: 'mention',
    sender: 'Charlie', senderInitials: 'CH', senderColor: '#3B82F6',
    subject: 'Mentioned in Alpine Commercial',
    body: 'Can you check the drone footage in Raw Footage and confirm it\'s colour-graded and ready for the edit pass? Need to know by EOD.',
    timestamp: '2026-02-24T16:45:00Z', read: false,
    relatedLabel: 'Open task', relatedHref: '/tasks',
  },
  {
    id: 'msg-3', workspaceId: 'byron-film', type: 'message',
    sender: 'Tom Alcott', senderInitials: 'TA', senderColor: '#10B981',
    subject: 'Pacific Wellness — timeline update?',
    body: 'Hey, any update on the wellness edit? The client is asking for a delivery timeline. Can we confirm the final cut date by end of week?',
    timestamp: '2026-02-24T14:20:00Z', read: false,
    relatedLabel: 'View contact', relatedHref: '/crm',
  },
  {
    id: 'msg-4', workspaceId: 'byron-film', type: 'file_shared',
    sender: 'Charlie', senderInitials: 'CH', senderColor: '#3B82F6',
    subject: 'New file: alpine_v2_colour.mp4',
    body: 'alpine_v2_colour.mp4 (520 MB) was uploaded to Projects / Alpine Commercial / Edits. This is the colour-graded version for review.',
    timestamp: '2026-02-24T10:05:00Z', read: true,
    relatedLabel: 'Open in Documents', relatedHref: '/documents',
  },
  {
    id: 'msg-5', workspaceId: 'byron-film', type: 'task_assigned',
    sender: 'System', senderInitials: 'SY', senderColor: '#6B7280',
    subject: 'Task assigned: Drone footage review',
    body: '"Drone footage review — Sunrise sessions" has been assigned to you. Priority: High. Due date: 2 Mar 2026.',
    timestamp: '2026-02-23T11:00:00Z', read: true,
    relatedLabel: 'View task', relatedHref: '/tasks',
  },
  {
    id: 'msg-6', workspaceId: 'byron-film', type: 'message',
    sender: 'Sarah P.', senderInitials: 'SP', senderColor: '#8B5CF6',
    subject: 'Re: Pacific Wellness rough cut',
    body: 'Loved the rough cut! The opening drone shot is stunning. Just a few timing notes — the transition at 0:42 feels a bit abrupt. Can we smooth that out?',
    timestamp: '2026-02-22T17:30:00Z', read: true,
  },
  {
    id: 'msg-7', workspaceId: 'byron-film', type: 'task_updated',
    sender: 'System', senderInitials: 'SY', senderColor: '#6B7280',
    subject: 'Status update: Alpine locations',
    body: '"Scout locations for Alpine commercial" moved to Pre-Production. 3 locations confirmed: Mount Kosciuszko approach, Thredbo valley, and Charlotte Pass.',
    timestamp: '2026-02-21T09:15:00Z', read: true,
    relatedLabel: 'View task', relatedHref: '/tasks',
  },
  {
    id: 'msg-8', workspaceId: 'byron-film', type: 'deadline',
    sender: 'System', senderInitials: 'SY', senderColor: '#F59E0B',
    subject: 'Due in 5 days: Drone footage review',
    body: '"Drone footage review — Sunrise sessions" is due on 2 Mar 2026 (in 5 days). Current status: Review.',
    timestamp: '2026-02-20T08:00:00Z', read: true,
    relatedLabel: 'View task', relatedHref: '/tasks',
  },

  // ── KORUS ──
  {
    id: 'msg-9', workspaceId: 'korus', type: 'deadline',
    sender: 'System', senderInitials: 'SY', senderColor: '#F59E0B',
    subject: 'Due in 2 days: Apex Partners proposal',
    body: '"Apex Partners — proposal deck" is due on 3 Mar 2026. This is an urgent task. Current pipeline stage: Proposal.',
    timestamp: '2026-02-25T08:00:00Z', read: false,
    relatedLabel: 'View task', relatedHref: '/tasks',
  },
  {
    id: 'msg-10', workspaceId: 'korus', type: 'mention',
    sender: 'Charlie', senderInitials: 'CH', senderColor: '#3B82F6',
    subject: 'Mentioned in Apex Partners proposal',
    body: 'Can you add an ROI analysis section to the Apex Partners proposal? They specifically asked about expected return in the first 6 months.',
    timestamp: '2026-02-24T15:30:00Z', read: false,
    relatedLabel: 'Open task', relatedHref: '/tasks',
  },
  {
    id: 'msg-11', workspaceId: 'korus', type: 'message',
    sender: 'Marcus Webb', senderInitials: 'MW', senderColor: '#F59E0B',
    subject: 'Solaris Tech — contract terms',
    body: 'Contract looks good overall. Our legal team flagged clause 7.3 on IP ownership and clause 12.1 on termination notice period. Can we schedule a call?',
    timestamp: '2026-02-24T13:00:00Z', read: false,
    relatedLabel: 'View contact', relatedHref: '/crm',
  },
  {
    id: 'msg-12', workspaceId: 'korus', type: 'task_updated',
    sender: 'System', senderInitials: 'SY', senderColor: '#10B981',
    subject: 'Deal closed: BlueSky Ventures',
    body: '"BlueSky Ventures — onboarding" moved to Won. Total deal value: $28,500. Onboarding kickoff scheduled for 3 Mar 2026.',
    timestamp: '2026-02-23T16:00:00Z', read: true,
    relatedLabel: 'View task', relatedHref: '/tasks',
  },
  {
    id: 'msg-13', workspaceId: 'korus', type: 'file_shared',
    sender: 'Charlie', senderInitials: 'CH', senderColor: '#3B82F6',
    subject: 'Uploaded: zenflow_onboarding_proposal.pdf',
    body: 'zenflow_onboarding_proposal.pdf (3.1 MB) was uploaded to Proposals. This is the final version incorporating client feedback from the 20 Feb call.',
    timestamp: '2026-02-23T11:05:00Z', read: true,
    relatedLabel: 'Open in Documents', relatedHref: '/documents',
  },
  {
    id: 'msg-14', workspaceId: 'korus', type: 'task_assigned',
    sender: 'System', senderInitials: 'SY', senderColor: '#6B7280',
    subject: 'Task assigned: Meridian Group call',
    body: '"Meridian Group — initial call" has been assigned to you. Priority: Medium. Due date: 1 Mar 2026. This is an enterprise lead (50+ seats).',
    timestamp: '2026-02-22T10:00:00Z', read: true,
    relatedLabel: 'View task', relatedHref: '/tasks',
  },
  {
    id: 'msg-15', workspaceId: 'korus', type: 'message',
    sender: 'Elena Voss', senderInitials: 'EV', senderColor: '#EC4899',
    subject: 'Re: Redline Capital requirements',
    body: 'Thanks for the quick response. Our legal team has a few questions about clause 12 in the MSA. Also, can we include a performance SLA in the agreement?',
    timestamp: '2026-02-22T14:45:00Z', read: true,
    relatedLabel: 'View contact', relatedHref: '/crm',
  },
];

// ─── config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<MessageType, { icon: React.ElementType; color: string; label: string }> = {
  message:      { icon: MessageSquare, color: '#3B82F6', label: 'Message' },
  mention:      { icon: AtSign,        color: '#C8FF3D', label: 'Mention' },
  task_assigned:{ icon: CheckSquare,   color: '#F59E0B', label: 'Assigned' },
  task_updated: { icon: RefreshCw,     color: '#8B5CF6', label: 'Task Update' },
  file_shared:  { icon: Paperclip,     color: '#10B981', label: 'File' },
  deadline:     { icon: AlertCircle,   color: '#EF4444', label: 'Deadline' },
};

type FilterTab = 'all' | 'unread' | 'mentions' | 'notifications' | 'direct';

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);

  const allMsgs = useMemo(
    () => MOCK_MESSAGES.filter(m => m.workspaceId === workspace.id),
    [workspace.id],
  );

  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(allMsgs.filter(m => m.read).map(m => m.id)),
  );
  const [selected, setSelected] = useState<Message | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState('');

  const filtered = useMemo(() => {
    let msgs = allMsgs;
    if (filter === 'unread')        msgs = msgs.filter(m => !readIds.has(m.id));
    if (filter === 'mentions')      msgs = msgs.filter(m => m.type === 'mention');
    if (filter === 'notifications') msgs = msgs.filter(m => ['task_assigned', 'task_updated', 'file_shared', 'deadline'].includes(m.type));
    if (filter === 'direct')        msgs = msgs.filter(m => m.type === 'message');
    if (search.trim()) {
      const q = search.toLowerCase();
      msgs = msgs.filter(m =>
        m.subject.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q) ||
        m.sender.toLowerCase().includes(q),
      );
    }
    return msgs;
  }, [allMsgs, filter, search, readIds]);

  const unreadCount = useMemo(
    () => allMsgs.filter(m => !readIds.has(m.id)).length,
    [allMsgs, readIds],
  );

  function selectMessage(msg: Message) {
    setSelected(msg);
    setReadIds(prev => new Set([...prev, msg.id]));
    setReplyText('');
  }

  function markAllRead() {
    setReadIds(new Set(allMsgs.map(m => m.id)));
  }

  const TABS: { id: FilterTab; label: string }[] = [
    { id: 'all',           label: 'All' },
    { id: 'unread',        label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
    { id: 'direct',        label: 'Direct' },
    { id: 'mentions',      label: 'Mentions' },
    { id: 'notifications', label: 'Notifications' },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-6 py-4 border-b border-[#2A2A2A] shrink-0 flex items-center gap-4"
      >
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white leading-none">Messages</h1>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread · ` : ''}{workspace.name}
          </p>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search messages..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A]"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-[#A0A0A0] hover:text-white transition-colors px-3 py-1.5 border border-[#2A2A2A] rounded-lg hover:border-[#3A3A3A]"
            >
              Mark all read
            </button>
          )}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors text-black"
            style={{ background: accentColor }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Compose
          </button>
        </div>
      </motion.div>

      {/* ── Filter Tabs ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="px-6 border-b border-[#2A2A2A] shrink-0 flex gap-1"
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              filter === tab.id
                ? 'border-white text-white'
                : 'border-transparent text-[#6B7280] hover:text-[#A0A0A0]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* ── Two-panel body ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Message List ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="w-80 shrink-0 border-r border-[#2A2A2A] overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <Bell className="w-8 h-8 text-[#3A3A3A] mb-3" />
              <p className="text-sm text-[#6B7280]">No messages</p>
            </div>
          ) : (
            filtered.map((msg, i) => {
              const cfg = TYPE_CONFIG[msg.type];
              const Icon = cfg.icon;
              const isUnread = !readIds.has(msg.id);
              const isSelected = selected?.id === msg.id;

              return (
                <motion.button
                  key={msg.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  onClick={() => selectMessage(msg)}
                  className={`w-full text-left px-4 py-3.5 border-b border-[#1E1E1E] transition-colors relative ${
                    isSelected ? 'bg-[#2A2A2A]' : isUnread ? 'bg-[#1A1A1A]/80 hover:bg-[#1E1E1E]' : 'hover:bg-[#1A1A1A]'
                  }`}
                >
                  {/* Unread indicator */}
                  {isUnread && (
                    <span
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                      style={{ background: accentColor }}
                    />
                  )}

                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: `${msg.senderColor}30`, border: `1px solid ${msg.senderColor}40` }}
                    >
                      {msg.type === 'message' || msg.type === 'mention'
                        ? <span style={{ color: msg.senderColor }}>{msg.senderInitials}</span>
                        : <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-xs font-semibold truncate ${isUnread ? 'text-white' : 'text-[#A0A0A0]'}`}>
                          {msg.sender}
                        </span>
                        <span className="text-[10px] text-[#6B7280] shrink-0">{relativeTime(msg.timestamp)}</span>
                      </div>
                      <p className={`text-xs truncate mb-0.5 ${isUnread ? 'text-white' : 'text-[#A0A0A0]'}`}>
                        {msg.subject}
                      </p>
                      <p className="text-[11px] text-[#6B7280] truncate">{msg.body}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })
          )}
        </motion.div>

        {/* ── Detail Panel ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                {/* Message header */}
                <div className="px-6 py-5 border-b border-[#2A2A2A]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-white mb-1">{selected.subject}</h2>
                      <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                        <span>From <span className="text-[#A0A0A0]">{selected.sender}</span></span>
                        <span>·</span>
                        <span>{new Date(selected.timestamp).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                    </div>
                    {(() => {
                      const cfg = TYPE_CONFIG[selected.type];
                      return (
                        <span
                          className="shrink-0 text-[10px] px-2 py-1 rounded-full font-medium"
                          style={{ background: `${cfg.color}20`, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Message body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {/* Sender avatar + body */}
                  <div className="flex gap-4">
                    <div
                      className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: `${selected.senderColor}30`, color: selected.senderColor }}
                    >
                      {selected.senderInitials}
                    </div>
                    <div className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                      <p className="text-sm text-white leading-relaxed">{selected.body}</p>

                      {/* Related link */}
                      {selected.relatedLabel && selected.relatedHref && (
                        <a
                          href={selected.relatedHref}
                          className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
                          style={{
                            color: accentColor,
                            borderColor: `${accentColor}30`,
                            background: `${accentColor}10`,
                          }}
                        >
                          {selected.relatedLabel}
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reply bar */}
                {selected.type === 'message' || selected.type === 'mention' ? (
                  <div className="px-6 py-4 border-t border-[#2A2A2A]">
                    <div className="flex gap-3 items-end">
                      <div className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 focus-within:border-[#3A3A3A] transition-colors">
                        <textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          rows={2}
                          className="w-full bg-transparent text-sm text-white placeholder:text-[#6B7280] resize-none focus:outline-none"
                        />
                      </div>
                      <button
                        disabled={!replyText.trim()}
                        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-30"
                        style={{ background: accentColor }}
                      >
                        <Send className="w-4 h-4 text-black" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-center px-8"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-[#3A3A3A]" />
                </div>
                <p className="text-sm font-medium text-[#6B7280]">Select a message</p>
                <p className="text-xs text-[#4A4A4A] mt-1">Choose a conversation from the list</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
