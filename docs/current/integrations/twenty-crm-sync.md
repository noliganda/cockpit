# Twenty CRM ⇄ Cockpit sync

> Two-way contact sync between Cockpit (`contacts`) and the self-hosted Twenty CRM
> (OM workspace). Built for task `c68df6e1`; decision + infra in
> `~/workspaces/dev/crm/DECISION-2026-07-11-open-source-crm.md` and `INFRA.md`.

## Why the split topology

Twenty is **tailnet-only** on the Mac Mini (`http://127.0.0.1:3001`), so the public
Vercel app can't reach it. The sync is therefore split by who can talk to whom:

```
Twenty (Mini, tailnet)                          Cockpit (Vercel, public)
   │  person.{created,updated,deleted,destroyed}    ▲
   └──── webhook (HMAC) ───────────────────────────┘   inbound, real-time
                                                        POST /api/crm/webhooks/twenty

Mini launchd worker ── Neon (DB) + Twenty (REST) ──►    outbound + reconcile poll
   every 15 min                                         (Vercel never calls the tailnet)
```

- **Twenty → Cockpit (real-time):** Twenty pushes person events OUT to the public
  receiver. The receiver verifies `HMAC-SHA256(secret, "${timestamp}:${rawBody}")`
  against `X-Twenty-Webhook-Signature` (scheme from Twenty v2.20.0 source), then
  upserts the contact. `deleted`/`destroyed` detach the link (never delete the contact).
- **Cockpit → Twenty** and **missed-webhook reconcile:** the Mini worker, because
  only the Mini can reach Twenty. Twenty webhooks are fire-and-forget (5 s, no retry),
  so the reconcile poll is the safety net.

## Pieces

| Piece | Path | Runs on |
|---|---|---|
| Field mapping (pure) | `lib/crm/twenty-mapping.ts` | both |
| REST client + sync engine | `lib/crm/twenty-sync.ts` | both |
| Webhook receiver | `app/api/crm/webhooks/twenty/route.ts` | Vercel |
| Worker (outbound + reconcile) | `scripts/crm/twenty-worker.ts` | Mini |
| launchd entrypoint | `scripts/crm/run-twenty-worker.sh` | Mini |
| launchd schedule | `scripts/crm/com.noliganda.cockpit-twenty-sync.plist` | Mini |
| Schema | `contacts.twenty_person_id` / `vcard_uid` / `twenty_synced_at` (migration `0014`) | Neon |

## Matching & loop-safety

Match precedence is `twenty_person_id` → `vcard_uid` (Baïkal key) → `email`. Both
directions **diff before writing**, so an echo of our own change produces no write and
the loop dies on the first bounce. Outbound only considers contacts where
`twenty_synced_at IS NULL OR updated_at > twenty_synced_at`; inbound stamps both equal,
so a Twenty-origin change is never pushed back.

Field ownership: name/first/last, email, phone (E.164 only — Twenty rejects national
format), role↔jobTitle, linkedinUrl, pipelineStage, nextReachDate, source, vcardUid.
`company` is only written inbound when Twenty actually sends one. `tags` and non-LinkedIn
socials are **not** synced (no matching Twenty custom fields provisioned). Company/
organisation objects are **not** synced yet — person only.

## Operate (Mini)

```sh
launchctl list | grep cockpit-twenty                  # loaded?
launchctl start com.noliganda.cockpit-twenty-sync     # trigger a run now
tail -f ~/Library/Logs/cockpit-twenty-sync.log        # watch
# manual / ad-hoc (from repo root):
scripts/crm/run-twenty-worker.sh outbound             # push Cockpit → Twenty only
scripts/crm/run-twenty-worker.sh inbound --since=48   # reconcile last 48h
scripts/crm/run-twenty-worker.sh both --dry-run       # preview, no writes
```

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

The reconcile mirrors *edited* Twenty people into Cockpit as intended ("Cockpit's CRM
section shows the same contacts", decision doc §A1). In steady state the Baïkal bridge
makes no edits, so no mass mirroring occurs — but a bulk Twenty change would flow a large
batch of contacts into Cockpit. Scope to Cockpit-originated contacts here if that's not wanted.
