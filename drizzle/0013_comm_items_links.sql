-- 0013: comm_items deep-link fields
-- account: mailbox address the item came from (enables account-precise Gmail links)
-- source_url: full deep link supplied by the producer — wins over any computed link
ALTER TABLE comm_items ADD COLUMN IF NOT EXISTS account text;
ALTER TABLE comm_items ADD COLUMN IF NOT EXISTS source_url text;
