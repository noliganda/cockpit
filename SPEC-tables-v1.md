# Tables Feature — V1 Spec

> **Goal:** Replace NocoDB with a native, built-in table/database editor. Data lives in Neon, is .md-exportable, semantic-searchable, and fully accessible via API + MCP.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────┐
│              Dashboard UI                    │
│  (Table editor with TanStack Table + inline  │
│   editing, column config, sorting, filters)  │
└──────────────┬──────────────────────────────┘
               │ Next.js API Routes
┌──────────────▼──────────────────────────────┐
│           /api/tables/*                      │
│  CRUD for bases, tables, columns, rows       │
│  + .md export endpoint                       │
│  + semantic search endpoint                  │
└──────────────┬──────────────────────────────┘
               │ Drizzle ORM
┌──────────────▼──────────────────────────────┐
│           Neon PostgreSQL                    │
│  user_bases, user_tables, user_columns,      │
│  user_rows (JSONB data)                      │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│           MCP Server (Phase 2)               │
│  Thin JSON-RPC wrapper over /api/tables/*    │
│  → Claude Desktop, Cursor, any MCP client    │
└─────────────────────────────────────────────┘
```

---

## 2. Database Schema

We use a **dynamic schema** approach — user-defined tables are stored as metadata + JSONB rows. This lets users create any table structure without DB migrations.

```sql
-- A "base" is a collection of tables (like a NocoDB base or Airtable workspace)
CREATE TABLE user_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,          -- 'byron-film' | 'korus' | 'personal'
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Each table within a base
CREATE TABLE user_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id UUID NOT NULL REFERENCES user_bases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Column definitions (schema metadata)
CREATE TABLE user_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES user_tables(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL,  -- 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'url' | 'email' | 'longtext' | 'relation'
  options JSONB,             -- e.g. { "choices": ["Red","Blue"], "precision": 2, "relatedTableId": "..." }
  sort_order INTEGER DEFAULT 0,
  required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Actual data rows (JSONB for flexibility)
CREATE TABLE user_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES user_tables(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',     -- { "col_id_1": "value", "col_id_2": 42, ... }
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX user_rows_table_idx ON user_rows(table_id);
CREATE INDEX user_rows_data_gin ON user_rows USING GIN(data);  -- enables JSONB queries
CREATE INDEX user_tables_base_idx ON user_tables(base_id);
CREATE INDEX user_bases_workspace_idx ON user_bases(workspace_id);
```

### Drizzle Schema (lib/db/schema.ts additions)

```ts
export const userBases = pgTable('user_bases', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  ...timestamps,
}, (t) => [
  index('user_bases_workspace_idx').on(t.workspaceId),
])

export const userTables = pgTable('user_tables', {
  id: uuid('id').defaultRandom().primaryKey(),
  baseId: uuid('base_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0),
  ...timestamps,
}, (t) => [
  index('user_tables_base_idx').on(t.baseId),
])

export const userColumns = pgTable('user_columns', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableId: uuid('table_id').notNull(),
  name: text('name').notNull(),
  fieldType: text('field_type').notNull(),
  options: jsonb('options'),
  sortOrder: integer('sort_order').default(0),
  required: boolean('required').default(false),
  defaultValue: text('default_value'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('user_columns_table_idx').on(t.tableId),
])

export const userRows = pgTable('user_rows', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableId: uuid('table_id').notNull(),
  data: jsonb('data').notNull().default({}),
  sortOrder: integer('sort_order').default(0),
  ...timestamps,
}, (t) => [
  index('user_rows_table_idx').on(t.tableId),
])
```

---

## 3. API Routes

All under `/api/tables/`:

### Bases
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tables/bases` | List all bases (optionally filter by workspace) |
| POST | `/api/tables/bases` | Create a base |
| PATCH | `/api/tables/bases/[id]` | Update base name/description |
| DELETE | `/api/tables/bases/[id]` | Delete base + cascade |

### Tables
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tables/[baseId]/tables` | List tables in a base |
| POST | `/api/tables/[baseId]/tables` | Create table (with initial columns) |
| PATCH | `/api/tables/t/[tableId]` | Rename/update table |
| DELETE | `/api/tables/t/[tableId]` | Delete table + cascade |

### Columns
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tables/t/[tableId]/columns` | List columns |
| POST | `/api/tables/t/[tableId]/columns` | Add column |
| PATCH | `/api/tables/t/[tableId]/columns/[colId]` | Update column |
| DELETE | `/api/tables/t/[tableId]/columns/[colId]` | Delete column |

### Rows
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tables/t/[tableId]/rows` | List rows (pagination, sort, filter) |
| POST | `/api/tables/t/[tableId]/rows` | Create row(s) |
| PATCH | `/api/tables/t/[tableId]/rows/[rowId]` | Update row |
| DELETE | `/api/tables/t/[tableId]/rows/[rowId]` | Delete row |
| POST | `/api/tables/t/[tableId]/rows/bulk` | Bulk create/update/delete |

### Export & Search
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tables/t/[tableId]/export.md` | Export table as markdown |
| GET | `/api/tables/t/[tableId]/export.csv` | Export as CSV |
| GET | `/api/tables/t/[tableId]/export.json` | Export as JSON |
| GET | `/api/tables/search?q=...` | Full-text search across all table data |

---

## 4. UI Components

### Page: `/bases` (replace existing NocoDB page)

**Sidebar:** List of bases → expand to see tables

**Main view (per table):**
- Column headers with type icons + sort/filter controls
- Editable cells (click to edit, tab to move)
- Add row button (bottom)
- Add column button (right)
- Toolbar: filter, sort, export (.md / .csv), search

**Libraries:**
- `@tanstack/react-table` — headless table with sorting, filtering, pagination
- Existing Radix UI + Tailwind for controls
- No new dependencies needed beyond TanStack Table

**Key UX patterns:**
- Inline cell editing (double-click or Enter to edit)
- Column type picker when adding/editing columns
- Drag-to-reorder columns and rows
- Right-click context menu on rows (delete, duplicate)
- Cmd+Z undo for cell edits (optimistic + server sync)

---

## 5. .md Export Format

Each table exports as a markdown file with YAML frontmatter:

```markdown
---
table: Equipment Inventory
base: Byron Film Operations
exported: 2026-03-03T21:30:00+11:00
columns:
  - name: Item
    type: text
  - name: Category
    type: select
  - name: Daily Rate
    type: number
  - name: Available
    type: checkbox
---

# Equipment Inventory

| Item | Category | Daily Rate | Available |
|------|----------|-----------|-----------|
| BMPCC 4K | Camera | 350 | ✅ |
| Aputure 600d | Lighting | 150 | ✅ |
| Sigma 18-35mm | Lens | 75 | ❌ |
```

This format is:
- Human-readable
- Parseable back into structured data
- Indexable by semantic search
- Compatible with Obsidian / any markdown tool

---

## 6. Semantic Search Integration

Table data feeds into the existing `activity_log` with embeddings:
- On row create/update → generate embedding of row content
- Store in `activity_log` with `entity_type: 'table_row'`
- Searchable alongside notes, tasks, everything else

---

## 7. MCP Server (Phase 2)

Thin wrapper exposing these tools:
- `list_bases` / `list_tables` / `list_columns`
- `query_rows(tableId, filters?, sort?, limit?)`
- `create_row(tableId, data)`
- `update_row(tableId, rowId, data)`
- `delete_row(tableId, rowId)`
- `export_table(tableId, format: 'md' | 'csv' | 'json')`
- `search_tables(query)`

This gives any MCP-compatible AI full CRUD access.

---

## 8. Column Types (V1)

| Type | Storage | Editor | Display |
|------|---------|--------|---------|
| `text` | string | Text input | Plain text |
| `longtext` | string | Textarea / rich text | Expandable |
| `number` | number | Number input | Formatted |
| `date` | ISO string | Date picker | Formatted |
| `checkbox` | boolean | Toggle | ✅/❌ |
| `select` | string | Dropdown (from options) | Badge |
| `multiselect` | string[] | Multi-dropdown | Badge list |
| `url` | string | URL input | Clickable link |
| `email` | string | Email input | Mailto link |

**V2 additions:** `relation` (link to other table rows), `formula`, `attachment`

---

## 9. Migration from NocoDB

1. Export existing NocoDB tables via API before shutdown
2. Import into new system via bulk row API
3. Remove NocoDB Docker container + Cloudflare tunnel
4. Update `/bases` page to use new system

---

## 10. Implementation Order

1. **Schema + DB migration** — Add Drizzle schema, run `db:push`
2. **API routes** — Full CRUD for bases, tables, columns, rows
3. **Export endpoints** — .md, .csv, .json
4. **UI — Table list** — Replace NocoDB bases page with native base/table browser
5. **UI — Table editor** — TanStack Table grid with inline editing
6. **Search integration** — Hook into activity_log embeddings
7. **MCP server** — Thin wrapper (can be standalone Node process or API route)

**Estimated effort:** 3-5 days coding agent work

---

## 11. What This Replaces

| Before (NocoDB) | After (Native Tables) |
|------------------|-----------------------|
| Separate Docker container | Same Next.js app |
| Cloudflare tunnel | Same Vercel deployment |
| Separate auth | Same dashboard auth |
| No .md export | Built-in .md export |
| No semantic search | Embedded in search index |
| No MCP | Full MCP access |
| Separate backup concerns | Same Neon DB backup |

---

*Built for us. Owned by us. Searchable, exportable, AI-native.* 🐙
