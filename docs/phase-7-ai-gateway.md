# Phase 7 — AI Gateway, Intelligent Routing & Usage

## Goal

Decouple Chatbo.ai from any single model provider. Agents now talk to a normalized gateway which can route requests to Gemini, Groq, Cerebras, OpenRouter, or Anthropic when those providers are configured.

## Routing modes

- `auto`: infer simple/normal/complex task complexity.
- `fast`: prefer low-latency providers such as Groq/Cerebras.
- `balanced`: prefer Gemini, then configured fallbacks.
- `advanced`: prefer Anthropic/OpenRouter/Gemini for complex tasks.

The agent builder already exposes these modes through `agent_config.model`.

## Provider fallback

The gateway tries the selected provider and then configured fallbacks. Provider keys are read only on the server. The browser never receives provider secrets.

## Tool calling

The gateway normalizes tool declarations and tool results across Gemini, OpenAI-compatible providers, and Anthropic. The application remains responsible for executing tools; the model only requests them.

## Cost tracking

Every gateway request can be recorded in `ai_usage_records` with input/output/cached token counts, latency, provider/model, success status, and estimated cost. Cost values are intentionally configured through environment variables so provider pricing changes do not silently alter the application.

## Caching

Gemini's current API supports implicit caching on recent models and explicit cached content. The gateway records cached-token counts when the provider reports them; future phases can add explicit cache lifecycle management for large, repeated agent context.

## Security

- Provider keys are server-only.
- Agent-selected modes cannot directly inject arbitrary provider URLs.
- Only an allowlisted provider set is routable.
- Tool execution remains server-side and permission-checked.
- Usage records are scoped to the workspace.

## Recommended next phase

Phase 8 should focus on production-grade **Agent Evaluation, Testing & Quality Assurance**: automated test suites, regression tests, tool-call evaluation, groundedness checks, latency/cost scoring, and version comparison before publishing.
