# Chatbo AI Provider Failover Policy

## Automatic order

Chatbo uses this production policy for AI chat/completion requests:

### Simple and normal tasks

1. Groq
2. Cerebras
3. OpenRouter

### Complex/difficult tasks

1. Groq
2. Cerebras
3. OpenRouter
4. Anthropic Claude

Claude is never selected for a simple or normal request by the automatic router.

## Automatic failover

When a provider fails, the gateway continues to the next provider. This includes:

- HTTP 429 rate limits
- Quota exhaustion
- Provider capacity errors
- Temporary provider outages
- Network/request failures
- Other unsuccessful provider responses

Therefore, if the Groq key reaches its limit, Chatbo automatically tries Cerebras. If Cerebras is exhausted, it tries OpenRouter. For complex tasks, if OpenRouter also fails, it finally tries Claude when `ANTHROPIC_API_KEY` is configured.

## API keys

Configure these server-side only:

```env
GROQ_API_KEY=...
CEREBRAS_API_KEY=...
OPENROUTER_API_KEY=...
ANTHROPIC_API_KEY=...
```

Never expose these keys with `NEXT_PUBLIC_` prefixes.

## Model configuration

```env
GROQ_MODEL=llama-3.3-70b-versatile
CEREBRAS_MODEL=llama-3.3-70b
OPENROUTER_MODEL=openai/gpt-4.1-mini
ANTHROPIC_MODEL=claude-sonnet-4-5
```

Models can be changed without changing application code.

## Gemini

Gemini remains supported by the lower-level gateway for explicit/legacy use, but it is deliberately removed from the automatic fallback chain so the requested Groq → Cerebras → OpenRouter → Claude policy is deterministic.
