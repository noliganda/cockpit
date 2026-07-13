-- 0014_contacts_twenty_link
-- Cockpit ⇄ Twenty CRM sync (task c68df6e1). Additive only.
-- twenty_person_id  : Twenty person UUID — the strong idempotency key for upserts.
-- vcard_uid         : Baïkal-origin vCard UID — fallback match (bridge already stamps every person).
-- twenty_synced_at  : last successful reconcile with Twenty (dedupe / staleness).

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS twenty_person_id text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS vcard_uid text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS twenty_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS contacts_twenty_person_idx ON contacts (twenty_person_id);
CREATE INDEX IF NOT EXISTS contacts_vcard_uid_idx ON contacts (vcard_uid);
