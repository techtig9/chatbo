import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptConfig } from "@/lib/tools/integration-config";
function validState(state: string, botId: string) { const [id, ts, sig] = state.split("."); const secret = process.env.CHANNEL_OAUTH_SECRET || process.env.TOOL_SECRET_KEY || ""; const expected = crypto.createHmac("sha256", secret).update(botId).digest("hex"); return id === botId && Math.abs(Date.now() - Number(ts)) < 10 * 60 * 1000 && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig || "")); }
export async function GET(request: NextRequest) { const code=request.nextUrl.searchParams.get("code"), state=request.nextUrl.searchParams.get("state")||""; const botId=state.split(".")[0]; if(!code||!botId||!validState(state,botId)) return Response.json({error:"Invalid OAuth callback."},{status:400}); return Response.redirect(`${process.env.APP_URL || request.nextUrl.origin}/dashboard/bots/${botId}/channels?oauth=discord&status=complete`); }
