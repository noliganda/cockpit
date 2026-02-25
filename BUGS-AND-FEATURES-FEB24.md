
---

## Added Feb 25

### Sprint Planning View (NEW FEATURE)
**Layout:** Split-panel view
- **LEFT:** All unassigned/backlog tasks in the workspace (filterable, scrollable list)
- **RIGHT:** Sprint board (Kanban columns by status)
- **Interaction:** Drag tasks from left panel → drop into sprint on right
- **Use case:** Batch-plan sprints by cherry-picking from the task backlog
- Priority: Medium — after core bugs are fixed

### Bugs Found Feb 25
- [x] CRM contact detail "not found" — FIXED
- [ ] Project detail "not found" — IN PROGRESS
- [ ] Project duplicate entries on create — IN PROGRESS
- [ ] Task dialog missing Project field — FIXED
- [ ] Google OAuth callback blank page — FIXED
- [ ] Email integration (Gmail read-only) — QUEUED
- [ ] WhatsApp integration (wacli read-only) — QUEUED

---

## Bruno's /metrics/korus — What We Promised (from security brief to Bruno)

### KPIs from email approval conditions (Feb 12):
1. **Tasks completed** — count + list
2. **Emails sent** — count (with Oli validation rate)
3. **Response times** — how fast Charlie handles incoming requests
4. **Interventions needed** — times Oli had to step in/correct

### From security brief (Section 10 — Months 1-3):
5. **Usage metrics** — measure value and identify risks
6. **Audit trail** — all communications traceable

### What Bruno should see on /metrics/korus:
- Tasks completed this month (KORUS workspace)
- Emails sent/drafted (KORUS context)
- Recruitment pipeline stats (candidates sourced, contacted, responded)
- Documents produced (translations, business plan, financial model)
- Outreach activity (LinkedIn, email campaigns)
- Response time metrics
- Intervention/correction rate
- Activity timeline (what happened, when)
- Link accessible from KORUS dashboard sidebar/menu

### Areas — BROKEN
- Marcus Whitney 8 Core Concepts replaced with random categories
- No add/remove/rename area functionality
- Need: dynamic areas per workspace, MW8 as default template, CRUD operations
