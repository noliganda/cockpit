# Phase 2A — OB1 Architecture Deep Dive

**Status:** Research phase (in progress)  
**Date Started:** 2026-03-21  
**Objective:** Extract OB1's patterns and adapt to our Postgres-based stack for Phase 2a implementation  
**Decision:** Option C (Hybrid) — Use OB1 patterns on our Postgres backend

---

## 📊 OB1 Architecture Overview

### Core Stack
- **Database:** Supabase (managed Postgres + pgvector)
- **MCP Server:** Deployed as Supabase Edge Function (serverless)
- **Capture:** Slack bot → writes to Supabase
- **Search:** Semantic vector search via `match_thoughts()` SQL function
- **Auth:** Service role JWT keys (no user auth required for core)

### Key Insight
OB1 is NOT a UI. It's a **database pattern + MCP protocol** that lets every AI tool read/write the same brain. Their UI is optional; the core value is the schema + server.

---

## 🗄️ Database Schema (Our Adaptation)

### Base Table: `thoughts`
OB1's schema translates 1:1 to vanilla Postgres:

```sql
-- Core thoughts table (100% compatible with PostgreSQL, no Supabase needed)
create table thoughts (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  embedding vector(1536),            -- pgvector extension
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes (identical to OB1)
create index thoughts_embedding_hnsw on thoughts using hnsw (embedding vector_cosine_ops);
create index thoughts_metadata_gin on thoughts using gin (metadata);
create index thoughts_created_at_desc on thoughts (created_at desc);

-- Auto-update timestamp trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger thoughts_updated_at before update on thoughts
for each row execute function update_updated_at();
```

### Semantic Search Function
Directly from OB1, no changes needed:

```sql
create or replace function match_thoughts(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10,
  filter jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float,
  created_at timestamptz
)
language plpgsql
as $$
begin
  return query
  select
    t.id,
    t.content,
    t.metadata,
    1 - (t.embedding <=> query_embedding) as similarity,
    t.created_at
  from thoughts t
  where 1 - (t.embedding <=> query_embedding) > match_threshold
    and (filter = '{}'::jsonb or t.metadata @> filter)
  order by t.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

**Key points:**
- `embedding vector(1536)` — OpenAI embedding dimension (we can change if using different model)
- `similarity float` — Cosine distance (0 = opposite, 1 = identical)
- `metadata @> filter` — JSONB containment search (find records matching metadata criteria)

### Metadata Convention
OB1 uses JSONB metadata for flexible tagging:

```json
{
  "source": "slack",
  "channel": "om-opsdashboard",
  "tags": ["architecture", "phase-2a"],
  "project": "ops-dashboard",
  "actor": "charlie",
  "task_id": "notion-task-123"
}
```

We can use this for our action logging (file watcher data, git commits, task metadata).

---

## 🔌 MCP Server Architecture

### OB1's Approach
- **Deployment:** Supabase Edge Function (serverless, auto-scaling)
- **Protocol:** Model Context Protocol (JSON-RPC 2.0)
- **Tools Exposed:** 4 core tools
  1. `capture_thought` — Save to `thoughts` table
  2. `search_thoughts` — Semantic search via `match_thoughts()`
  3. `recent_thoughts` — Last N thoughts (useful for context)
  4. `brain_stats` — Stats dashboard (count, date range, etc.)

### Our Implementation (Different Host)
- **Deployment:** Node.js process on Mac mini (not Edge Function)
- **Protocol:** Same MCP (JSON-RPC 2.0)
- **Database:** Our Postgres instance
- **Tools:** Same 4 core tools + additional (file system access, git integration)

**Key difference:** We host the server locally, not in the cloud. Advantages:
- Full control over compute
- Can integrate with local tools (git, file watcher)
- Faster response times for local operations
- No serverless cold-start latency

---

## 🔐 Security Model

### OB1's Auth
- Supabase service_role key (acts like "super user")
- MCP access key (simple bearer token)
- RLS policies restrict direct table access (service_role only)

### Our Auth (Simpler)
- Local MCP server runs on trusted network (Tailscale/local only)
- No need for RLS on our Postgres (internal server)
- Bearer token for MCP client validation
- File-level permissions (who can read project files via MCP)

---

## 🏗️ Extension Pattern (How We'll Layer Features)

OB1 teaches extensions as **additive layers**. Three categories:

### 1. **New Tables** (e.g., CRM contacts)
Add a `contacts` table that references `thoughts`:

```sql
create table contacts (
  id uuid primary key,
  name text not null,
  email text,
  metadata jsonb,
  created_at timestamptz,
  thought_ids uuid[] -- references thoughts.id
);

-- Extension-specific search
create or replace function match_contacts(
  query_text text,
  match_count int default 10
) returns table (
  id uuid,
  name text,
  email text,
  similarity float
) language sql as $$
  select 
    c.id, c.name, c.email,
    similarity(name, query_text) as sim
  from contacts c
  order by sim desc
  limit match_count;
$$;
```

Then expose via MCP: `search_contacts()`, `create_contact()`, etc.

### 2. **Metadata Augmentation** (e.g., marking thoughts as "business" vs "personal")
Just add metadata fields — no schema changes:

```sql
-- Query: "Find all Byron Film thoughts from this month"
select * from match_thoughts(
  query_embedding => my_embedding,
  filter => '{"project": "byron-film", "month": "2026-03"}'::jsonb
);
```

### 3. **Scheduled Ingestion** (e.g., weekly digest, YouTube summaries)
Use cron jobs that:
1. Fetch external data (Gmail, Drive, YouTube API)
2. Embed the content (call embedding API)
3. Insert into `thoughts` table with rich metadata
4. MCP can search immediately

---

## 📋 Phase 2a Implementation Plan (Detailed)

### Week 1: Core Database + MCP Server
1. **Day 1:** Migrate OB1 schema to our Postgres instance
   - Create `thoughts` table with all indexes
   - Create `match_thoughts()` search function
   - Test semantic search end-to-end
   
2. **Day 2-3:** Build MCP server
   - Node.js process using `@modelcontextprotocol/sdk`
   - 4 core tools: capture, search, recent, stats
   - Bearer token auth
   - Connect to our Postgres
   
3. **Day 4-5:** Integrate with Claude Code
   - Configure Claude Code to connect to our MCP server
   - Test IDE co-pilot asking "Is this the right approach?"
   - MCP server returns relevant context from `thoughts`
   
4. **Day 5:** File watcher + action logger
   - Watch Ops Dashboard repo for file changes
   - Log actions to `thoughts` with rich metadata
   - Enable: "Show me all Priority Engine changes this week"

### Week 2: Polish + Documentation
1. **Day 1-2:** Add search to MCP
   - Semantic search from Claude Code ("Find all Phase 2 design decisions")
   - Keyword search + vector search combined
   
2. **Day 3-4:** Cursor integration
   - Cursor uses same MCP server as Claude Code
   - Test in parallel
   
3. **Day 5:** Documentation + handoff
   - MCP server setup guide (how to run locally)
   - Extension architecture doc (how to add new tools)
   - Monthly cron for vector re-embedding (data hygiene)

---

## 🔄 Differences: OB1 vs. Our Implementation

| Aspect | OB1 | Ours |
|--------|-----|------|
| **Database** | Supabase managed | Raw Postgres on Mac mini |
| **Server Host** | Edge Function (serverless) | Node.js process (always-on) |
| **Embedding API** | OpenRouter (their choice) | OpenAI or Anthropic (our choice) |
| **Primary UI** | OB1's dashboard | Ops Dashboard |
| **File Integration** | Slack capture bot | File watcher + git integration |
| **Deployment** | Vercel/Netlify | Local + SSH tunnel to remote |
| **Cost Model** | Supabase + OpenRouter | Postgres host + API credits |
| **Extensions** | Community recipes | Our internal extensions |

---

## 💡 Key Insights We're Stealing From OB1

1. **Metadata-first design** — Use JSONB to tag thoughts by source, project, actor, purpose. No schema bloat.
2. **Semantic search as primitive** — Every extension builds on top of `match_thoughts()`. Don't reinvent search.
3. **Service role pattern** — One database key with full access. Simple, secure for internal use.
4. **Extension architecture** — New features = new tables + new MCP tools. Composable, not monolithic.
5. **Vector embedding strategy** — Embed everything on capture, search via cosine distance. Lean and fast.

---

## 🚀 Why This Works For Us

1. **OB1 solved the hard problems** — schema design, MCP protocol, extension patterns. We copy those.
2. **We keep our advantages** — Postgres control, custom MCP server, local-first deployment.
3. **Not locked in** — If we want to migrate to Supabase later, our schema is 100% compatible.
4. **Community support** — When we need recipes (email import, ChatGPT ingestion), OB1 community has them.
5. **Realistic timeline** — Leveraging their patterns gets Phase 2a done in 2-3 weeks instead of 6-8 weeks.

---

## 🎯 Next Steps (For Oli's Review)

1. **Confirm approach** — Does this strategy align with your vision?
2. **Embedding API choice** — OpenAI (costs), Anthropic (local fallback), or OpenRouter (both)?
3. **Timeline** — Start Week of March 24? (Monday spawn of Claude Code)
4. **Scope creep** — Should Phase 2a stay "MCP harness + file watcher" or add email ingestion too?

---

## 📚 Reference Materials

- **OB1 Repo:** https://github.com/NateBJones-Projects/OB1
- **OB1 Setup Guide:** docs/01-getting-started.md (45-minute walkthrough)
- **OB1 MCP Primitive:** primitives/shared-mcp/ (how they expose database to AI)
- **OB1 Extensions:** extensions/ (sample layering patterns)
- **OB1 Community:** Discord (active help + recipe sharing)

---

**Research Status:** 85% complete (schema, patterns, architecture finalized)  
**Note:** OB1's MCP server is deployed as Supabase Edge Function (proprietary). We'll build ours from scratch on Node.js + @modelcontextprotocol/sdk, using their design patterns.

---

## 🛠️ MCP Server Implementation Strategy (Node.js)

### Core Libraries
```json
{
  "@modelcontextprotocol/sdk": "latest",
  "pg": "^8.11",
  "dotenv": "^16.0",
  "@types/node": "^20.0"
}
```

### Server Interface (4 Core Tools)
```typescript
// 1. capture_thought(content: string, metadata?: object) -> uuid
// 2. search_thoughts(query: string, limit?: int) -> thoughts[]
// 3. recent_thoughts(days?: int, limit?: int) -> thoughts[]
// 4. brain_stats() -> { total_thoughts, date_range, top_tags }
```

### Deployment
- **Local:** Node.js process on Mac mini (runs on startup)
- **Remote:** SSH tunnel to Tailscale gateway (for Cursor/Claude Code on remote machines)
- **Auth:** Bearer token validation (simple, secure for internal use)

### Integration Points
- **Claude Code / Cursor:** Connect via MCP client config
- **File Watcher:** Logs to `thoughts` table with `source: "file-watcher"` metadata
- **Git Hooks:** Capture commits to `thoughts` with `source: "git"` metadata
- **Monthly cron:** Re-embedding stale vectors (data hygiene)

---

## ✅ Ready for Implementation

**Status:** All patterns extracted, no blockers, ready to spawn Claude Code on Monday.

**Decision Gate (For Oli):**
1. Should MCP server run local-only or expose via SSH tunnel?
2. Embedding API: OpenAI ($0.02/1K tokens), Anthropic local fallback, or OpenRouter ($free tier)?
3. Can Phase 2a start Monday morning (March 24)?