# SPEC: Built-in Tables (Bases v2)

## Overview
Replace the NocoDB-dependent Bases page with a native, built-in table/spreadsheet feature.
Data lives in Neon (same DB as everything else). No Docker, no tunnels, no external tools.

## Architecture

### New DB Tables (Drizzle schema in `lib/db/schema.ts`)

```sql
-- A "base" is a collection of tables (like a spreadsheet workbook)
user_bases (
  id UUID PK DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  workspace TEXT NOT NULL DEFAULT 'personal', -- 'byron_film' | 'korus' | 'personal'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- A table within a base
user_tables (
  id UUID PK DEFAULT gen_random_uuid(),
  base_id UUID FK -> user_bases.id ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Column definitions for a table
user_columns (
  id UUID PK DEFAULT gen_random_uuid(),
  table_id UUID FK -> user_tables.id ON DELETE CASCADE,
  name TEXT NOT NULL,
  column_type TEXT NOT NULL DEFAULT 'text', -- text | number | date | boolean | select | url | email
  options JSONB, -- for select: { choices: ["A","B","C"] }
  order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Row data stored as JSONB (flexible schema, no migrations needed per-table)
user_rows (
  id UUID PK DEFAULT gen_random_uuid(),
  table_id UUID FK -> user_tables.id ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}', -- keys = column IDs, values = cell data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

### API Routes (`/api/tables/*`)

```
GET    /api/tables/bases              — list all bases
POST   /api/tables/bases              — create base
GET    /api/tables/bases/:id          — get base with its tables
PATCH  /api/tables/bases/:id          — update base
DELETE /api/tables/bases/:id          — delete base

GET    /api/tables/:baseId/tables          — list tables in base
POST   /api/tables/:baseId/tables          — create table
GET    /api/tables/:baseId/tables/:id      — get table with columns
PATCH  /api/tables/:baseId/tables/:id      — update table
DELETE /api/tables/:baseId/tables/:id      — delete table

GET    /api/tables/:tableId/columns        — list columns
POST   /api/tables/:tableId/columns        — create column
PATCH  /api/tables/:tableId/columns/:id    — update column
DELETE /api/tables/:tableId/columns/:id    — delete column

GET    /api/tables/:tableId/rows           — list rows (paginated, sortable, filterable)
POST   /api/tables/:tableId/rows           — create row
PATCH  /api/tables/:tableId/rows/:id       — update row
DELETE /api/tables/:tableId/rows/:id       — delete row

GET    /api/tables/:tableId/export/:format — export as csv | json | md
```

### UI Pages

**`/bases`** — Base browser
- Grid of bases with workspace color coding
- Create new base button
- Click base → see its tables

**`/bases/:baseId`** — Table list within a base
- List of tables
- Create new table button
- Click table → open editor

**`/bases/:baseId/:tableId`** — Table editor (the main UI)
- TanStack Table powered grid
- Inline cell editing (click to edit)
- Column header: sort, filter, hide
- Add row button (bottom)
- Add column button (right)
- Column type selector when creating/editing columns
- Row selection with checkboxes
- Batch delete selected rows
- CSV/MD/JSON export buttons
- Search/filter bar
- Pagination

## Design System

Follow `.interface-design/system.md` exactly:
- Dark neutral surfaces (#0F0F0F → #141414 → #1A1A1A)
- Workspace accent colors: Byron Film #D4A017, KORUS #008080, Personal #F97316
- Data table patterns: tertiary uppercase headers, subtle row borders, hover states
- Geist Mono for data cells, Geist Sans for labels
- Inline editing matching existing input patterns (bg-inset, border-stronger on focus)
- Mobile: card layout, not horizontal scroll

## Key Design Choices

1. **JSONB rows** — users create any schema without DB migrations
2. **.md export with YAML frontmatter** — parseable, Obsidian-compatible, searchable
3. **Every row change feeds into the embedding pipeline** → semantic search across all table data (Phase 2)
4. **MCP server** gives AI tools full programmatic access (Phase 2)

## Implementation Steps

1. Schema + Drizzle migration (`lib/db/schema.ts` + `drizzle/migrations/`)
2. API routes (CRUD for all entities)
3. Export endpoints (csv, json, md)
4. Base browser UI (`/bases` page)
5. Table editor UI (TanStack Table grid with inline editing)
6. Search integration (Phase 2)
7. MCP server (Phase 2)

## Constraints

- Do NOT break existing pages (tasks, CRM, notes, productivity, etc.)
- Do NOT modify existing DB tables
- Use existing auth system (getSession check on all API routes)
- Use existing design patterns from the codebase
- Keep it simple — this replaces a failed NocoDB integration, robustness > features
- Test that `npm run build` passes before committing
