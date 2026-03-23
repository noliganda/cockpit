# Phase 2A Checkpoint Gates — Charlie's Verification Checklist

**Purpose:** Ensure each iteration is solid before moving to the next  
**Owner:** Charlie (gate-keeper)  
**Mode:** Strict ✋ — code moves forward only when passing criteria

---

## Iteration 1: Postgres Schema

### Before Checkpoint
- [ ] Postgres installed: `which psql` returns path
- [ ] Database `mcp_brain` created: `psql -l | grep mcp_brain`
- [ ] Can connect: `psql -d mcp_brain -c "SELECT 1;"`

### Code Verification
- [ ] `thoughts` table exists with correct schema:
  ```bash
  psql -d mcp_brain -c "\d thoughts"
  ```
  Expected columns: id, content, embedding, metadata, created_at, updated_at
- [ ] pgvector extension loaded: `psql -d mcp_brain -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>&1 | grep -i exists`
- [ ] Embedding column is vector type: `\d thoughts` shows `embedding | vector` ✅
- [ ] All 3 indexes created:
  ```bash
  psql -d mcp_brain -c "\di" | grep thoughts
  ```
  Expected: index on embedding (HNSW), metadata (GIN), created_at (BTREE)
- [ ] `match_thoughts()` function exists:
  ```bash
  psql -d mcp_brain -c "\df match_thoughts"
  ```

### Function Testing
- [ ] Insert test thought:
  ```sql
  INSERT INTO thoughts (content, embedding, metadata) 
  VALUES ('test', ARRAY[0.1, 0.2, ...rest of 1536 dims...], '{"test": true}');
  ```
  Expected: 1 row inserted, no errors
- [ ] Auto-update trigger works:
  ```sql
  UPDATE thoughts SET content = 'updated' WHERE content = 'test';
  SELECT updated_at FROM thoughts WHERE content = 'updated';
  ```
  Expected: updated_at changed (should be now or very recent)
- [ ] `match_thoughts()` returns results:
  ```sql
  SELECT * FROM match_thoughts(ARRAY[0.1, 0.2, ...], 0.5, 5);
  ```
  Expected: Returns 0-5 rows, columns match function signature

### Pass/Fail Gate
**✅ PASS if:** All indexes exist, function works, trigger fires, can insert + query  
**❌ FAIL if:** Any SQL errors, missing columns, function returns wrong schema, trigger doesn't fire

---

## Iteration 2: MCP Server Scaffold

### Code Inspection
- [ ] Directory exists: `/opt/homebrew/lib/node_modules/openclaw/skills/mcp-copilot/`
- [ ] `src/server.ts` exists and has:
  - JSON-RPC 2.0 message handler
  - `initialize` message response
  - Error handling (try/catch blocks)
  - Structured logging (console.error for failures)
- [ ] `src/types.ts` exists with:
  - Action schema (timestamp, actor, action, target, outcome, context, summary)
  - MCP request/response types
  - Tool schema definitions
- [ ] `src/config.ts` exists and:
  - Loads .env via dotenv
  - Validates DATABASE_URL + OPENAI_API_KEY present
  - Returns typed config object
- [ ] `package.json` has correct dependencies:
  ```bash
  npm ls | grep "@modelcontextprotocol/sdk"
  npm ls | grep "pg"
  npm ls | grep "zod"
  ```
- [ ] TypeScript config exists and compiles:
  ```bash
  npx tsc --noEmit
  ```
  Expected: No errors

### Server Boot Test
- [ ] Server starts without crashing:
  ```bash
  npm run dev 2>&1 | head -20
  ```
  Expected: "Server listening on..." or "Ready for JSON-RPC messages" (no errors)
- [ ] Server responds to initialize:
  ```bash
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | node src/server.ts
  ```
  Expected: JSON response with protocol version, capabilities
- [ ] Environment loading works:
  - Create `.env` with DATABASE_URL + OPENAI_API_KEY
  - Server should not crash on startup
  - Console logs show config loaded

### Git Status
- [ ] All files committed:
  ```bash
  cd /opt/homebrew/lib/node_modules/openclaw/skills/mcp-copilot/
  git status
  ```
  Expected: "On branch phase-2a/iter-2-mcp-scaffold" (or equivalent), no uncommitted changes

### Pass/Fail Gate
**✅ PASS if:** Server boots, responds to initialize, no TS errors, all files committed  
**❌ FAIL if:** Server crashes, types undefined, initialize doesn't respond, .env not loading

---

## Iteration 3: Core Tools Part 1

### Code Inspection
- [ ] `src/openai.ts` exists with:
  - `generateEmbedding(text)` function
  - API call to OpenAI (text-embedding-3-small)
  - Error handling for rate limits + invalid input
  - Returns Promise<number[]> with length 1536
- [ ] `src/db.ts` exists with:
  - Postgres connection pool
  - `captureThought(content, metadata)` → inserts to thoughts table, returns UUID
  - `searchThoughts(embedding, limit)` → calls match_thoughts(), returns Thought[]
  - Error handling for connection failures
- [ ] Tools registered in server:
  - MCP server exposes `capture_thought` tool
  - MCP server exposes `search_thoughts` tool
  - Tool schemas match function signatures

### Integration Testing
- [ ] Test `capture_thought`:
  ```bash
  curl -X POST http://localhost:3001/rpc \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"capture_thought","arguments":{"content":"Test thought"}}}'
  ```
  Expected: Returns UUID + created_at timestamp
- [ ] Verify in database:
  ```bash
  psql -d mcp_brain -c "SELECT id, content FROM thoughts ORDER BY created_at DESC LIMIT 1;"
  ```
  Expected: Row with content "Test thought" + real UUID
- [ ] Test `search_thoughts`:
  ```bash
  curl -X POST http://localhost:3001/rpc \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_thoughts","arguments":{"query":"Test"}}}'
  ```
  Expected: Returns array with similarity scores, content matches query
- [ ] Verify similarity ranking:
  - Insert 3 thoughts: "Test A", "Test B", "Completely different"
  - Search for "Test"
  - Verify A + B returned before "Completely different"
  - Expected: Results ranked by semantic similarity

### OpenAI Integration
- [ ] API key loaded from .env:
  ```bash
  grep "OPENAI_API_KEY" .env | head -c 20
  ```
  Expected: sk-proj-... or similar
- [ ] Test embedding generation:
  ```bash
  node -e "const c = require('./src/openai'); c.generateEmbedding('test').then(e => console.log(e.length))"
  ```
  Expected: 1536 (dimension of text-embedding-3-small)

### Pass/Fail Gate
**✅ PASS if:** Both tools work via curl, embeddings generated, search returns ranked results, DB contains captured thoughts  
**❌ FAIL if:** Tools don't respond, embeddings all zeros, search returns no results, API errors in logs

---

## Iteration 4: Core Tools Part 2

### Code Inspection
- [ ] `recent_thoughts` tool implemented:
  - Accepts optional `days` + `limit` parameters
  - Defaults: days=7, limit=20
  - Returns array sorted by created_at DESC
- [ ] `brain_stats` tool implemented:
  - Returns { total, date_range, by_source, top_tags }
  - Calculates correctly (no hardcoded values)
  - Handles empty database gracefully

### Integration Testing
- [ ] Test `recent_thoughts`:
  ```bash
  curl ... '{"method":"tools/call","params":{"name":"recent_thoughts","arguments":{"days":1,"limit":5}}}'
  ```
  Expected: Returns max 5 thoughts from last 24 hours, ordered newest first
- [ ] Verify date filtering:
  - Insert thought with old timestamp (1 month ago) via direct SQL
  - Call `recent_thoughts(7)` → should NOT include old thought
  - Call `recent_thoughts(90)` → should include old thought
- [ ] Test `brain_stats`:
  ```bash
  curl ... '{"method":"tools/call","params":{"name":"brain_stats","arguments":{}}}'
  ```
  Expected: Returns JSON with:
  - `total`: integer >= 0
  - `date_range`: { earliest: ISO timestamp, latest: ISO timestamp }
  - `by_source`: { "file-watcher": N, "manual": M, ... }
  - `top_tags`: [ { tag: "priority", count: 5 }, ... ] or []
- [ ] Verify stats after inserting 5 thoughts:
  - Insert 5 thoughts with different metadata.source values
  - Call brain_stats
  - Verify `total` = at least 5
  - Verify `by_source` matches inserted sources

### Documentation
- [ ] README has all 4 tools documented:
  - Tool name
  - Parameters (required + optional)
  - Return value schema
  - Example curl request
  - Expected response
- [ ] Example curl commands work as-is:
  ```bash
  # Copy each example from README
  curl ... # Paste directly, should not error
  ```
  Expected: All examples return valid JSON

### Pass/Fail Gate
**✅ PASS if:** All 4 tools work via curl, stats calculated correctly, README examples work, date filters verified  
**❌ FAIL if:** Tools return errors, stats hardcoded or wrong, examples in README don't work

---

## Iteration 5: File Watcher

### Code Inspection
- [ ] `src/watcher.ts` exists with:
  - Monitors `/Users/charlie/.openclaw/workspace/olivier-marcolin/projects/charlie-dashboard/app/` directory
  - Detects create, modify, delete events
  - Calls `captureThought()` on each change
  - Metadata includes: source, file, type, size_bytes, timestamp
- [ ] File watcher starts on server boot:
  - Server code initializes watcher in startup
  - No errors in logs when files change

### Integration Testing
- [ ] Start server:
  ```bash
  npm run dev
  ```
  Expected: No errors, logs show "File watcher started" (or similar)
- [ ] Create a test file in app/ directory:
  ```bash
  touch /Users/charlie/.openclaw/workspace/olivier-marcolin/projects/charlie-dashboard/app/test-file.txt
  ```
- [ ] Verify logged to thoughts table:
  ```bash
  psql -d mcp_brain -c "SELECT content, metadata FROM thoughts WHERE metadata->>'source' = 'file-watcher' ORDER BY created_at DESC LIMIT 1;"
  ```
  Expected: Row with content like "Created app/test-file.txt" + metadata with file path + type
- [ ] Test modify event:
  ```bash
  echo "hello" >> /Users/charlie/.openclaw/workspace/olivier-marcolin/projects/charlie-dashboard/app/test-file.txt
  ```
  Expected: New row in thoughts table with type="modify"
- [ ] Test delete event:
  ```bash
  rm /Users/charlie/.openclaw/workspace/olivier-marcolin/projects/charlie-dashboard/app/test-file.txt
  ```
  Expected: New row with type="delete"
- [ ] Query via search_thoughts:
  ```bash
  curl ... '{"method":"tools/call","params":{"name":"search_thoughts","arguments":{"query":"test-file"}}}'
  ```
  Expected: Returns create + modify + delete events for test-file.txt

### Performance Check
- [ ] Create 10 files rapidly:
  ```bash
  for i in {1..10}; do touch /Users/charlie/.openclaw/workspace/olivier-marcolin/projects/charlie-dashboard/app/test-$i.txt; done
  ```
  Expected: All 10 logged to thoughts table, server doesn't crash, no memory leak

### Pass/Fail Gate
**✅ PASS if:** File changes logged to DB, queryable via search, create/modify/delete all detected  
**❌ FAIL if:** No thoughts created, file changes missed, server crashes on rapid file events

---

## Iteration 6: Claude Code Integration + Documentation

### Code Inspection
- [ ] `.mcp.json` exists with valid JSON:
  ```bash
  jq . .mcp.json > /dev/null
  ```
  Expected: Valid JSON, no syntax errors
- [ ] README.md exists and includes:
  - Installation steps (clear, step-by-step)
  - Starting the MCP server
  - Connecting Claude Code to MCP
  - Using search_thoughts from IDE
  - Troubleshooting section
  - Architecture overview
- [ ] SETUP.md exists with:
  - Prerequisites (Node, Postgres)
  - Install steps (clone, npm install, .env)
  - Running server (npm run build, npm start)
  - Verifying connection (test curl request)
- [ ] No TODO or FIXME comments in code:
  ```bash
  grep -r "TODO\|FIXME" src/
  ```
  Expected: No output (zero matches)

### TypeScript Compilation
- [ ] All code compiles to JavaScript:
  ```bash
  npm run build
  ```
  Expected: JavaScript files in dist/ or similar, no TS errors
- [ ] No type errors:
  ```bash
  npx tsc --noEmit
  ```
  Expected: No output (zero errors)

### GitHub Integration
- [ ] All code committed:
  ```bash
  git status
  ```
  Expected: "nothing to commit, working tree clean"
- [ ] Branch is `phase-2a/iter-1-6-mcp-server-complete`:
  ```bash
  git branch --show-current
  ```
- [ ] Pull request created with:
  - Title: "Phase 2a: MCP Server Complete (Iterations 1-6)"
  - Description: Summary of all iterations, tech decisions, next steps
  - Link to GitHub PR in commit message

### Manual Claude Code Test
- [ ] Claude Code installed on Mac:
  ```bash
  which claude-code || echo "Not in PATH"
  ```
  If not in PATH, that's OK for now (will verify Wed morning)
- [ ] `.mcp.json` points to correct server path:
  ```bash
  grep "command.*node" .mcp.json
  ```
  Expected: Points to `/opt/homebrew/lib/node_modules/openclaw/skills/mcp-copilot/src/server.js` or equivalent

### Pass/Fail Gate
**✅ PASS if:** README complete, code compiles, no TODOs, all committed, PR created  
**❌ FAIL if:** README incomplete, TS errors, uncommitted files, PR not created

---

## 🎯 Overall Phase 2A Pass Criteria

**ALL 6 iterations must pass ALL gates before:**
- [ ] Moving to Phase 2b (Thursday)
- [ ] Declaring Phase 2a "complete"

**If any iteration fails:**
1. Charlie identifies failure reason
2. Charlie fixes code
3. Charlie re-runs checkpoint gate
4. Move forward only when all gates pass

---

## 📋 Quick Reference: What Charlie Tests

### After Iteration 1
- `psql -d mcp_brain -c "\d thoughts"` — table structure OK?
- `psql -d mcp_brain -c "\df match_thoughts"` — function exists?
- `psql -d mcp_brain -c "INSERT INTO thoughts ... "` — insert works?

### After Iteration 2
- `npm run dev 2>&1 | head` — server boots?
- `echo '{"jsonrpc":"2.0"...initialize...' | node src/server.ts` — responds to RPC?

### After Iteration 3
- `curl -X POST http://localhost:3001/rpc ...` — tools callable?
- `psql -d mcp_brain -c "SELECT * FROM thoughts LIMIT 1;"` — data in DB?

### After Iteration 4
- `curl ... brain_stats` — returns valid JSON with correct totals?

### After Iteration 5
- Create/modify/delete files in app/, verify in DB:
  ```bash
  psql -d mcp_brain -c "SELECT content, metadata FROM thoughts WHERE metadata->>'source' = 'file-watcher' ORDER BY created_at DESC LIMIT 5;"
  ```

### After Iteration 6
- `jq . .mcp.json` — valid JSON?
- `grep -r "TODO\|FIXME" src/` — zero matches?
- `git status` — clean?

---

_Last updated: 2026-03-23 11:06 AEST_
