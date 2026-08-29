export const dynamic = "force-dynamic";
export async function GET() { return Response.json({ status: "ok", service: "chatbo", checkedAt: new Date().toISOString() }); }
