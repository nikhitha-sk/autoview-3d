import "server-only";

/**
 * Tripo3D image-to-model client (https://platform.tripo3d.ai/docs).
 * Flow: upload image -> image_token -> create task -> poll task -> output.pbr_model (.glb)
 */
const BASE = "https://api.tripo3d.ai/v2/openapi";

function key() {
  const k = process.env.TRIPO_API_KEY;
  if (!k) throw new Error("TRIPO_API_KEY is not set");
  return k;
}

interface TripoEnvelope<T> {
  code: number;
  message?: string;
  data: T;
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key()}`, ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as TripoEnvelope<T> | null;
  if (!res.ok || !body || body.code !== 0) {
    throw new Error(`Tripo ${path} failed (${res.status}): ${body?.message ?? res.statusText}`);
  }
  return body.data;
}

export async function startTripoTask(file: Blob, ext: "jpg" | "png" | "webp"): Promise<string> {
  const form = new FormData();
  form.append("file", file, `upload.${ext}`);
  const { image_token } = await call<{ image_token: string }>("/upload", { method: "POST", body: form });

  const { task_id } = await call<{ task_id: string }>("/task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "image_to_model",
      file: { type: ext, file_token: image_token },
      texture: true,
      pbr: true,
    }),
  });
  return task_id;
}

export type JobState = "queued" | "running" | "success" | "failed";

export async function getTripoTask(id: string): Promise<{ state: JobState; progress: number; modelUrl?: string; error?: string }> {
  const t = await call<{
    status: string;
    progress?: number;
    output?: { model?: string; pbr_model?: string; base_model?: string };
  }>(`/task/${encodeURIComponent(id)}`, { method: "GET" });

  const map: Record<string, JobState> = {
    queued: "queued",
    running: "running",
    success: "success",
    failed: "failed",
    cancelled: "failed",
    unknown: "failed",
    banned: "failed",
    expired: "failed",
  };
  const state = map[t.status] ?? "running";
  return {
    state,
    progress: t.progress ?? (state === "success" ? 100 : 0),
    modelUrl: t.output?.pbr_model ?? t.output?.model ?? t.output?.base_model,
    error: state === "failed" ? `Generation ${t.status}` : undefined,
  };
}
