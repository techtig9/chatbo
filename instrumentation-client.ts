import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  // Session replay is off by default — it's a meaningful privacy
  // surface (captures DOM content, potentially including things a
  // customer typed into the widget) and shouldn't be enabled without a
  // deliberate decision + a documented masking policy, not as a default
  // side effect of adding error monitoring.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  debug: false,
});

// The build's own "ACTION REQUIRED" notice asked for this explicitly —
// without it, Sentry can't instrument client-side route transitions for
// performance tracing. Added in Phase 1.22 after actually reading the
// build output rather than treating a clean typecheck as the finish
// line.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
