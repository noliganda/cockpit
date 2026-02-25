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
  { id: 'task-bf-hire-stripe', workspaceId: 'byron-film', projectId: 'proj-bf-hire', title: 'Stripe integration for hire.byronfilm.com', status: 'in-progress', priority: 'high', tags: ['dev'] },
  { id: 'task-bf-vimeo-dl', workspaceId: 'byron-film', projectId: 'proj-bf-vimeo', title: 'Download remaining Vimeo videos & upload to YouTube', status: 'in-progress', priority: 'medium', tags: ['migration'] },
  { id: 'task-bf-crm-audit', workspaceId: 'byron-film', title: 'CRM audit — clean up contacts & pipeline', status: 'todo', priority: 'medium', tags: ['ops'] },

  // KORUS tasks
  { id: 'task-ko-pm-search', workspaceId: 'korus', projectId: 'proj-ko-recruit', title: 'PM recruitment — LinkedIn outreach round 2', status: 'in-progress', priority: 'high', tags: ['recruitment'] },
  { id: 'task-ko-bizplan-fin', workspaceId: 'korus', projectId: 'proj-ko-bizplan', title: 'Finalize KORUS AU business plan', status: 'in-progress', priority: 'urgent', tags: ['strategy'] },
  { id: 'task-ko-bruno', workspaceId: 'korus', title: 'Reply to Bruno LEAL DE SOUSA — dashboard access', status: 'todo', priority: 'medium', tags: ['comms'] },
  { id: 'task-ko-sky', workspaceId: 'korus', title: 'Reply to Sky Ong — presentation deck acknowledgment', status: 'todo', priority: 'medium', tags: ['comms'] },
  { id: 'task-ko-bas', workspaceId: 'korus', title: 'Bas de Lange — Teams meeting invite', status: 'todo', priority: 'medium', tags: ['comms'] },
  { id: 'task-ko-email-sig', workspaceId: 'korus', title: 'Fix KORUS email signature', status: 'in-progress', priority: 'low', tags: ['ops'] },
  { id: 'task-ko-thomas', workspaceId: 'korus', projectId: 'proj-ko-recruit', title: 'Thomas Choulot — contract termination', status: 'todo', priority: 'high', tags: ['recruitment', 'legal'] },
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

export async function GET() {
  return NextResponse.json({
    projects: SEED_PROJECTS,
    tasks: tasksWithTimestamps,
    organisations: SEED_ORGANISATIONS,
    _meta: {
      generated: now,
      note: 'Import this data via Settings → Developer → Seed Data',
    },
  });
}
