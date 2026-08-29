import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getAdvancedAnalytics } from "@/lib/analytics/engine";
import { toCsv } from "@/lib/utils/csv";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requested = Number(request.nextUrl.searchParams.get("days") || 30);
  const days = [7,30,90].includes(requested) ? requested : 30;
  const data = await getAdvancedAnalytics(workspace.workspaceId, days);
  const rows = data.daily.map(d => [d.date,String(d.runs),String(d.conversations),String(d.leads),String(d.conversions),d.revenue.toFixed(2),d.cost.toFixed(6),String(d.failed)]);
  const csv = toCsv(["date","agent_runs","conversations","leads","conversions","revenue_usd","ai_cost_usd","failed_runs"], rows);
  return new NextResponse(csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="chatbo-analytics-${days}d.csv"`}});
}
