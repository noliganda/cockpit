import { NextResponse } from 'next/server';

// Seed data for initial dashboard population
// This endpoint returns JSON that the client can use to populate localStorage stores
// Hit GET /api/seed to get the data, then import via Settings page

const now = new Date().toISOString();
const today = now.split('T')[0];

const SEED_PROJECTS = [
  // Byron Film
  { id: 'proj-bf-endota', workspaceId: 'byron-film', name: 'Endota Spa Campaign', description: 'Ongoing brand content for Endota Spa', status: 'active', startDate: '2025-11-01', endDate: '2026-06-30' },
  { id: 'proj-bf-sa', workspaceId: 'byron-film', name: 'Strange Attractor', description: 'Music documentary series', status: 'active', startDate: '2025-09-01' },
  { id: 'proj-bf-nce', workspaceId: 'byron-film', name: 'North Coast Events — Studio', description: 'Plug-and-play YouTube studio rental service', status: 'active', startDate: '2026-01-15' },
  { id: 'proj-bf-hire', workspaceId: 'byron-film', name: 'hire.byronfilm.com', description: 'Gear hire e-commerce site', status: 'active', startDate: '2026-02-01' },
  { id: 'proj-bf-website', workspaceId: 'byron-film', name: 'Byron Film Website', description: 'Webflow site maintenance & improvements', status: 'active' },
  { id: 'proj-bf-vimeo', workspaceId: 'byron-film', name: 'Vimeo → YouTube Migration', description: 'Transfer all Vimeo content to YouTube', status: 'active', startDate: '2026-02-11' },
  { id: 'proj-bf-content', workspaceId: 'byron-film', name: 'Content Engine', description: '2026 content strategy — YT, IG, newsletter', status: 'active', startDate: '2026-02-12' },

  // KORUS
  { id: 'proj-ko-au', workspaceId: 'korus', name: 'KORUS AU Setup', description: 'Australian branch establishment', status: 'active', startDate: '2026-01-01' },
  { id: 'proj-ko-recruit', workspaceId: 'korus', name: 'KORUS Recruitment', description: 'PM and senior designer hiring — AU', status: 'active', startDate: '2026-02-01' },
  { id: 'proj-ko-bizplan', workspaceId: 'korus', name: 'KORUS AU Business Plan', description: 'Full business plan for AU operations', status: 'active', startDate: '2026-02-15' },
  { id: 'proj-ko-sg', workspaceId: 'korus', name: 'KORUS Singapore', description: 'Singapore operations & CBRE registration', status: 'active' },

  // Personal
  { id: 'proj-p-dashboard', workspaceId: 'personal', name: 'Ops Dashboard — Bugs & Features', description: 'Track all dashboard bugs, features, and integration work', status: 'active', startDate: today },
  { id: 'proj-p-house', workspaceId: 'personal', name: 'House Build', description: 'New home construction project', status: 'active' },
  { id: 'proj-p-om', workspaceId: 'personal', name: 'oliviermarcolin.com', description: 'Personal brand website', status: 'active', startDate: '2026-02-20' },
];

const SEED_TASKS = [
  // ── Ops Dashboard — Bugs & Features ──
  // Integrations (must do first)
  { id: 'task-dash-gmail', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Google Workspace OAuth — expand scopes (Gmail, Calendar, Drive)', status: 'todo', priority: 'urgent', tags: ['integration'], description: 'Current OAuth only requests profile/email. Need Gmail read, Calendar read/write, Drive read for documents page.' },
  { id: 'task-dash-gmail-triage', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Email triage on Morning Brief — pull from Gmail API', status: 'backlog', priority: 'high', tags: ['integration', 'brief'], description: 'Group by workspace: charlie@byronfilm.com (BF), KORUS email, hey@oliviermarcolin.com (Personal)' },
  { id: 'task-dash-calendar', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Google Calendar integration — Today\'s Agenda on Brief', status: 'backlog', priority: 'high', tags: ['integration', 'brief'], description: 'Pull events from both calendars, colour-code by workspace' },
  { id: 'task-dash-drive', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Google Drive + OneDrive on Documents page', status: 'backlog', priority: 'medium', tags: ['integration'] },
  { id: 'task-dash-whatsapp', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'WhatsApp integration — Messages page', status: 'backlog', priority: 'medium', tags: ['integration'] },
  { id: 'task-dash-xero', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Xero financial data on Costs/Metrics pages', status: 'todo', priority: 'high', tags: ['integration'], description: 'Token refreshed ✅. Build API routes for revenue, expenses, invoices, P&L.' },

  // Morning Brief
  { id: 'task-dash-weather', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Live weather & surf data on Morning Brief', status: 'backlog', priority: 'medium', tags: ['brief'], description: 'Open-Meteo for weather/UV/sunrise. Surf for South Golden Beach & Byron Bay.' },
  { id: 'task-dash-overnight', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Overnight work section on Morning Brief', status: 'backlog', priority: 'medium', tags: ['brief'] },
  { id: 'task-dash-yt-tldr', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'YouTube TLDRs on Morning Brief', status: 'backlog', priority: 'low', tags: ['brief'], description: 'Summaries from Charlie Channel — need playlist/channel ID from Oli' },
  { id: 'task-dash-rss', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'RSS/Content feed aggregator', status: 'backlog', priority: 'medium', tags: ['brief', 'feature'], description: 'Submit links via Telegram + dashboard. Daily review, weekly newsletter compilation with video script ideas.' },

  // Features
  { id: 'task-dash-customdb', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Custom databases (Airtable-lite)', status: 'backlog', priority: 'medium', tags: ['feature'], description: 'User-defined schemas with text/number/date/select/relation columns. Views, filters, sorts.' },
  { id: 'task-dash-blockeditor', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Rich block editor (Tiptap/BlockNote) for notes & pages', status: 'backlog', priority: 'medium', tags: ['feature'], description: 'Replace textarea with Notion-style block editor. Headings, toggles, callouts, embeds, tables.' },
  { id: 'task-dash-collab', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Collaborator invites — share projects/pages/databases', status: 'backlog', priority: 'medium', tags: ['feature'], description: 'Guest and collaborator roles. Per-project or per-page sharing.' },
  { id: 'task-dash-notion-import', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'One-time Notion data import', status: 'todo', priority: 'high', tags: ['migration'], description: 'Pull existing tasks, projects, contacts from Notion teamspaces into dashboard stores.' },
  { id: 'task-dash-persistence', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Move from localStorage to proper database', status: 'backlog', priority: 'high', tags: ['infra'], description: 'localStorage is fragile. Need Supabase/Postgres or at minimum API-backed JSON files.' },

  // Bugs
  { id: 'task-dash-lost-data', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'BUG: Lost all tasks/projects when mock data was removed', status: 'done', priority: 'urgent', tags: ['bug'], description: 'Fixed by creating seed data endpoint + re-population.' },
  { id: 'task-dash-task-status', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'BUG: Task statuses were using Byron Film pipeline stages', status: 'done', priority: 'high', tags: ['bug'], description: 'Fixed — tasks now use universal Backlog/To Do/In Progress/Review/Done.' },

  // Byron Film tasks
  { id: 'task-bf-leads', workspaceId: 'byron-film', projectId: 'proj-bf-content', title: 'Q1 content calendar — first 4 videos planned', status: 'todo', priority: 'high', tags: ['content'] },

  // KORUS tasks
  { id: 'task-ko-pm-search', workspaceId: 'korus', projectId: 'proj-ko-recruit', title: 'PM recruitment — LinkedIn outreach round 2', status: 'in-progress', priority: 'high', tags: ['recruitment', 'sprint-1'] },

  // More Dashboard features
  { id: 'task-dash-notes-global', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Notes attachable to projects, sprints, areas, AND tasks', status: 'backlog', priority: 'high', tags: ['feature'], description: 'Notes should not be project-only. Every entity (project, sprint, area, task) should support attached notes via the block editor. Think of it as a universal "attach a page" capability.' },
  { id: 'task-dash-tables-global', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Tables (custom databases) attachable to projects, sprints, areas, tasks', status: 'backlog', priority: 'high', tags: ['feature'], description: 'Custom tables/databases should be embeddable anywhere — inside a project, a sprint, an area, or even a task. Like Notion inline databases. User defines columns, rows are editable inline.' },
  { id: 'task-dash-tables-standalone', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Standalone Tables page — create & manage custom databases', status: 'backlog', priority: 'medium', tags: ['feature'], description: 'Top-level /tables page to create, browse, and manage all custom databases. Each table has its own schema (text, number, date/select/relation/URL columns). Filterable, sortable, groupable views.' },

  // ── SPRINT 1: Close the Loops ──────────────────────────────────

  // 🔴 Infrastructure
  { id: 'task-infra-tailscale', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Fix Tailscale → Gateway binding for remote TUI access', status: 'todo', priority: 'urgent', tags: ['infra', 'sprint-1'], description: 'Gateway bound to loopback (127.0.0.1). Need to switch to tailnet so Oli can access web UI remotely. Last attempt crashed gateway (Feb 12). Must do carefully with Oli present.' },
  { id: 'task-infra-vps', workspaceId: 'personal', title: 'Get SSH/RDP access to Microsoft VPS for MT5 monitoring', status: 'todo', priority: 'high', tags: ['infra', 'sprint-1'], description: 'VPS at 38.108.112.102:2978. MT5 running. Need to deploy Python monitor script + set up remote access for Charlie to check trades.' },
  { id: 'task-infra-mt5-monitor', workspaceId: 'personal', title: 'Deploy MT5 Python monitor on VPS', status: 'backlog', priority: 'high', tags: ['infra', 'trading', 'sprint-1'], description: 'Python script to monitor open positions, P&L, and alert via Telegram. Depends on VPS access.' },
  { id: 'task-infra-notion-token', workspaceId: 'personal', projectId: 'proj-p-dashboard', title: 'Re-auth Notion API token (expired 401)', status: 'todo', priority: 'high', tags: ['infra', 'sprint-1'], description: 'Notion integration token expired. Re-auth at notion.so/my-integrations. Needed for any Notion API work.' },
  { id: 'task-infra-anthropic-billing', workspaceId: 'personal', title: 'Update Anthropic billing — card needs updating', status: 'todo', priority: 'urgent', tags: ['infra', 'sprint-1'], description: 'Payment failed. Need to update card on console.anthropic.com. Without this, API access will be cut off.' },

  // 🟠 KORUS comms (all sprint-1)
  { id: 'task-ko-bruno-s1', workspaceId: 'korus', title: 'Reply to Bruno LEAL DE SOUSA — dashboard password issue', status: 'todo', priority: 'high', tags: ['comms', 'sprint-1'], description: 'Bruno cannot access the KORUS metrics dashboard. Needs password reset or new credentials.' },
  { id: 'task-ko-sky-s1', workspaceId: 'korus', title: 'Reply to Sky Ong — acknowledge presentation deck', status: 'todo', priority: 'medium', tags: ['comms', 'sprint-1'], description: 'Sky sent a deck. Need Oli to approve draft reply before sending.' },
  { id: 'task-ko-bas-s1', workspaceId: 'korus', title: 'Bas de Lange — send Teams meeting invite', status: 'todo', priority: 'medium', tags: ['comms', 'sprint-1'], description: 'Meeting agreed but no invite sent yet. Need to create Teams link and send.' },
  { id: 'task-ko-thomas-s1', workspaceId: 'korus', projectId: 'proj-ko-recruit', title: 'Thomas Choulot — contract termination letter', status: 'todo', priority: 'high', tags: ['recruitment', 'legal', 'sprint-1'], description: 'Draft and send termination. Need eSignatures template or formal letter.' },
  { id: 'task-ko-email-sig-s1', workspaceId: 'korus', title: 'Fix KORUS email signature — OWA panel issues', status: 'in-progress', priority: 'medium', tags: ['ops', 'sprint-1'] },
  { id: 'task-ko-bizplan-s1', workspaceId: 'korus', projectId: 'proj-ko-bizplan', title: 'Finalize KORUS AU business plan', status: 'in-progress', priority: 'urgent', tags: ['strategy', 'sprint-1'] },

  // 🟡 Byron Film (sprint-1)
  { id: 'task-bf-hire-stripe-s1', workspaceId: 'byron-film', projectId: 'proj-bf-hire', title: 'hire.byronfilm.com Phase 2 — Stripe + product photos', status: 'in-progress', priority: 'high', tags: ['dev', 'sprint-1'] },
  { id: 'task-bf-vimeo-s1', workspaceId: 'byron-film', projectId: 'proj-bf-vimeo', title: 'Complete Vimeo → YouTube migration', status: 'in-progress', priority: 'medium', tags: ['migration', 'sprint-1'] },
  { id: 'task-bf-crm-s1', workspaceId: 'byron-film', title: 'Byron Film CRM audit — clean contacts & pipeline', status: 'todo', priority: 'medium', tags: ['ops', 'sprint-1'] },

  // 🔵 Personal (sprint-1)
  { id: 'task-p-om-coming', workspaceId: 'personal', projectId: 'proj-p-om', title: 'Build oliviermarcolin.com coming soon page', status: 'todo', priority: 'low', tags: ['dev', 'sprint-1'] },

  // 🟣 Charlie Ops (sprint-1)
  { id: 'task-charlie-xero-skills', workspaceId: 'personal', title: 'Learn Xero properly — reconcile, invoice, create projects', status: 'todo', priority: 'high', tags: ['ops', 'sprint-1'], description: 'Master Xero API: transaction reconciliation, invoice creation, project management. Become the bookkeeper, not just a reporter.' },
  { id: 'task-charlie-email-triage', workspaceId: 'personal', title: 'Establish 3x daily email triage across all accounts', status: 'todo', priority: 'high', tags: ['ops', 'sprint-1'], description: 'charlie@byronfilm.com, olivier@byronfilm.com, hey@oliviermarcolin.com. Inbox zero, flag urgent, draft responses.' },
];

// Add timestamps to tasks
const tasksWithTimestamps = SEED_TASKS.map(t => ({
  ...t,
  tags: t.tags || [],
  createdAt: now,
  updatedAt: now,
}));

const SEED_ORGANISATIONS = [
  { id: 'org-endota', workspaceId: 'byron-film', name: 'Endota Spa', industry: 'Wellness & Beauty', website: 'https://endotaspa.com.au', tags: [], createdAt: now },
  { id: 'org-nce', workspaceId: 'byron-film', name: 'North Coast Events', industry: 'Events & Entertainment', tags: [], createdAt: now },
  { id: 'org-cbre', workspaceId: 'korus', name: 'CBRE', industry: 'Commercial Real Estate', website: 'https://cbre.com.sg', tags: [], createdAt: now },
  { id: 'org-korus-fr', workspaceId: 'korus', name: 'KORUS Group France', industry: 'Premium Fit-Out', website: 'https://korusgroup.com', tags: [], createdAt: now },
];

// Sprint 1 — all tasks tagged 'sprint-1'
const SEED_SPRINTS = [
  {
    id: 'sprint-1-close-loops',
    workspaceId: 'personal',
    name: 'Sprint 1 — Close the Loops',
    goal: 'Fix infrastructure, close all open comms, establish reliable ops foundation',
    startDate: today,
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], // 2 weeks
    status: 'active' as const,
    taskIds: SEED_TASKS.filter(t => t.tags?.includes('sprint-1')).map(t => t.id),
    createdAt: now,
  },
];

export async function GET() {
  return NextResponse.json({
    projects: SEED_PROJECTS,
    tasks: tasksWithTimestamps,
    organisations: SEED_ORGANISATIONS,
    sprints: SEED_SPRINTS,
    _meta: {
      generated: now,
      note: 'Import this data via Settings → Developer → Seed Data',
    },
  });
}
