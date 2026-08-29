-- chatbo.ai — knowledge source status/type expansion (Phase 12, Knowledge page)
-- Spec section 74 wants 5 status states (Uploading, Processing, Indexing,
-- Ready, Failed) and 7 source types (PDF, DOC, CSV, URL, Text, Website,
-- Integration) with meaningful progress. The schema only had 3 statuses
-- (processing/ready/failed, with no distinction between "queued" and
-- "actively chunking/embedding") and 3 types (file/text/url, with no
-- distinct multi-page "website" type — lib/knowledge/crawl.ts already
-- implements a real crawler, but nothing ever wrote its results as
-- knowledge sources). "Uploading" is intentionally not added here — it's
-- a client-side-only state (the browser transmitting a file before any
-- server-side row exists), not something the database can represent.
-- "Integration" isn't added either: no integration-sourced knowledge
-- ingestion path exists yet, and adding a type nothing ever sets is a
-- worse gap than the enum simply not listing it.
alter table knowledge_sources drop constraint knowledge_sources_status_check;
alter table knowledge_sources add constraint knowledge_sources_status_check
  check (status in ('processing', 'indexing', 'ready', 'failed'));

alter table knowledge_sources drop constraint knowledge_sources_type_check;
alter table knowledge_sources add constraint knowledge_sources_type_check
  check (type in ('file', 'text', 'url', 'website'));
