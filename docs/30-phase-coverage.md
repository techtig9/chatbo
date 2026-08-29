# 30-Phase Coverage Manifest

This is the cumulative final Chatbo.ai source tree. Earlier phases are integrated into the same codebase rather than shipped as 30 unrelated applications.

1. Core SaaS foundation — app, auth, Supabase, dashboard, deployment config
2. Professional product UI — dashboard/components/layout system
3. Authentication/onboarding — signup/login/reset/MFA/onboarding flows
4. Tools — agent tools and execution infrastructure
5. Integrations — integration/tool foundations
6. Bot/agent builder — bot editor, prompts, configuration, widget
7. AI Gateway — multi-provider server-side gateway and usage accounting
8. Evaluations — evaluation/scoring infrastructure
9. Billing/credits — billing, plans, credits and usage controls
10. Production foundations — validation, monitoring, security and operational infrastructure
11. Knowledge/RAG foundations — ingestion, chunking, embeddings and retrieval
12. Omnichannel — channel architecture and messaging surfaces
13. Provider integrations — provider connection/tool infrastructure
14. Developer API — versioned API and API-key infrastructure
15. Developer SDK — TypeScript/Python SDK surfaces
16. Workflows — workflow builder/execution
17. Durable workflows — durable job/workflow execution
18. Human approvals — approval gates and approval UI
19. Multi-agent — specialist-agent collaboration
20. Multi-agent orchestration — supervisor/orchestration layer
21. Enterprise organizations — workspaces, teams, organization administration
22. Enterprise identity — SSO/SCIM/MFA/identity controls
23. Security/compliance — audit, governance and security controls
24. Privacy/data governance — PII, consent, data-subject request and retention foundations
25. Advanced analytics — AI quality, cost, business and operational analytics
26. Advanced Knowledge/RAG — hybrid retrieval, crawler, sitemap, permissions and retrieval telemetry
27. Integrations marketplace — OAuth connections, actions, webhooks and integration catalog
28. Agent marketplace — publishing, manifests, versions, installs, reviews and moderation
29. Reliability/scale — retries, circuit breakers, idempotency, jobs, health checks and SSRF protection
30. Launch/growth — pricing, launch readiness, referrals, feedback and SEO foundations

## AI routing update in the final build

Automatic chat/completion routing is:

- Simple/normal: Groq → Cerebras → OpenRouter
- Complex/difficult: Groq → Cerebras → OpenRouter → Anthropic Claude

Provider failure, including quota/rate-limit exhaustion, automatically advances the chain. Claude is not automatically selected for simple/normal tasks.
