# Phase 5 — Automatic Tool Calling & Integrations

Chatbo.ai now supports an agentic function-calling loop. Enabled tools are exposed to Gemini as function declarations. The model may request one or more tools; the server validates that the tool is enabled, executes it with a timeout, records the result, and sends the function response back to Gemini before producing the final user-facing answer.

## Built-in executors

- Knowledge search — uses the existing RAG retrieval pipeline.
- Send email — uses Resend when `RESEND_API_KEY`/sender defaults are configured or an encrypted per-agent API key is stored.
- Check order status — calls a configured read endpoint with `orderId` and optional bearer token.
- Create support ticket — POSTs a validated JSON payload to a configured service endpoint.
- Human handoff — POSTs conversation context and escalation reason to a configured service endpoint.

## Security

- Tools are disabled by default.
- Only tools explicitly enabled for an agent are declared to the model.
- External credentials are encrypted with AES-256-GCM before storage.
- Tool calls execute only on the server.
- External calls have a 12-second timeout.
- Every execution is recorded with status, input, output/error, duration, provider/request metadata.
- Never place `TOOL_SECRET_KEY` or provider credentials in client-side code.

## Environment

Generate a 32-byte base64 key for `TOOL_SECRET_KEY`. Configure provider defaults only on the server.

```bash
TOOL_SECRET_KEY=<base64-encoded-32-byte-secret>
RESEND_API_KEY=<optional-server-default>
TOOL_EMAIL_FROM=<verified-sender>
```

## Integration configuration

Per-agent tool configuration is stored in `agent_tools.config`. Secret-looking values such as API keys, tokens, secrets and passwords are encrypted before persistence.

For production integrations, use dedicated least-privilege credentials and restrict endpoint hosts. The current generic endpoint executors are deliberately narrow; OAuth providers such as Shopify, Slack, Google Calendar and Microsoft are best added as dedicated connectors with their own authorization and token-refresh lifecycle.

## Function-calling loop

`User → Gemini → tool call → permission check → executor → tool result → Gemini → final response`

The loop is capped at three tool rounds to prevent runaway execution.
