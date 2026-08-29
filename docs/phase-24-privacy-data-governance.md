# Phase 24 — Privacy, Data Governance & Compliance

Phase 24 adds the privacy/data-governance foundation for enterprise Chatbo deployments.

## Included
- Organization privacy settings
- PII detection/redaction helper
- Data subject request tracking: access, export, deletion, rectification, restriction
- Consent record storage
- Retention-run tracking foundation with dry-run support
- Privacy Center dashboard
- Security/audit logging for privacy actions

## Important implementation boundary
This phase intentionally does not pretend that a single database query constitutes a complete GDPR/CCPA export or deletion. Production deletion/export must enumerate every enabled data store, object store, queue, provider and backup, apply authorization/dependency checks, and produce auditable evidence.

Data residency is a governance preference in this phase; actual residency depends on configured infrastructure providers and deployment topology.
