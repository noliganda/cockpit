// ─── lib/data.ts ───────────────────────────────────────────────────────────
// Mock data removed. All data now lives in stores (localStorage).
// This file kept for any shared constants or seed helpers.

import { Area } from '@/types';

// Empty defaults — stores handle their own state
export const MOCK_AREAS: Area[] = [];
export const MOCK_TASKS: never[] = [];
export const MOCK_PROJECTS: never[] = [];
export const MOCK_CONTACTS: never[] = [];
export const MOCK_FILES: never[] = [];
export const KORUS_METRICS = {
  revenue: { current: 0, previous: 0, target: 0 },
  leads: { active: 0, qualified: 0, newThisMonth: 0 },
  wonDeals: { count: 0, value: 0 },
  pipeline: { total: 0, weighted: 0 },
};
