import { NextResponse } from "next/server";
import { completeOAuth } from "@/lib/integrations/oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (error || !code || !state) return NextResponse.redirect(new URL(`/dashboard/integrations?error=${encodeURIComponent(error ?? "OAuth callback is missing code or state")}`, request.url));
  try {
    await completeOAuth(state, code);
    return NextResponse.redirect(new URL("/dashboard/integrations?connected=1", request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth connection failed";
    return NextResponse.redirect(new URL(`/dashboard/integrations?error=${encodeURIComponent(message)}`, request.url));
  }
}
