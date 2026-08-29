# Phase 26 — Advanced Knowledge & RAG

Phase 26 upgrades Chatbo's knowledge layer from a simple bot-scoped source list into an enterprise-ready retrieval foundation.

## Included
- Reusable `knowledge_bases` containers with automatic migration of existing bot sources.
- Source metadata, versioning, freshness state and scheduled-sync fields.
- Source-level permission records.
- Durable ingestion/crawl job records with retry state.
- Retrieval telemetry.
- Hybrid semantic + PostgreSQL full-text retrieval using Gemini's 768-dimensional embeddings.
- Metadata filtering.
- Same-origin website crawling with a hard 25-page cap.
- Sitemap URL extraction.
- Knowledge Intelligence dashboard.
- Search and crawl API foundations.

## Important production notes
The crawler intentionally limits pages and stays on the same origin. A production deployment should add robots.txt policy enforcement, SSRF protections, queue workers and rate limiting before allowing arbitrary user-controlled URLs.

The current app's existing text ingestion remains intact. PDF/DOCX extraction should be implemented with dedicated parsers in a worker environment rather than pretending browser/server text extraction is sufficient.

Actual physical data residency still depends on the selected infrastructure/provider region.
