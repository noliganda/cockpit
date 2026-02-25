// KORUS APAC Metrics — updated by nightly cron
// Last manual update: 2026-02-25

export const KORUS_APAC_LAST_UPDATED = '2026-02-25T00:00:00+11:00';

// ─── Recruitment Pipeline ──────────────────────────────────────────────────

export const KORUS_APAC_RECRUITMENT = {
  totalCandidatesSourced: 40,
  candidatesContacted: 16,
  awaitingResponse: 16,
  interviewsScheduled: 0,
  roles: ['Project Manager', 'Managing Director', 'Senior Designer'],
};

// ─── Outreach & Business Development ──────────────────────────────────────

export const KORUS_APAC_OUTREACH = {
  prospectCompaniesIdentified: 110,
  prospectCompaniesLabel: '110+',
  linkedinInMailsSent: 16,
  emailCampaignsActive: 0,
  keyTargets: [
    { company: 'Schneider Electric', contact: 'Richard Salloum' },
    { company: 'EGIS', contact: null },
    { company: 'Industrious', contact: 'Nick' },
  ],
};

// ─── Entity Setup ──────────────────────────────────────────────────────────

export type EntityStatus = 'Active' | 'In Progress' | 'Pending';

export interface EntityItem {
  label: string;
  status: EntityStatus;
  detail: string;
}

export const KORUS_APAC_ENTITIES: EntityItem[] = [
  { label: 'AU Entity Registration', status: 'In Progress', detail: 'Joel — corporate lawyer engaged' },
  { label: 'SG Entity', status: 'Active', detail: 'Korus Interiors Pte Ltd' },
  { label: 'FR HQ', status: 'Active', detail: 'KORUS Group SAS' },
];

// ─── Documents & Admin ─────────────────────────────────────────────────────

export const KORUS_APAC_DOCUMENTS = {
  translated: 2,
  translatedDetail: 'K n Finance shareholders list, EDF bill',
  businessPlan: 'Draft Complete' as const,
  financialModel: 'Complete' as const,
  competitorCaseStudies: 5,
};

// ─── Systems & Infrastructure ──────────────────────────────────────────────

export type SystemStatus = 'Active' | 'Live' | 'Configured';

export interface SystemItem {
  name: string;
  detail: string | null;
  status: SystemStatus;
}

export const KORUS_APAC_SYSTEMS: SystemItem[] = [
  { name: 'KORUS Email', detail: 'charlie.apac@korusgroup.com', status: 'Active' },
  { name: 'Dashboard', detail: 'dashboard.oliviermarcolin.com', status: 'Live' },
  { name: 'CRM Pipeline', detail: null, status: 'Configured' },
  { name: 'Notion Workspace', detail: 'Tasks, Projects, Sprints', status: 'Active' },
];

// ─── Activity Timeline ─────────────────────────────────────────────────────

export interface TimelineEvent {
  date: string;
  description: string;
}

export const KORUS_APAC_TIMELINE: TimelineEvent[] = [
  { date: 'Feb 25', description: '16 recruitment candidates contacted via LinkedIn Sales Navigator' },
  { date: 'Feb 24', description: 'Recruitment database enriched with Apollo (4 verified emails found)' },
  { date: 'Feb 24', description: 'LinkedIn outreach messages drafted for all candidates' },
  { date: 'Feb 22', description: 'KORUS AU business plan draft completed' },
  { date: 'Feb 20', description: 'Financial model built (3-year projection)' },
  { date: 'Feb 17', description: 'KORUS Notion workspace fully configured' },
  { date: 'Feb 15', description: 'charlie.apac@korusgroup.com email activated' },
  { date: 'Feb 12', description: 'KORUS APAC strategy session — 3-layer framework defined' },
  { date: 'Feb 10', description: '110+ prospect companies identified in AU market' },
  { date: 'Feb 4', description: 'Recruitment sourcing started — 40 candidates across PM/MD/Designer roles' },
];
