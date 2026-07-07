# Documents — Per-Workspace Cloud Sources (build-later spec)

**Date:** 2026-07-08 · **Status:** SPEC ONLY — approved direction, not yet built · **Requested by Oli:** "for each workspace, the Documents section should feature the clouds in which the binary documents of that workspace live."

## Problem

`/documents` is a stub ("Coming soon"). Binary documents (contracts, invoices, deliverables, production files) don't live in Cockpit — they live in per-entity clouds. Cockpit's job is to be the map, not the filestore: from any workspace, one click to the right cloud, eventually with recent-files visibility and task/project attachment.

## Where the documents actually live (per `_shared` knowledge, verify with Oli at build time)

| Workspace | Primary | Secondary | Notes |
|---|---|---|---|
| `byron-film` | Google Drive (byronfilm.com) | Notion (best-organized), QNAP (production files) | QNAP is LAN-only — link + "LAN only" badge, never API |
| `korus` | OneDrive / SharePoint (KORUS tenant) | Teams files, legacy Notion (Troy-era) | KORUS SG materials live under the same tenant |
| `personal` | Google Drive (oliviermarcolin.com) | Notion | Private iCloud stays private — explicitly OUT of scope |

## Phases

### Phase 1 — Source registry + launcher (ship first, ~half day)
- **Table `document_sources`:** `id uuid`, `workspaceId text` (validated against workspaces), `provider text` (`google-drive | onedrive | sharepoint | teams | notion | qnap`), `label text`, `rootUrl text` (deep link into the cloud UI), `description text?`, `sortOrder int`, `enabled bool`. Numbered migration (`0014_…`), NOT db:push (activity_log drift footgun still stands).
- **UI:** `/documents` becomes per-workspace source cards — provider wordmark (mono label, no logos needed), label, one-line description, "Open ↗". Workspace filter follows the global workspace context like every other page. OM rules apply (radius 0, hairlines, mono labels).
- **Seed** the table from Oli's actual root folder URLs — **open question: collect the 5–7 real URLs** (BF Drive root, BF Notion space, KORUS SharePoint/OneDrive root, KORUS Teams files, OM Drive root, OM Notion).
- No auth work at all in this phase — pure links.

### Phase 2 — Recent files (read-only API browse)
- **Google Drive** (BF + personal): Drive API `files.list` on the workspace's root/shared-drive. Auth: reuse the existing Google OAuth surface (calendar integration + gog patterns already in the estate); add `drive.readonly` scope. Server-side route `GET /api/documents/recent?workspace=…`, cached ~5 min.
- **OneDrive/SharePoint** (KORUS): Microsoft Graph `driveItem` list. **This is the only new auth surface** — needs an app registration in the KORUS tenant; scope `Files.Read.All` (app) or delegated. Flag to Oli before building.
- **QNAP:** never — LAN-only, link card stays static.
- UI: each source card grows a "recent" list (5 files, mono meta: name · modified · owner), click-through to the cloud UI.

### Phase 3 — Attach to work (later, needs product thought)
- "Attach document" on tasks/projects: stores a reference (`document_refs`: entityType/entityId, provider, fileUrl, fileName, snapshot metadata) — never the binary.
- Attachment events flow into `activity_log` (`eventFamily: documents`) per the logging rule: log the outcome.

## Design notes
- Provider marks: JetBrains Mono two-letter codes (GD / OD / SP / NO / QN) in workspace-accent tiles — no third-party logos, consistent with the no-icon-fonts rule.
- Empty state per workspace: "No sources registered — add roots in settings" (Phase 1 seeds make this rare).
- The section must answer one question fast: *"where do I put / find the files for this world?"* — launcher first, browser second.

## Explicitly out of scope
- Storing binaries in Cockpit (Vercel/Neon is the wrong place; specialist systems execute and store).
- iCloud (private), email attachments (that's Messages/bookkeeping territory), Obsidian vault (already has its own export path).

## Open questions for Oli (answer at build kickoff)
1. The real root URLs per workspace (5–7 links).
2. KORUS: SharePoint document libraries or personal OneDrive folders — which is canonical?
3. Does Notion belong here as a "document cloud", or is it Notes-adjacent and confusing to duplicate?
4. Phase 2 Microsoft Graph app registration — who owns the KORUS tenant admin?
