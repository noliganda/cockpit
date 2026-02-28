import { db } from './db';
import { activityLog } from './db/schema';
import type { ActivityLogParams } from '@/types';

export async function logActivity(params: ActivityLogParams): Promise<void> {
  try {
    await db.insert(activityLog).values({
      workspaceId: params.workspaceId,
      actor: params.actor,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      entityTitle: params.entityTitle,
      metadata: params.metadata ?? null,
    });
  } catch (error) {
    // Log but don't throw — activity logging is non-critical
    console.error('Failed to log activity:', error);
  }
}
