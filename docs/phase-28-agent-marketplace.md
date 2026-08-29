# Phase 28 — AI Agent Marketplace & Template Ecosystem

Phase 28 introduces the marketplace foundation for turning Chatbo agents into reusable, discoverable templates.

## Included
- Public, unlisted and private marketplace listings.
- Agent manifest sanitization that removes secret-like configuration values.
- Versioned marketplace manifests with SHA-256 checksums.
- Security-scan status fields and publication review state.
- Free/paid pricing metadata and licensing metadata.
- Marketplace discovery dashboard and categories.
- Install records scoped to the target workspace.
- Ratings/reviews and rating aggregation.
- Abuse/report records.
- RLS for public discovery and tenant isolation.

## Publishing lifecycle
`draft -> pending_review -> published` (or `rejected`) -> `archived`

Public listings enter `pending_review`. A production moderation worker/admin workflow should perform deeper dependency, prompt, integration, malware and policy checks before setting `security_scan_status=passed` and `status=published`.

## Manifest security
Marketplace manifests are metadata/configuration only. OAuth tokens, API keys, passwords, authorization headers, tenant identifiers and private knowledge contents must never be published. The sanitization helper redacts secret-like keys as a defense-in-depth measure.

## Installation
Phase 28 creates an installation record and returns the sanitized manifest. It deliberately does not silently clone private knowledge, integrations, credentials or workflows. A future production installer should present dependencies and require explicit user choices before cloning supported assets.

## Payments
Paid listings are modeled with price/currency/license fields, but paid checkout is intentionally blocked until marketplace billing, creator payouts, tax handling, refunds and entitlement verification are implemented.

## Production requirements
Before marketplace launch, add:
- Admin moderation queue and appeal flow.
- Malware/content scanning for uploaded assets.
- Dependency and permission review.
- Prompt-injection/security evaluation.
- Creator verification.
- Version compatibility checks and rollback.
- Paid checkout, creator payouts, tax/KYC and refunds.
- License enforcement and entitlement service.
- Abuse rate limits and automated reputation signals.
