# Phase 4 — Deploy & Verify (FINAL CORE PHASE)

Phases 1-3 are DONE. Build compiles clean. This phase is about making it LIVE.

## Tasks

### 1. Verify Notion Sync Works
- Run the sync locally: `curl -X POST http://localhost:3000/api/sync/notion`
- Verify tasks appear in DB from all 3 Notion DBs
- Fix any mapping issues (status names, property detection)

### 2. Verify Auth Gate
- Test POST `/api/auth` with password
- Verify cookie is set, pages are gated
- Ensure KORUS guest auth works separately for `/metrics/korus`

### 3. Mobile Responsive Pass
- Check every page renders at 375px width
- Sidebar becomes hamburger drawer on mobile
- Tables collapse to card layouts on small screens
- Kanban scrolls horizontally
- Touch-friendly tap targets (min 44px)

### 4. Seed Route
- POST `/api/seed` should trigger Notion sync + create default areas (8 Core Concepts)
- Must be idempotent

### 5. Fix Any TypeScript Warnings
- No `any` in business logic
- Clean lint where reasonable

### 6. Git Commit
```bash
git add -A && git commit -m "feat: v3 Phase 4 — deploy-ready, verified routes, mobile responsive"
```

### 7. Signal Completion
Write "PHASE_4_COMPLETE" to `/tmp/dashboard-build-status.txt`
Then run: `openclaw system event --text "Done: Phase 4 complete — dashboard deploy-ready" --mode now`

## NOT IN SCOPE (Phase 5+)
These are future features, do NOT build them now:
- Supabase vector embeddings / pgvector
- Chat widget (OpenClaw Gateway WebSocket)
- Voice input / camera / Web Speech API
- BlockNote rich text editor
- Two-way Notion sync (push back)
- OpenAI embedding generation on mutations
