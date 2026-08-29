# Chatbo.ai — Final 30-Phase Build

This ZIP is the cumulative final build produced from the completed 30-phase Chatbo.ai roadmap.

## AI provider policy

The automatic completion gateway follows this exact policy:

### Simple / normal work

**Groq → Cerebras → OpenRouter**

### Complex / difficult work

**Groq → Cerebras → OpenRouter → Anthropic Claude**

Claude is only added to the automatic chain when the gateway classifies the request as complex/difficult.

If the active provider reaches its quota/rate limit (normally HTTP 429), or another provider request fails, Chatbo automatically continues to the next configured provider.

## Required keys

```env
GROQ_API_KEY=
CEREBRAS_API_KEY=
OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=
```

All are optional individually; the router uses whichever keys are configured. For the requested full failover chain, configure all four.

## Model overrides

```env
GROQ_MODEL=llama-3.3-70b-versatile
CEREBRAS_MODEL=llama-3.3-70b
OPENROUTER_MODEL=openai/gpt-4.1-mini
ANTHROPIC_MODEL=claude-sonnet-4-5
```

## Gemini

Gemini remains implemented for compatibility/explicit use and embeddings, but it is intentionally not in the automatic chat failover chain. This prevents accidental Gemini usage and keeps the requested routing deterministic.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Add Supabase credentials.
3. Add the AI provider keys you want to use.
4. Apply all SQL migrations in `supabase/migrations/` in order.
5. Install dependencies with `npm install`.
6. Run `npm run typecheck` and `npm run build` locally.
7. Start with `npm run dev`.

## Important

API keys must remain server-side. Never rename provider keys with a `NEXT_PUBLIC_` prefix.
