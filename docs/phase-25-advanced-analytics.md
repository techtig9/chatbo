# Phase 25 — Advanced Analytics & AI Intelligence

Chatbo now has an executive-ready analytics surface built on existing production telemetry.

## Included
- 7/30/90 day analytics dashboard
- Agent performance: runs, failures, latency, cost, quality
- AI quality from agent quality scores/evaluation scores
- User feedback satisfaction
- Provider/model performance
- Token and cost economics
- Channel distribution
- Lead/conversion/revenue outcomes
- Daily trend visualization
- CSV export
- Saved dashboard/report database foundation

## Data sources
The analytics engine reads `agent_runs`, `ai_usage_records`, `messages`, `agent_business_events`, `eval_results`, and `conversations` using the active workspace boundary.

## Important production note
Analytics are currently calculated from source telemetry at request time. For very large enterprise tenants, Phase 29 should add rollups/materialized aggregates and scheduled precomputation rather than scanning raw events for every dashboard request.

## CSV export
`GET /api/analytics/export?days=30` exports daily trend data for the authenticated workspace.
