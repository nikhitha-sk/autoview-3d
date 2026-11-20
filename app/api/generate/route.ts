import { type NextRequest, NextResponse } from "next/server";
import { recogniseCar, type Recognition } from "@/lib/gemini";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, activeProvider, rateLimited, startJob } from "@/lib/jobs";
import { r2Enabled } from "@/lib/r2";

export const maxDuration = 60;

/** GET /api/generate — which capabilities are configured (no secrets exposed). */
export function GET() {
  return NextResponse.json({
    provider: activeProvider(),
    recognition: Boolean(process.env.GEMINI_API_KEY),
    storage: r2Enabled() ? "r2" : "proxy",
    maxBytes: MAX_UPLOAD_BYTES,
    types: Object.keys(ALLOWED_TYPES),
  });
}

/**
 * POST /api/generate (multipart: image, [archetype], [color])
 * Validates the photo, optionally asks Gemini what car it is, then *starts* the
 * image-to-3D job and returns immediately with a job id. The client polls
 * /api/status — we never wait for the 1–3 minute generation inside a request.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (activeProvider() !== "demo" && rateLimited(ip)) {
    return NextResponse.json({ error: "Too many uploads — please wait a few minutes." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data with an `image` field." }, { status: 400 });
  }
  const file = form.get("image");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "No image uploaded." }, { status: 400 });
  if (!(file.type in ALLOWED_TYPES)) return NextResponse.json({ error: "Use a JPG, PNG or WebP image." }, { status: 415 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Image must be under 5 MB." }, { status: 413 });

  let recognition: Recognition | null = null;
  let recognitionError: string | undefined;
  try {
    recognition = await recogniseCar(file, file.type);
  } catch (e) {
    recognitionError = e instanceof Error ? e.message : "Recognition failed";
  }
  if (recognition && !recognition.isCar) {
    return NextResponse.json({ error: "We couldn't find a car in that photo — try a clearer side or 3/4 shot.", recognition }, { status: 422 });
  }

  try {
    const job = await startJob(file, file.type, {
      archetype: String(form.get("archetype") ?? ""),
      color: String(form.get("color") ?? ""),
    });
    return NextResponse.json({ ...job, recognition, recognitionError }, { status: 202 });
  } catch (e) {
    console.error("[generate]", e);
    return NextResponse.json({ error: "The 3D service is unavailable right now. Please try again." }, { status: 502 });
  }
}
