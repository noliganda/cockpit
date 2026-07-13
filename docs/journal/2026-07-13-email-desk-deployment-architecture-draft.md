# Email Desk deployment architecture — draft for approval

**Date:** 2026-07-13
**Status:** Draft only; implementation not approved or started
**Scope:** Personal Mac Mini pilot with a path to a separate KORUS staff product

## Decision summary

- Herdr directly owns the persistent named `email-desk` session; do not stack tmux underneath it.
- `maildesk` CLI is the canonical agent interface. MCP is an optional thin adapter, not the domain foundation.
- Original mail remains authoritative in Gmail and Microsoft 365.
- Complete normalized threads and detailed decision history stay encrypted on the Mac Mini.
- Native mailbox providers hold drafts and sent messages.
- Cockpit receives sanitized operational projections only; no raw bodies or mailbox credentials.
- Remote conversational access reaches the Mini over Tailscale + SSH + Herdr. The Cockpit browser never calls localhost.
- A future Cockpit conversation surface must use an authenticated outbound-only Mini worker, not an inbound tunnel.
- The Email Desk core remains independent of Cockpit so another control plane or KORUS tenant UI can use it later.

## Deployment boundary

```text
Gmail / Microsoft 365                         Original messages
          |
          v
Mac Mini: encrypted Email Desk store          Complete local working copy
          |
          +-- maildesk CLI
          +-- Herdr session: email-desk
          +-- Hermes / Sentinel
          +-- native mailbox drafts
                    |
                    | sanitized projection only
                    v
Cockpit on Vercel + Neon                       Attention, status, decisions
```

## Data placement

### Mail providers

Gmail and Microsoft 365 remain the system of record for original messages, native drafts and sent messages.

### Mac Mini

Proposed runtime location:

`~/Library/Application Support/Maildesk/maildesk.sqlite`

Production properties:

- SQLCipher encryption; key held in macOS Keychain.
- FileVault provides an additional device-level layer.
- Local normalized message bodies, thread history and detailed decision ledger.
- Attachment metadata indexed; attachment bytes fetched only on demand.
- Provider IDs retained for verification against the authoritative mailbox.
- Runtime data lives outside Git and outside `~/workspaces`.

### Cockpit

Cockpit's existing `comm_items` contract already stores sender, subject, short agent-written preview, classification, urgency, draft status, task linkage and source deep link. It explicitly excludes raw bodies and credentials. Preserve that boundary.

Additional policy:

- Publish only a sanitized operational summary.
- Keep complete thread summaries and detailed reasoning local by default.
- Record outcomes in Cockpit without reproducing confidential correspondence.
- Treat Cockpit as a replaceable control-plane adapter, not the Email Desk core.

## Runtime interfaces

### CLI first

The shared domain/service is exposed canonically through a compact `maildesk` CLI with bounded JSON output. Hermes, Claude Code, Codex, cron and ordinary shell scripts use the same interface. A future MCP adapter may wrap the same service for hosts that cannot use a shell; it must not duplicate domain logic.

### Herdr session

Herdr 0.7.3 on the Mini has a persistent server, named sessions and remote SSH attachment. The Email Desk agent owns a direct Herdr PTY. Herdr provides continuity across client disconnect/reattach; Cockpit and the local database provide durability across process or machine restarts.

## Remote access

### Laptop, Studio or remote IDE

The user connects over Tailscale + SSH to the Herdr server on the Mini and attaches to the same named `email-desk` session. An IDE may use Remote SSH and invoke `maildesk` on the Mini. The database is not copied to the client.

### Phone

Sentinel sends a stable thread reference. The user can attach through the existing Moshi/mosh path or reply through a Hermes gateway conversation whose agent executes on the Mini.

### Explicit non-design: browser to localhost

The Vercel Cockpit app must never call a localhost API. On a remote browser, localhost refers to that phone/laptop, not the Mini. Browser private-network restrictions, origin security and the resulting public tunnel would create an unsafe bridge into the machine holding mail.

For the personal v1, Cockpit items link to the native Gmail/Outlook message and display a stable Email Desk thread ID. Deep conversation takes place in Herdr/Hermes.

## Optional future Cockpit conversation bridge

If a conversational web surface is later approved:

1. Cockpit writes an authenticated queued request to its cloud store.
2. A Mini worker polls outbound over HTTPS.
3. The worker resolves the request against the local store and agent.
4. It posts a sanitized answer/status back to Cockpit.

Requirements:

- No inbound port or public tunnel on the Mini.
- Signed, scoped and audited requests.
- Explicit policy for whether any raw excerpts may enter the cloud.
- Sensitive answers may remain available only in Herdr.

This bridge is not part of personal v1.

## KORUS product boundary

The personal pilot may validate the domain model but is not itself the staff deployment. A KORUS version requires:

- Microsoft Entra ID authentication.
- Per-user/delegated Graph authorization.
- Tenant isolation, RBAC and scoped service credentials.
- Audit, approvals, retention and DLP policy.
- A private KORUS worker in Azure or another approved tenant environment.
- A Teams, Copilot or dedicated web surface over the same provider-neutral service.

Current Cockpit authentication and shared harness bearer are not sufficient for a multi-user staff email product.

## Build-vs-adopt gate

Before production implementation, audit Inbox Zero, Mail0/Zero and Microsoft 365 Copilot against this boundary. Reuse connector/sync/UI components only where licence, security and architecture fit. The differentiated product is the agent-neutral correspondence and decision layer, not generic email summarization.

## Approval gate

No implementation starts until Oli approves this deployment boundary and the scope of the first build-vs-adopt spike.
