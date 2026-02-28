import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, projects, notes } from '@/lib/db/schema';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { formatDate } from '@/lib/utils';

const VAULT_PATH = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'OpsOS');

function toFrontmatter(obj: Record<string, unknown>): string {
  const lines = Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${(v as string[]).join(', ')}]`;
      if (typeof v === 'string') return `${k}: "${v}"`;
      return `${k}: ${String(v)}`;
    });
  return `---\n${lines.join('\n')}\n---\n`;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function POST() {
  try {
    let exported = 0;

    const allTasks = await db.select().from(tasks);
    for (const task of allTasks) {
      const dir = join(VAULT_PATH, task.workspaceId, 'tasks');
      await mkdir(dir, { recursive: true });
      const frontmatter = toFrontmatter({
        id: task.id,
        type: 'task',
        workspace: task.workspaceId,
        title: task.title,
        status: task.status,
        assignee: task.assignee,
        due_date: task.dueDate ? formatDate(task.dueDate, 'yyyy-MM-dd') : null,
        tags: task.tags,
        notion_id: task.notionId,
        created: task.createdAt?.toISOString(),
        updated: task.updatedAt?.toISOString(),
      });
      const content = `${frontmatter}\n# ${task.title}\n\n${task.description ?? ''}`;
      await writeFile(join(dir, `${slugify(task.title)}.md`), content, 'utf-8');
      exported++;
    }

    const allProjects = await db.select().from(projects);
    for (const project of allProjects) {
      const dir = join(VAULT_PATH, project.workspaceId, 'projects');
      await mkdir(dir, { recursive: true });
      const frontmatter = toFrontmatter({
        id: project.id,
        type: 'project',
        workspace: project.workspaceId,
        title: project.name,
        status: project.status,
        created: project.createdAt?.toISOString(),
        updated: project.updatedAt?.toISOString(),
      });
      const content = `${frontmatter}\n# ${project.name}\n\n${project.description ?? ''}`;
      await writeFile(join(dir, `${slugify(project.name)}.md`), content, 'utf-8');
      exported++;
    }

    const allNotes = await db.select().from(notes);
    for (const note of allNotes) {
      const dir = join(VAULT_PATH, note.workspaceId, 'notes');
      await mkdir(dir, { recursive: true });
      const frontmatter = toFrontmatter({
        id: note.id,
        type: 'note',
        workspace: note.workspaceId,
        title: note.title,
        pinned: note.pinned,
        created: note.createdAt?.toISOString(),
        updated: note.updatedAt?.toISOString(),
      });
      const content = `${frontmatter}\n# ${note.title}\n\n${note.content ?? ''}`;
      await writeFile(join(dir, `${slugify(note.title)}.md`), content, 'utf-8');
      exported++;
    }

    return NextResponse.json({ data: { exported, vaultPath: VAULT_PATH } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
