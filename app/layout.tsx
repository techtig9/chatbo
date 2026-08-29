import type { Metadata } from "next";
import "./globals.css";

/**
 * All three fonts load via CDN <link> rather than next/font/google.
 * next/font/google was tried first (it self-hosts fonts at build time,
 * which is strictly better for privacy and avoids a runtime third-party
 * request) — but it requires network access to fonts.googleapis.com
 * DURING THE BUILD ITSELF, which failed outright in this sandbox's
 * restricted build environment and would fail identically in any CI
 * environment that blocks external network access during build steps
 * (common in locked-down corporate CI). A hard build-time dependency on
 * a third-party API being reachable is a fragile choice regardless of
 * environment. CDN <link> tags push that same network dependency to
 * the browser at runtime instead, where a failed font fetch degrades
 * to the fallback font stack rather than failing the entire build.
 * If self-hosting fonts is worth the tradeoff for your deployment,
 * downloading the actual font files and using next/font/local is the
 * fix — this build didn't do that for you.
 */
const FONT_CDN_URL =
  "https://fonts.googleapis.com/css2?family=Newsreader:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";
const GENERAL_SANS_CDN_URL =
  "https://api.fontshare.com/v2/css?f[]=general-sans@500,600,700&display=swap";

export const metadata: Metadata = {
  title: "chatbo.ai — Build AI agents for real work",
  description:
    "Build specialized AI agents from a plain-language description. Give them knowledge, tools, workflows, and deploy them where your customers and team work.",
  keywords: ["AI agents", "AI chatbot builder", "business automation", "RAG", "AI SaaS"],
  applicationName: "chatbo.ai",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "chatbo.ai — Build AI agents for real work", description: "Create specialized AI agents with knowledge, tools, workflows and deployment controls.", type: "website" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_CDN_URL} />
        <link rel="stylesheet" href={GENERAL_SANS_CDN_URL} />
      </head>
      <body className="bg-paper text-ink font-display antialiased">
        {children}
      </body>
    </html>
  );
}
