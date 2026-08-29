# Phase 13 — Real Provider Integrations

Chatbo now has a provider-adapter layer for WhatsApp Cloud API, Slack, Discord, Microsoft Teams webhook delivery, and Resend email delivery.

## Flow

Provider webhook → provider signature/verification → normalized event → shared agent brain → provider adapter → outbound message → channel event audit.

## Security

Provider credentials are encrypted with the existing `TOOL_SECRET_KEY` AES-256-GCM configuration helper. Dashboard forms mask secrets and preserve `***` values when editing.

## Endpoints

- `/api/channels/webhook/whatsapp`
- `/api/channels/webhook/slack`
- `/api/channels/webhook/discord`
- `/api/channels/webhook/teams`
- `/api/channels/webhook/email`
- `/api/channels/oauth/slack?botId=<agent>`

Slack OAuth is wired to the official Slack OAuth v2 exchange. Discord OAuth is intentionally left as a provider scaffold until the bot installation/token strategy is configured for the customer's Discord application.

## Required production configuration

Set `TOOL_SECRET_KEY`, `CHANNEL_OAUTH_SECRET`, provider credentials, and the provider-specific webhook URLs/secrets before enabling production traffic. Never put provider secrets in client-side code.
