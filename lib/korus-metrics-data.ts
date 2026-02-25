// KORUS APAC Metrics — updated by nightly cron
// Last manual update: 2026-02-25

export const KORUS_APAC_LAST_UPDATED = '2026-02-25T23:55:00+11:00';

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
  translated: 4,
  translatedDetail: 'K n Finance shareholders list (FR→EN), EDF bill (FR→EN), previous: org chart, certificates',
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
  { name: 'Dashboard', detail: 'dashboard.oliviermarcolin.com — Bruno metrics live', status: 'Live' },
  { name: 'Recruitment Engine', detail: 'LinkedIn Sales Nav + Apollo + follow-up cron', status: 'Active' },
  { name: 'CRM Pipeline', detail: 'Notion DB with Stage tracking', status: 'Configured' },
  { name: 'Notion Workspace', detail: 'Tasks, Projects, Sprints', status: 'Active' },
];

// ─── Activity Timeline ─────────────────────────────────────────────────────

export interface TimelineEvent {
  date: string;
  description: string;
}

export const KORUS_APAC_TIMELINE: TimelineEvent[] = [
  { date: 'Feb 25', description: 'Dashboard strategic reset — focused on real data for Bruno view' },
  { date: 'Feb 25', description: 'KORUS documents translated (K n Finance shareholders list + EDF bill FR→EN)' },
  { date: 'Feb 25', description: 'Recruitment follow-up engine deployed — daily 9am cron with 3-day nudges' },
  { date: 'Feb 25', description: 'Daily rhythm time-blocked — KORUS gets 3pm-6pm window' },
  { date: 'Feb 25', description: 'Richard Salloum (Schneider) + Joel (entity) recurring reminders active' },
  { date: 'Feb 25', description: 'LinkedIn Sales Navigator activated — 16 candidates contacted via InMail' },
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
