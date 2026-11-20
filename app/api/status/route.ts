import { type NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

/** GET /api/status?id=… — poll a generation job. Cheap and stateless. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const job = await getJob(id);
    return NextResponse.json(job, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Status check failed";
    const status = msg.startsWith("Malformed") || msg.startsWith("Unknown") ? 400 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
