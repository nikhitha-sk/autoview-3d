import { type NextRequest, NextResponse } from "next/server";
import { isAllowedModelHost } from "@/lib/jobs";

/**
 * GET /api/model?src=… — streams a generated .glb from the 3D provider's CDN.
 * Avoids CORS issues and expiring signed URLs in the browser. Host-allowlisted.
 */
export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src");
  let url: URL;
  try {
    url = new URL(src ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid src" }, { status: 400 });
  }
  if (!isAllowedModelHost(url)) return NextResponse.json({ error: "Host not allowed" }, { status: 403 });

  const upstream = await fetch(url, { cache: "no-store", redirect: "error" });
  if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "Model unavailable" }, { status: 502 });
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": "model/gltf-binary",
      "Cache-Control": "public, max-age=3600",
      ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length")! } : {}),
    },
  });
}
