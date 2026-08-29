import { NextResponse } from "next/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getBotById } from "@/lib/data/bots";
import { createAdminClient } from "@/lib/supabase/admin";
import { runEvaluationSuite } from "@/lib/evals/service";

export async function POST(request: Request, { params }: { params: { botId: string } }) {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bot = await getBotById(params.botId);
  if (!bot || bot.workspace_id !== workspace.workspaceId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const suiteId = typeof body.suiteId === "string" ? body.suiteId : "";
  if (!suiteId) return NextResponse.json({ error: "suiteId is required" }, { status: 400 });
  const admin = createAdminClient();
  const { data: cases } = await admin.from("eval_test_cases").select("id,name,input,expected,required_tools,forbidden_tools,tags").eq("suite_id", suiteId).order("created_at", { ascending: true });
  if (!cases?.length) return NextResponse.json({ error: "No test cases" }, { status: 400 });
  try {
    const result = await runEvaluationSuite(bot, suiteId, cases.map((item) => ({ id: item.id, name: item.name, input: item.input, expected: item.expected || undefined, requiredTools: item.required_tools || [], forbiddenTools: item.forbidden_tools || [], tags: item.tags || [] })));
    return NextResponse.json({ runId: result.runId, score: result.score, passed: result.passed });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Evaluation failed" }, { status: 500 });
  }
}
