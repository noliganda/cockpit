# Cockpit — Codex Task Queue

Auto-managed by Charlie. Updated after each task completes.

## Status legend
- ✅ Done
- 🔄 In progress
- ⏳ Queued
- ❌ Blocked

---

## Completed
- ✅ **Agent execution model** — budget tracking, task checkout, budget policies (commit 6f372b7)

---

## Active queue (in order)

### Task 2 — Area → Agent routing ⏳
Wire Devon/Finn/Hunter/Marcus/Scout/Charlie to actual Cockpit areas in the operators table.

**What to build:**
- Add `areaId` field to operators table (FK → areas.id) — which area each operator manages
- Seed the operator → area mapping in migration 0007
- Add a simple API route `GET /api/operators` to list operators with their area context
- When a task is created with a workspace/area, auto-assign to the area's operator if unassigned
- Log routing decisions to `activity_log`

**Files to touch:**
- `lib/db/schema.ts` (extend operators)
- `drizzle/0007_opsv5_operator_area_routing.sql`
- `app/api/operators/route.ts` (new)
- `lib/intake-pipeline.ts` (add auto-routing logic)

---

### Task 3 — AI classification for intake ⏳
Replace keyword classifier with LLM call using haiku/flash model.

**What to build:**
- Add `classifyWithAI()` function in `lib/intake.ts`
- Input: raw text + workspace hints + available operators + object types
- Output: structured JSON (type, workspace, priority, assignee, confidence, reasoning)
- Use `gpt-4o-mini` as default, configurable via `intake.classifier.model` in config
- Fallback to current keyword classifier if AI call fails
- Keep existing `classify()` as fallback
- Add `OPENAI_API_KEY` check with graceful fallback

**Files to touch:**
- `lib/intake.ts` (add AI classifier, make keyword classifier the fallback)
- Optional: `lib/intake-config.ts` for classifier config

---

### Task 4 — Commit and push after each task ⏳
After each task completes:
- git add .
- git commit -m "feat: [description]"
- git push

---

## Notes
- Codex must NOT run `npm run dev` or start servers
- Codex must NOT touch UI unless explicitly asked
- Codex must NOT run DB migrations (only create SQL files)
- All migrations must be idempotent (IF NOT EXISTS, ON CONFLICT DO NOTHING)
- After each task: run `openclaw system event --text "Done: [summary]" --mode now`
