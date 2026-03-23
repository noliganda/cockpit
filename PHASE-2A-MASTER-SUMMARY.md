# Phase 2A — Master Summary

**Status:** ✅ All decisions locked, weekend prep ready, Monday execution plan confirmed  
**Last Updated:** 2026-03-21 21:51 AEST  
**Owner:** Charlie (with Oli available Mon-Tue 9am-5pm)

---

## 🎯 The Mission (Why We're Building This)

**Goal:** Create an MCP harness where Claude Code (and later Cursor) can act as a co-pilot inside the IDE.

**Vision:** One shared brain (Postgres `thoughts` table) that:
- Logs all actions (file changes, git commits, user queries)
- Enables semantic search (Claude Code: "Find all Priority Engine decisions from this month")
- Provides context to the IDE co-pilot
- Learns from past iterations (AI improves over time)

**Outcome:** An IDE where AI *understands* the codebase's history + intent, not just the current files.

---

## 📋 What We're Building (Technical)

### Core Components

**1. Database Layer**
- `thoughts` table (id, content, embedding, metadata, timestamps)
- `match_thoughts()` semantic search function
- File watcher logging changes to `thoughts`

**2. MCP Server**
- Runs on Mac mini (localhost:3001)
- Node.js + @modelcontextprotocol/sdk
- 4 core tools:
  - `capture_thought` — Save to database
  - `search_thoughts` — Semantic search
  - `recent_thoughts` — Last N thoughts
  - `brain_stats` — Database statistics

**3. File Watcher**
- Monitors `apps/` directory (Ops Dashboard codebase)
- Logs all changes: create, modify, delete
- Metadata: source, filename, change type

**4. IDE Integration**
- `.mcp.json` config for Claude Code
- Claude Code connects to MCP server
- Can query the brain from inside the IDE

### Tech Stack (Final Decisions)

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Database** | Postgres (Mac mini) | Control, cost, no vendor lock-in |
| **Embeddings** | OpenAI (text-embedding-3-small) | Fastest, cheapest, industry standard |
| **MCP Server** | Node.js | Full control, local deployment |
| **Deployment** | Local + SSH tunnel | Local-first, remote access when needed |
| **IDE** | Claude Code | Direct MCP support, Mac native |

---

## 📅 Timeline (Locked In)

### Monday 2026-03-24
- **9:00 AM** — Claude Code spawns with full Phase 2a spec
- **9:00 AM - 1:00 PM** — Iterations 1-2 (schema, MCP scaffold)
- **1:00 PM - 3:00 PM** — Iteration 3 (core tools part 1)
- **3:00 PM - 5:00 PM** — Iteration 4 (core tools part 2)
- **5:00 PM** — STOP. Daily review.

### Tuesday 2026-03-25
- **9:00 AM** — Review Monday progress, confirm no blockers
- **9:00 AM - 1:00 PM** — Iteration 5 (file watcher)
- **1:00 PM - 3:00 PM** — Iteration 6 (Claude Code integration + docs)
- **3:00 PM - 5:00 PM** — Final testing, cleanup
- **5:00 PM** — STOP. Code review complete.

### Wednesday 2026-03-26
- **9:00 AM - 12:00 PM** — Integration testing + go-live checklist
- **12:00 PM** — ✅ LIVE (MCP harness ready)

### Thursday 2026-03-27+
- **Phase 2b begins** (CRM layer with Ralph Wiggum)

---

## 👥 Execution Model (Hybrid Approach)

**Claude Code Role:** Build each iteration, submit code for verification

**Charlie (Me) Role:** Gate each iteration (checkpoint verification)
- Test database schema
- Test MCP server connectivity
- Test each tool works
- Test file watcher logging
- Catch errors before they compound

**Oli (You) Role:** Available 9am-5pm Mon-Tue for decisions
- You stay focused on business
- I ping only if decision needed
- You review code evenings at your pace
- You test final result Wednesday morning

**Why Hybrid > Ralph Wiggum:**
- Ralph overnight = 16 hours build + 30% failure risk
- Hybrid = 10 hours build + checkpoints prevent disasters
- Result: Actually faster in real time (no Tuesday morning debugging)

---

## 🔧 Research Foundation (OB1)

This design is inspired by Nate Jones' Open Brain (OB1) project:
- ✅ `thoughts` table schema (directly from OB1)
- ✅ Semantic search function (from OB1)
- ✅ MCP server pattern (from OB1)
- ✅ Extension architecture (from OB1)

**We didn't fork OB1.** We adapted their *patterns* to our stack:
- They use Supabase → we use Postgres (self-hosted)
- They deploy to Edge Function → we deploy to Mac mini (Node.js)
- Their UI → our Ops Dashboard
- Their extensions → our Phase 2b CRM layer

**Why this matters:** We steal proven thinking, keep full control of our tech stack.

---

## 📊 Success Criteria (Wednesday Noon)

✅ Postgres successfully migrated to Mac mini (from Vercel)  
✅ MCP server running on localhost:3001  
✅ All 4 MCP tools working (tested via curl)  
✅ File watcher logging changes to `thoughts` table  
✅ Claude Code can connect to MCP and query semantic search  
✅ Full documentation + setup instructions  
✅ All code committed to GitHub  
✅ Zero blockers or false positives  

---

## 📚 Prep Work (This Weekend)

**Charlie is building:**

1. **PHASE-2A-PROMPT.md** — Full spec for Claude Code (6 iterations, acceptance criteria)
2. **PHASE-2A-CHECKPOINT-GATES.md** — My verification checklist for each iteration
3. **PHASE-2A-WEEKEND-PREP.md** — This weekend's prep checklist (now created ✅)
4. **Monitoring cron** — Slack updates every 2 hours (Mon-Tue 9am-1pm)
5. **Postgres migration test** — Dry-run Vercel → Mac mini (validate process)

**Your prep:**
- Ensure Claude Code is installed on Mac mini
- Ensure OpenAI API key is in ~/.env
- Ensure Postgres is running (or install Sunday)
- Keep availability Mon-Tue 9am-5pm
- Rest 😴

---

## 🚨 Decisions Locked (No Reversals)

| Decision | Choice | Locked By |
|----------|--------|-----------|
| Embedding API | OpenAI (text-embedding-3-small) | Both |
| MCP Server | Local + SSH tunnel | Both |
| Database | Postgres Mac mini | Both |
| Execution | Hybrid (no Ralph overnight) | Charlie argument, Oli approved |
| Timeline | Mon 9am - Wed noon | Both |
| Availability | Oli 9am-5pm Mon-Tue | Both |

---

## 🎯 Critical Success Factors

1. **Charlie's checkpoint gates are strict** — No sloppy code moves to next iteration
2. **Oli available Mon-Tue 9am-5pm** — Even if just for quick decision
3. **Phase 2a is NOT overnight** — Stops daily at 5pm (human review)
4. **Clear iteration acceptance criteria** — Each iteration has testable outcomes
5. **Open communication** — Charlie pings for blockers, Oli responds same day

---

## 🚀 Next Steps

**This weekend (Saturday evening):**
- Charlie finishes all prep documents (in progress)
- Charlie tests Postgres migration (dry-run)
- Everything committed to GitHub

**Monday morning (9:00 AM sharp):**
- Claude Code spawns with full Phase 2a context
- Iteration 1 begins (database schema)
- Build rolls until 5pm (8 working hours, 2 iterations)

**Monday evening:**
- Oli reviews progress at leisure
- Charlie does checkpoint verification

**Tuesday morning:**
- Finish iterations 5-6 (file watcher + docs)
- Full integration testing

**Wednesday noon:**
- Go-live: MCP harness ready
- Phase 2b begins Thursday

---

## 📖 Related Documents

- **PHASE-2A-OB1-RESEARCH.md** — Deep dive into OB1 architecture + our adaptations
- **PHASE-2A-PROMPT.md** — Full spec for Claude Code (to be created this weekend)
- **PHASE-2A-CHECKPOINT-GATES.md** — My verification checklist (to be created this weekend)
- **PHASE-2A-WEEKEND-PREP.md** — This weekend's checklist + timeline (created ✅)

---

**Everything is ready. Monday we build. 🚀**

*Last updated: 2026-03-21 21:51 AEST*  
*Next review: Monday 2026-03-24 08:55 AM (pre-launch check)*