import * as Sentry from "@sentry/nextjs";

// No-ops safely when SENTRY_DSN is unset (local dev, this sandbox,
// or a deploy that hasn't been given one yet) — Sentry.init with an
// empty dsn just means events aren't sent, not a crash.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  // Keep this off unless actively debugging Sentry itself — verbose
  // and not something a production log stream needs.
  debug: false,
});
