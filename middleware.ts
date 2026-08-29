import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/widget-loader.js",
  "/openapi.json",
  "/developers",
  // Well-known crawler/meta files — a search engine or crawler hitting
  // these must get the actual file, never a redirect to /login. These
  // were missing entirely (neither here nor covered by any
  // PUBLIC_PREFIXES entry, and the matcher below doesn't exclude .txt/
  // .xml), so every request to either one was silently redirected to
  // login instead of serving real content — found by actually curling
  // the built app's routes rather than trusting the file existed.
  "/robots.txt",
  "/sitemap.xml",
];

// Public, unauthenticated product surfaces — never redirected to login.
const PUBLIC_PREFIXES = [
  "/chat/",
  "/widget",
  "/api/public",
  "/api/webhooks",
  "/mfa/",
  "/api/v1",
  "/api/health",
  "/api/notifications",
  "/api/backups",
  "/api/inngest",
  "/help",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without env vars configured yet (fresh clone, no .env.local), don't
  // crash every request — just skip session handling so `npm run dev`
  // still boots for local UI work before Supabase is wired up.
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_PATHS.includes(path) ||
    PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));

  if (!user && !isPublic) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && !isPublic) {
    // A session can exist at aal1 while a TOTP challenge is still
    // outstanding (right after password sign-in, before the 6-digit
    // code is verified) — that's a real, valid Supabase session, but it
    // must not be treated as "fully logged in" for anything this
    // middleware is otherwise protecting.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      return NextResponse.redirect(new URL("/mfa/verify", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
