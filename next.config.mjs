/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // NOTE: the public widget must render inside a third-party host page's
  // iframe by design (Phase 1.5) — CSP frame-ancestors is intentionally
  // permissive for /widget and /chat/[slug] only. Everything else stays
  // locked to 'self'. Tightened further in Phase 1.17 once the widget's
  // real embed domains are known.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.voyageai.com https://*.ingest.sentry.io",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/((?!widget|chat).*)",
        headers: securityHeaders,
      },
      {
        // /widget and /chat were excluded from the block above because
        // they need a different CSP (must be embeddable in a third-party
        // iframe) — but that left them with NO headers at all, not even
        // a relaxed CSP or any caching directive. This is the actual fix:
        // their own appropriate CSP, plus the real (verifiable via
        // curl -I) edge-caching mechanism for these pages, since the
        // `export const revalidate` approach tried first turned out not
        // to do anything for Supabase-JS-backed data (see the comment in
        // app/widget/[botId]/page.tsx).
        source: "/(widget|chat)/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.voyageai.com https://*.ingest.sentry.io",
              // Deliberately permissive — these pages exist specifically
              // to be embedded on arbitrary customer domains. Per-bot
              // domain restriction (allowed_domains) is enforced at the
              // API layer (isOriginAllowed), not here — this header
              // can't know which bot's page is being requested.
              "frame-ancestors *",
            ].join("; "),
          },
          {
            key: "Cache-Control",
            // s-maxage: CDN/edge caches this response for 60s and can
            // serve it without hitting the origin. stale-while-revalidate:
            // for the next 5 minutes after that, a stale copy is served
            // immediately while a fresh one is fetched in the background,
            // rather than every visitor after the 60s mark blocking on a
            // fresh render. Unpublishing a bot takes up to ~60s to
            // propagate — an accepted, documented tradeoff, not silent.
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
};

// withSentryConfig degrades gracefully without SENTRY_AUTH_TOKEN/ORG/PROJECT
// set — source map upload is skipped rather than failing the build, which
// is exactly the behavior needed here (no real Sentry project connected
// yet). silent:true keeps that skip from being noisy in every build log.
//
// disableLogger/automaticVercelMonitors moved into webpack.* in Phase
// 1.22 — caught as real deprecation warnings in the build output (not
// hypothetical, actually printed), not left as stale top-level options
// just because they still technically worked.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});
