# Phase 2A Prompt — MCP Co-Pilot Infrastructure

**Status:** Live spec for building Phase 2a  
**Timeline:** Mon 2026-03-23 11:00 AM - Wed 2026-03-26 12:00 PM AEST  
**Owner:** Charlie (building directly) + Oli (review/decisions)  
**Target:** MCP server running on Mac mini, IDE co-pilot ready

---

## 🎯 Mission

Build the MCP server that powers Charlie as a true co-pilot inside Claude Code/Cursor. The server:
- Runs on Mac mini (localhost:3001)
- Stores thoughts + embeddings in Postgres
- Enables semantic search ("Find all Priority Engine decisions this month")
- Logs all file changes (action tracking)
- Feeds context back to Claude Code

---

## 📋 Scope: 6 Iterations

### Iteration 1: Postgres Schema
**Goal:** Database foundation ready to go  
**Owner:** Charlie  
**Timeline:** Mon 11:00 AM - 1:00 PM AEST  

**Deliverables:**
1. Install Postgres (if not already on Mac mini): `brew install postgresql@17`
2. Create database `mcp_brain`
3. Create `thoughts` table with schema:
   ```sql
   CREATE TABLE thoughts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     content TEXT NOT NULL,
     embedding vector(1536),
     metadata JSONB DEFAULT '{}',
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```
4. Create indexes:
   - HNSW index on `embedding` (for similarity search)
   - GIN index on `metadata` (for filtering)
   - BTREE index on `created_at` (for date queries)
5. Create `match_thoughts()` function (semantic search):
   ```sql
   CREATE OR REPLACE FUNCTION match_thoughts(
     query_embedding vector,
     match_threshold float DEFAULT 0.7,
     match_count int DEFAULT 10
   ) RETURNS TABLE (
     id UUID,
     content TEXT,
     similarity float,
     metadata JSONB,
     created_at TIMESTAMP
   ) AS $$
     SELECT
       id,
       content,
       1 - (embedding <=> query_embedding) as similarity,
       metadata,
       created_at
     FROM thoughts
     WHERE 1 - (embedding <=> query_embedding) > match_threshold
     ORDER BY similarity DESC
     LIMIT match_count;
   $$ LANGUAGE SQL;
   ```
6. Create auto-update trigger for `updated_at`:
   ```sql
   CREATE OR REPLACE TRIGGER thoughts_updated_at
   BEFORE UPDATE ON thoughts
   FOR EACH ROW
   EXECUTE FUNCTION update_updated_at_column();
   ```

**Acceptance Criteria:**
- [ ] Postgres installed and running (`psql` works)
- [ ] Database `mcp_brain` created
- [ ] `thoughts` table created with all columns
- [ ] All 3 indexes created (verify with `\di`)
- [ ] `match_thoughts()` function created (test with mock embedding)
- [ ] Trigger working (insert, update, verify `updated_at` changed)
- [ ] No errors in SQL; all types correct
- [ ] Can connect from Node.js (`npm list pg` works)

**Notes:**
- Use pgvector extension (install: `CREATE EXTENSION IF NOT EXISTS vector;`)
- Connection string will be: `postgres://localhost:5432/mcp_brain`
- Embeddings are 1536-dim (OpenAI text-embedding-3-small)

---

### Iteration 2: MCP Server Scaffold
**Goal:** Node.js server boots, listens for MCP requests  
**Owner:** Charlie  
**Timeline:** Mon 1:00 PM - 3:00 PM AEST  

**Deliverables:**
1. Create directory: `/opt/homebrew/lib/node_modules/openclaw/skills/mcp-copilot/`
2. Initialize Node.js project:
   ```bash
   npm init -y
   npm install @modelcontextprotocol/sdk pg dotenv zod typescript ts-node
   npm install --save-dev @types/node
   ```
3. Create `src/server.ts`:
   - Implement JSON-RPC 2.0 server (stdio transport)
   - Handle `initialize` message (return protocol version, capabilities)
   - Implement error handling + structured logging
   - Environment config (read `.env` for DATABASE_URL, OPENAI_API_KEY)
4. Create `src/types.ts`:
   - Action schema types (timestamp, actor, action, target, outcome, context, summary)
   - MCP request/response types
   - Tool schema definitions
5. Create `src/config.ts`:
   - Load environment variables
   - Validate required keys (DATABASE_URL, OPENAI_API_KEY)
   - Return config object
6. Create `.env.example`:
   ```
   DATABASE_URL=postgres://localhost:5432/mcp_brain
   OPENAI_API_KEY=sk-...
   MCP_PORT=3001
   LOG_LEVEL=debug
   ```
7. Create `.gitignore`, `tsconfig.json`

**File Structure:**
```
/opt/homebrew/lib/node_modules/openclaw/skills/mcp-copilot/
├── src/
│   ├── server.ts (main server)
│   ├── types.ts (all type definitions)
│   ├── config.ts (env loader)
│   └── tools.ts (tool handlers — empty for now)
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

**Acceptance Criteria:**
- [ ] Server starts: `npm run dev` (or `ts-node src/server.ts`)
- [ ] Listens on stdio (MCP default) or port 3001 if HTTP mode
- [ ] Responds to MCP `initialize` message with correct protocol version
- [ ] Returns tool schemas (even if empty implementations)
- [ ] Environment variables load correctly
- [ ] Error handling in place (no crashes on bad input)
- [ ] All TypeScript compiles without errors
- [ ] Can connect from any MCP client (test with curl or mock client)

**Notes:**
- Use stdio transport (default MCP — no port listening needed for IDE)
- Keep iteration 2 minimal: plumbing only, no business logic
- Tools will be implemented in iterations 3-4

---

### Iteration 3: Core Tools Part 1
**Goal:** Implement capture_thought + search_thoughts  
**Owner:** Charlie  
**Timeline:** Mon 3:00 PM - 5:00 PM AEST  

**Deliverables:**
1. Implement `capture_thought(content: string, metadata?: object)` tool:
   - Accepts text content + optional metadata
   - Call OpenAI API to generate embedding (text-embedding-3-small)
   - Insert to `thoughts` table with embedding + metadata
   - Return: `{ id, created_at, embedding_dim }`
   - Error handling for invalid input, API failures
2. Implement `search_thoughts(query: string, limit?: number)` tool:
   - Accept text query
   - Generate embedding for query
   - Call `match_thoughts()` function in Postgres
   - Return: array of matching thoughts (id, content, similarity %, metadata)
   - Default limit: 10 results
3. Create `src/openai.ts` helper:
   - `generateEmbedding(text: string)` → Promise<number[]>
   - Error handling for API rate limits
4. Create `src/db.ts` helper:
   - Pool connection to Postgres
   - `captureThought(content, metadata)` → Promise<uuid>
   - `searchThoughts(embedding, limit)` → Promise<Thought[]>
5. Integration test (manual):
   - Use curl to call MCP tools
   - Verify embedding is generated
   - Verify search returns correct results

**Acceptance Criteria:**
- [ ] `capture_thought` creates row in `thoughts` table
- [ ] Embedding generated via OpenAI API (not hardcoded)
- [ ] `search_thoughts` returns results ranked by similarity
- [ ] Both tools return valid MCP response format
- [ ] No unhandled Promise rejections
- [ ] Tested with curl (sample requests in README)
- [ ] Can handle 100+ thoughts without performance issues

**Notes:**
- OpenAI embedding cost: $0.02 per 1M tokens (minimal)
- Similarity score: 1.0 = identical, 0.7 = pretty good match
- Don't implement UI yet (iteration 6)

---

### Iteration 4: Core Tools Part 2
**Goal:** Implement recent_thoughts + brain_stats  
**Owner:** Charlie  
**Timeline:** Tue 9:00 AM - 11:00 AM AEST  

**Deliverables:**
1. Implement `recent_thoughts(days?: number, limit?: number)` tool:
   - Query thoughts from last N days (default: 7)
   - Return most recent first
   - Include content + metadata + created_at
   - Default limit: 20 results
2. Implement `brain_stats()` tool:
   - Count total thoughts
   - Date range (earliest + latest)
   - Count by source (from metadata.source)
   - Top tags (if metadata.tags exists)
   - Return: `{ total, date_range, by_source, top_tags }`
3. Integration test:
   - Call recent_thoughts with various date filters
   - Verify stats calculation (add 10 thoughts, check count)
4. Full tool documentation:
   - All 4 tools documented with examples
   - Parameter descriptions
   - Return value schemas
   - Error cases

**Acceptance Criteria:**
- [ ] `recent_thoughts` returns correct date range
- [ ] Date filters work (1 day, 7 days, 30 days)
- [ ] `brain_stats` calculates totals correctly
- [ ] Stats include source + tag breakdowns
- [ ] All 4 tools documented in README
- [ ] Example curl commands for each tool
- [ ] No edge cases (empty table, missing metadata, etc.)

---

### Iteration 5: File Watcher
**Goal:** Automatically log file changes to thoughts table  
**Owner:** Charlie  
**Timeline:** Tue 11:00 AM - 1:00 PM AEST  

**Deliverables:**
1. Create `src/watcher.ts`:
   - Watch `/Users/charlie/.openclaw/workspace/olivier-marcolin/projects/charlie-dashboard/app/` directory
   - Detect: file create, modify, delete
   - Extract: filename, path relative to project root, change type, file size, git diff (if available)
2. On file change:
   - Create summary: "Modified components/ui/button.tsx (12 lines changed)"
   - Call `capture_thought()` with:
     ```json
     {
       "content": "Modified components/ui/button.tsx (12 lines changed)",
       "metadata": {
         "source": "file-watcher",
         "file": "components/ui/button.tsx",
         "type": "modify",
         "size_bytes": 2341,
         "timestamp": "2026-03-23T11:15:00Z"
       }
     }
     ```
3. Integration:
   - File watcher starts on server boot
   - Logs are queryable via `search_thoughts("modified button.tsx")`
   - Can query by date: `recent_thoughts(1)` shows last 24h changes
4. Testing:
   - Create a test file in app/ directory
   - Verify it's logged to thoughts table
   - Query it back via search_thoughts

**Acceptance Criteria:**
- [ ] File watcher starts without errors
- [ ] File creates logged to thoughts table
- [ ] File modifications logged with change summary
- [ ] File deletes logged (with note about deletion)
- [ ] Can search for recent changes: `search_thoughts("button")`
- [ ] Metadata extracted correctly
- [ ] No missed events (create new file, verify immediately queryable)
- [ ] Doesn't crash on permission errors (graceful handling)

**Notes:**
- Use `chokidar` npm package (battle-tested file watcher)
- Don't capture entire file contents (too expensive) — just filename + type + summary
- Git diff is nice-to-have but not required for iteration 5

---

### Iteration 6: Claude Code Integration + Documentation
**Goal:** IDE co-pilot ready to go  
**Owner:** Charlie  
**Timeline:** Tue 1:00 PM - 3:00 PM AEST  

**Deliverables:**
1. Create `.mcp.json` for Claude Code:
   ```json
   {
     "mcpServers": {
       "mcp-copilot": {
         "command": "node",
         "args": ["/opt/homebrew/lib/node_modules/openclaw/skills/mcp-copilot/src/server.js"],
         "env": {
           "DATABASE_URL": "postgres://localhost:5432/mcp_brain",
           "OPENAI_API_KEY": "sk-..."
         }
       }
     }
   }
   ```
2. Create comprehensive README:
   - Installation steps
   - Starting the MCP server
   - Connecting Claude Code to MCP
   - Using search_thoughts from Claude Code
   - Troubleshooting
   - Architecture overview
   - Future extensions
3. Create SETUP.md with step-by-step instructions:
   - Install Postgres
   - Clone repo
   - `npm install`
   - Create `.env` from `.env.example`
   - `npm run build` (compile TypeScript)
   - Start server: `npm run start`
   - Configure Claude Code to connect
4. GitHub integration:
   - All code committed (no TODO comments)
   - PR created: `phase-2a/iter-1-6-mcp-server-complete`
   - Commit messages clear + linked to iterations

**Acceptance Criteria:**
- [ ] Claude Code can connect to MCP server
- [ ] Can run `search_thoughts("priority engine")` from Claude Code and get results
- [ ] README has complete setup instructions (someone else could follow it)
- [ ] No TODO or FIXME comments in code
- [ ] All TypeScript compiled to JavaScript
- [ ] .mcp.json is valid JSON (no syntax errors)
- [ ] GitHub PR includes summary of all 6 iterations
- [ ] Code passes linting (if configured)

---

## ✅ Success Criteria (Wednesday Noon)

After all 6 iterations:

- [ ] Postgres running on Mac mini with `mcp_brain` database
- [ ] MCP server boots without errors: `npm start`
- [ ] All 4 tools working (tested via curl)
- [ ] File watcher logging changes to `thoughts` table
- [ ] Claude Code connects to MCP server
- [ ] Can query thoughts from Claude Code: "Find all file changes this week"
- [ ] Complete documentation + setup instructions
- [ ] All code committed to GitHub (ops-dashboard repo, phase-2a branch)
- [ ] Zero blockers or false positives
- [ ] Ready for Phase 2b (CRM layer) Thursday

---

## 🔧 Tech Stack (Final)

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | Latest LTS |
| Language | TypeScript | 5.x |
| MCP SDK | @modelcontextprotocol/sdk | latest |
| Database | PostgreSQL | 17 (via brew) |
| Vector Ext | pgvector | latest |
| Embeddings | OpenAI API | text-embedding-3-small |
| File Watcher | chokidar | latest |
| HTTP | No (stdio transport) | N/A |

---

## 📚 Reference Documents

- **PHASE-2A-MASTER-SUMMARY.md** — High-level overview
- **PHASE-2A-OB1-RESEARCH.md** — Architecture patterns from OB1
- **PHASE-2A-CHECKPOINT-GATES.md** — Charlie's verification checklist (below)

---

## 🎯 Execution Notes

- **Charlie builds directly** — no Claude Code delegation (ACP harness not configured)
- **Oli available Mon-Tue 9am-5pm** — for decisions only
- **Stop daily at 5 PM** — no overnight loops
- **Git commit frequently** — checkpoint at each iteration

---

_Last updated: 2026-03-23 11:06 AEST_
