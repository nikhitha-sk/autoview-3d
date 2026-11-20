import "server-only";
import type { JobState } from "./tripo";

/**
 * Meshy image-to-3D client (https://docs.meshy.ai/api/image-to-3d).
 * Accepts the image as a data URI, returns a task id; poll until SUCCEEDED.
 */
const BASE = "https://api.meshy.ai/openapi/v1/image-to-3d";

function key() {
  const k = process.env.MESHY_API_KEY;
  if (!k) throw new Error("MESHY_API_KEY is not set");
  return k;
}

export async function startMeshyTask(file: Blob, mime: string): Promise<string> {
  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const res = await fetch(BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: `data:${mime};base64,${b64}`, enable_pbr: true, should_texture: true }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as { result?: string; message?: string } | null;
  if (!res.ok || !body?.result) throw new Error(`Meshy create failed (${res.status}): ${body?.message ?? res.statusText}`);
  return body.result;
}

export async function getMeshyTask(id: string): Promise<{ state: JobState; progress: number; modelUrl?: string; error?: string }> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${key()}` },
    cache: "no-store",
  });
  const t = (await res.json().catch(() => null)) as {
    status?: string;
    progress?: number;
    model_urls?: { glb?: string };
    task_error?: { message?: string };
  } | null;
  if (!res.ok || !t) throw new Error(`Meshy status failed (${res.status})`);
  const map: Record<string, JobState> = {
    PENDING: "queued",
    IN_PROGRESS: "running",
    SUCCEEDED: "success",
    FAILED: "failed",
    CANCELED: "failed",
  };
  const state = map[t.status ?? ""] ?? "running";
  return {
    state,
    progress: t.progress ?? 0,
    modelUrl: t.model_urls?.glb,
    error: state === "failed" ? (t.task_error?.message ?? "Generation failed") : undefined,
  };
}
