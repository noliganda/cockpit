# Twenty CRM → Cockpit sync

> **One-way inbound** contact sync: the self-hosted Twenty CRM (OM workspace) is the
> source of truth; Cockpit's `contacts` Rolodex (`/contacts`) is a **read-only mirror**.
> Built for task `c68df6e1`; simplified to inbound-only by the 2026-07-15 contacts/CRM
> split (`docs/current/specs/SPEC-2026-07-15-contacts-crm-split.md`). Decision + infra in
> `~/workspaces/dev/crm/DECISION-2026-07-11-open-source-crm.md` and `INFRA.md`.

## Topology — why one-way

The sync graph is deliberately **acyclic**: `Baïkal (CardDAV) → Twenty → Cockpit`.
Person data is authored in the address book / Twenty and flows *into* Cockpit only;
**Cockpit never writes a person field back**. This removes the whole class of
echo/loop bugs and makes the Rolodex a pure view. (The only Cockpit-local, never-synced
fields are `notes` and `tags` — see below.)

Twenty is **tailnet-only** on the Mac Mini (`http://127.0.0.1:3001`), so the public
Vercel app can't reach it. Inbound arrives two ways:

```
Twenty (Mini, tailnet)                          Cockpit (Vercel, public)
   │  person.{created,updated,deleted,destroyed}    ▲
   └──── webhook (HMAC) ───────────────────────────┘   inbound, real-time
                                                        POST /api/crm/webhooks/twenty

Mini launchd worker ── reads Twenty (REST) → writes Neon ──►  reconcile poll
   every 15 min                                               (Vercel never calls the tailnet)
```

- **Real-time:** Twenty pushes person events OUT to the public receiver. The receiver
  verifies `HMAC-SHA256(secret, "${timestamp}:${rawBody}")` against
  `X-Twenty-Webhook-Signature` (scheme from Twenty v2.20.0 source), then upserts the
  contact. `deleted`/`destroyed` detach the link (never delete the contact).
- **Missed-webhook reconcile:** the Mini worker, because only the Mini can reach Twenty.
  Twenty webhooks are fire-and-forget (5 s, no retry), so the reconcile poll is the safety
  net. There is **no outbound (Cockpit → Twenty) pass** — it was deleted 2026-07-15.

## Pieces

| Piece | Path | Runs on |
|---|---|---|
| Field mapping (pure, inbound) | `lib/crm/twenty-mapping.ts` | both |
| REST client + inbound engine | `lib/crm/twenty-sync.ts` | both |
| Webhook receiver | `app/api/crm/webhooks/twenty/route.ts` | Vercel |
| Worker (reconcile, inbound-only) | `scripts/crm/twenty-worker.ts` | Mini |
| launchd entrypoint | `scripts/crm/run-twenty-worker.sh` | Mini |
| launchd schedule | `scripts/crm/com.noliganda.cockpit-twenty-sync.plist` | Mini |
| Schema | `contacts.twenty_person_id` / `vcard_uid` / `twenty_synced_at` (migration `0014`) | Neon |

## Matching & loop-safety

Match precedence is `twenty_person_id` → `vcard_uid` (Baïkal key) → `email`. Inbound
**diffs before writing**, so re-delivery of an unchanged person is a no-op. Because
Cockpit never pushes back, there is no bounce to guard against on the outbound side.

Field ownership (all **Twenty-owned, read-only in Cockpit**): name/first/last, email,
phone, role↔jobTitle, `company`, linkedinUrl, pipelineStage, nextReachDate, source,
vcardUid. `company` is only written inbound when Twenty actually sends one.
**Cockpit-local, never synced:** `notes` and `tags` — their writable home *is* Cockpit
(edited via `PATCH /api/contacts/[id]`, which accepts only those two fields; a `.strict()`
schema 400s any synced field). Non-LinkedIn socials and company/organisation objects are
not synced (person only; no matching Twenty custom fields provisioned).

The DO-NOT-DROP columns `pipeline_stage`, `next_reach_date`, `source`, `company`, and the
`twenty_*`/`vcard_uid` link columns are still written inbound — they simply stopped being
rendered/edited when the Rolodex became read-only.

## Rolodex UI (`/contacts`)

The Contacts section (`/contacts`; old `/crm` URLs 308-redirect) is a **read-only
directory**: search, VCF export (single/batch), project linking (`project_contacts`), and
a per-contact panel that shows synced fields read-only and lets you edit only **notes** and
**tags**. Manually-created rows with no `twenty_person_id` carry a subtle **"local"** badge
(cleanup is a later, separate decision). There is **no** create/delete/edit-person path in
the UI or API.

The dashboard **"New Contact" quick-add was removed** (2026-07-15) — a hint points to the
address book instead: new contacts appear in Cockpit within ~45 min (Baïkal bridge ~30 min
+ reconcile ≤15 min).

## Operate (Mini)

```sh
launchctl list | grep cockpit-twenty                  # loaded?
launchctl start com.noliganda.cockpit-twenty-sync     # trigger a run now
tail -f ~/Library/Logs/cockpit-twenty-sync.log        # watch
# manual / ad-hoc (from repo root) — worker is inbound-only:
scripts/crm/run-twenty-worker.sh                      # reconcile since the sync watermark
scripts/crm/run-twenty-worker.sh --since=48           # reconcile a fixed 48h window
scripts/crm/run-twenty-worker.sh --backfill           # ⚠️ mirror the ENTIRE Twenty book into Cockpit
scripts/crm/run-twenty-worker.sh --dry-run            # preview scan, no writes
```

A legacy positional mode token (`both`/`inbound`/`outbound`) is accepted but ignored — the
launchd entrypoint still passes one; there is only the inbound pass now.

### Reconcile window — why it defaults to the watermark

Reconcile is a **safety net for missed webhooks**, not a backfill. By default it only
looks at Twenty changes newer than the sync high-water mark (`max(twenty_synced_at)`),
so a fresh install imports **nothing historical** — it starts tracking from "now" and
catches anything the webhook drops thereafter. The full Twenty→Cockpit mirror is the
explicit, opt-in `--backfill` (it will create a contact per Twenty person — ~2.7k for OM).

## Secrets

- `TWENTY_OM_API_KEY` — Twenty workspace API key (SOPS vault; worker resolves it via
  `sops --extract` in the launchd entrypoint, never echoed).
- `TWENTY_WEBHOOK_SECRET` — webhook HMAC secret. In the SOPS vault **and** in Vercel
  production env (the receiver reads `process.env.TWENTY_WEBHOOK_SECRET`) **and** on the
  Twenty webhook record — all three must hold the same value.

## The registered webhook

Twenty webhook → `https://cockpit.oliviermarcolin.com/api/crm/webhooks/twenty`,
operations `person.{created,updated,deleted,destroyed}`. Re-register (or rotate the
secret) via `POST/PATCH /rest/webhooks` with a `secret` you also vault + set in Vercel.
Note: Twenty's REST `DELETE` is a **hard delete** → emits `person.destroyed`
(soft-delete from the UI → `person.deleted`); the receiver handles both.

## Scope note

Decision doc §A1 wants Cockpit's Rolodex to eventually show the same contacts as Twenty.
That initial full mirror is **not** automatic — run `--backfill` once, deliberately, when
you want OM's ~2.7k Baïkal contacts pulled into Cockpit. Until then the sync only tracks
contacts touched from "now" forward (watermark default), plus anything edited in Twenty.
Company/organisation objects and `tags`/non-LinkedIn socials are not synced (person only).
