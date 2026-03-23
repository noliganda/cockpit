# Phase 2A — Weekend Prep Checklist

**Status:** Ready to begin  
**Deadline:** Monday 2026-03-24 at 9:00 AM AEST  
**Owner:** Charlie  
**Start Date:** 2026-03-22 (Sunday evening)

---

## ✅ Task 1: Create PHASE-2A-PROMPT.md

**What:** Full spec document for Claude Code to build Phase 2a in 6 iterations

**Content Structure:**
```markdown
# Phase 2A Prompt for Claude Code

## Overview
Build MCP harness for Ops Dashboard. Core features: semantic search, action logging, IDE co-pilot.

## Decisions Locked In
- OpenAI embeddings (text-embedding-3-small)
- Postgres on Mac mini (migrate from Vercel)
- MCP server: Node.js + @modelcontextprotocol/sdk
- Local + SSH tunnel deployment
- Hybrid execution (checkpoints at each iteration)

## Iteration 1: Database Schema
- Create `thoughts` table (id, content, embedding, metadata, timestamps)
- Create indexes (hnsw for embedding, gin for metadata, btree for created_at)
- Create auto-update trigger for updated_at
- Create `match_thoughts()` search function

Acceptance Criteria:
- [ ] Table created
- [ ] All indexes created
- [ ] Trigger works
- [ ] Search function works (test with mock embedding)

## Iteration 2: MCP Server Scaffold
- Initialize Node.js project (package.json, .gitignore)
- Install dependencies (@modelcontextprotocol/sdk, pg, dotenv)
- Create server.ts with connection logic
- Create auth middleware (bearer token)
- Basic error handling + logging

Acceptance Criteria:
- [ ] Server starts on localhost:3001
- [ ] Logs connection attempt
- [ ] Bearer token validation works
- [ ] Rejects bad tokens

## Iteration 3: Core MCP Tools (Part 1)
- Implement `capture_thought(content, metadata)` → returns uuid
- Implement `search_thoughts(query, limit)` → returns semantic matches
- Test both tools with curl

Acceptance Criteria:
- [ ] capture_thought inserts to database
- [ ] Search returns results ranked by similarity
- [ ] Both tools return proper MCP format

## Iteration 4: Core MCP Tools (Part 2)
- Implement `recent_thoughts(days, limit)` → returns last N thoughts
- Implement `brain_stats()` → returns { total, date_range, top_tags }
- Test both tools with curl

Acceptance Criteria:
- [ ] recent_thoughts works with date filters
- [ ] brain_stats calculates correctly
- [ ] All 4 tools documented with examples

## Iteration 5: File Watcher
- Create file watcher for `apps/` directory (Ops Dashboard codebase)
- On file change, extract: filename, change type, summary
- Call capture_thought() to log to thoughts table
- Metadata: { source: "file-watcher", file: "...", type: "create|modify|delete" }

Acceptance Criteria:
- [ ] Watcher starts on boot
- [ ] File changes logged to thoughts table
- [ ] Metadata captured correctly
- [ ] Can query recent file changes via search_thoughts

## Iteration 6: Claude Code Integration + Documentation
- Create `.mcp.json` for Claude Code MCP client config
- Document how to connect Claude Code to MCP server
- Create README with startup instructions
- Git commit + push

Acceptance Criteria:
- [ ] Claude Code can connect to MCP
- [ ] Can run `search_thoughts("priority engine")` from Claude Code
- [ ] README has full setup instructions
- [ ] Code is committed, no TODO comments

## Checkpoint Gates (Charlie's Verification)

After each iteration, Charlie verifies:
- Code syntax (no TS/SQL errors)
- Tests pass (unit tests, manual curl tests)
- Database state is valid (schema, data integrity)
- No blockers before next iteration

## Success Metrics (Wednesday 12pm)
✅ Postgres migrated locally (verified)
✅ MCP server running (localhost:3001, responding)
✅ All 4 tools working (tested via curl)
✅ File watcher logging changes
✅ Claude Code connected (can query)
✅ Documentation complete
✅ Code committed to GitHub

## Assumptions
- Mac mini has Postgres 14+ installed (or can install)
- OpenAI API key available (in ~/.env)
- Node.js 18+ installed on Mac mini
- Tailscale configured for SSH tunnel
- Claude Code installed on Mac mini

## Notes
- No overnight loops. Build pauses daily at 5pm.
- Oli available Mon-Tue 9am-5pm for decisions.
- Charlie gates each checkpoint.
- First error blocks iteration. Fix then retry.
```

---

## ✅ Task 2: Create Checkpoint Verification Checklist

**What:** My (Charlie's) testing gates for each iteration

**File:** `PHASE-2A-CHECKPOINT-GATES.md`

**Content:**
```markdown
# Phase 2A Checkpoint Verification Gates

## Iteration 1: Database Schema
Charlie's verification:
- [ ] Connect to Postgres: `psql postgres://localhost:5432/ops_dashboard`
- [ ] List tables: `\dt` → should show `thoughts`
- [ ] Check columns: `\d thoughts` → verify all 6 columns exist
- [ ] Check indexes: `\di` → 3 indexes created
- [ ] Test trigger: `UPDATE thoughts SET content='test' WHERE id='...'` → updated_at changes
- [ ] Test search function: `SELECT * FROM match_thoughts(ARRAY[...], 0.7, 10)` → works

Result: ✅ or 🔴 BLOCKED

## Iteration 2: MCP Server Scaffold
Charlie's verification:
- [ ] `npm install` works (no missing deps)
- [ ] `npm run build` compiles TS without errors
- [ ] `node dist/server.js` starts on localhost:3001
- [ ] `curl -H "Authorization: Bearer TOKEN" http://localhost:3001/` → responds with 200
- [ ] Invalid token → 401

Result: ✅ or 🔴 BLOCKED

## Iteration 3-4: MCP Tools
Charlie's verification:
- [ ] `curl -X POST http://localhost:3001/tools/capture_thought -H "Authorization: Bearer TOKEN" -d '{"content":"test","metadata":{}}' ` → returns uuid
- [ ] Thought appears in database: `SELECT * FROM thoughts WHERE id='UUID'`
- [ ] `curl -X POST http://localhost:3001/tools/search_thoughts -H "Authorization: Bearer TOKEN" -d '{"query":"test","limit":10}'` → returns results
- [ ] Search results ranked by similarity (highest first)
- [ ] Test all 4 tools independently

Result: ✅ or 🔴 BLOCKED

## Iteration 5: File Watcher
Charlie's verification:
- [ ] `node dist/file-watcher.js` starts (logs "Watching /apps/*")
- [ ] Create a file in ops-dashboard/apps/: `touch apps/test-file.ts`
- [ ] Wait 1 second
- [ ] Check thoughts table: `SELECT * FROM thoughts WHERE source='file-watcher' ORDER BY created_at DESC LIMIT 1`
- [ ] File change is there
- [ ] Modify the file, delete it
- [ ] Both changes logged to thoughts table

Result: ✅ or 🔴 BLOCKED

## Iteration 6: Claude Code Integration
Charlie's verification:
- [ ] `.mcp.json` exists and is valid JSON
- [ ] Claude Code reads config: `~/.local/claude/mcp.json` exists (or system location)
- [ ] Start Claude Code, try to connect to MCP
- [ ] Run a query from Claude Code: `@mcp search_thoughts("database")`
- [ ] Get results back from MCP
- [ ] Documentation README covers setup, examples, troubleshooting

Result: ✅ or 🔴 BLOCKED (if blocked, iteration is incomplete)

## Daily Cadence
- 9am: Checkpoint cleared yesterday? Start next iteration
- 1pm: Status check (all iterations on track?)
- 5pm: Stop. Day review. Tomorrow morning: repeat

## If Blocked
- Don't move to next iteration
- File an issue in GitHub
- Ping Oli if decision needed
- Claude Code fixes the issue
- Retest the same iteration tomorrow
```

---

## ✅ Task 3: Create Monitoring Cron

**What:** Automated job that posts Phase 2a progress to Slack every 2 hours

**File:** Not created yet (will create Monday morning)

**Concept:**
```bash
# Every 2 hours, run:
# 1. Check if Claude Code is still working
# 2. Count how many tests pass for current iteration
# 3. Post to Slack: "Iteration X: Y/Z tests pass"
# 4. If iteration complete, post ✅ and mention next iteration
# 5. If blocked, post 🔴 and alert Oli

Runs: Monday 9am - Tuesday 1pm  
Stops: Daily at 5pm (human review phase)
```

---

## ✅ Task 4: Test Postgres Migration Path

**What:** Dry-run migration from Vercel Postgres → Mac mini

**Steps:**
```bash
# 1. Get Vercel Postgres connection string
# 2. Dump schema + data: pg_dump VERCEL_CONNECTION_STRING > /tmp/dump.sql
# 3. Start local Postgres (if not running): brew services start postgresql
# 4. Create database: createdb ops_dashboard
# 5. Restore: psql postgres://localhost:5432/ops_dashboard < /tmp/dump.sql
# 6. Verify: psql postgres://localhost:5432/ops_dashboard
#    → \dt (should show tables)
#    → select count(*) from thoughts; (should match Vercel)
# 7. Note any issues for Monday morning
```

**Expected Issues:**
- Postgres not installed (install via Homebrew: `brew install postgresql`)
- Different Postgres versions (use SERIAL vs UUID for IDs — already have UUID, so fine)
- Permission issues (run as current user, not root)

---

## 🎯 Weekend Timeline

**Sunday 2026-03-22:**
- 6pm: Start Task 1 (PHASE-2A-PROMPT.md) — 1-2 hours
- 8pm: Start Task 2 (checkpoint gates) — 30 minutes
- 8:30pm: Start Task 3 (monitoring cron structure) — 30 minutes
- 9pm: Start Task 4 (test migration) — 30 minutes
- 10pm: All prep done, review, commit to repo

**Monday 2026-03-24:**
- 8:55am: Final checks (Postgres running, OpenAI key loaded, Mac mini ready)
- 9:00am: Spawn Claude Code with full PHASE-2A-PROMPT.md

---

## 📋 Handoff to Claude Code (Monday 9am)

Claude Code receives:
1. PHASE-2A-PROMPT.md (full spec, all iterations)
2. This checklist (what Charlie will verify)
3. Link to GitHub repo (where to commit)
4. OpenAI key (in .env, already loaded)
5. Postgres connection string (localhost:5432/ops_dashboard)

Claude Code starts:
- Iteration 1: Database schema
- Read PHASE-2A-PROMPT.md for full context
- Submit code for Charlie verification before moving to next iteration

---

## ✅ Pre-Monday Checklist (Oli)
- [ ] Claude Code installed on Mac mini
- [ ] OpenAI API key in ~/.env
- [ ] Postgres running (or ready to install)
- [ ] GitHub repo up-to-date
- [ ] Tailscale running (for SSH tunnel later)
- [ ] Available Mon-Tue 9am-5pm

---

**Everything ready. See you Monday morning!** 🚀