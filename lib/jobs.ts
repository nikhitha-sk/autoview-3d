import "server-only";
import { getTripoTask, startTripoTask, type JobState } from "./tripo";
import { getMeshyTask, startMeshyTask } from "./meshy";
import { persistModel } from "./r2";
import { PRESETS } from "./carShapes";
import type { Archetype } from "./types";

export type Provider = "tripo" | "meshy" | "demo";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_TYPES: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Which image-to-3D backend is configured. Demo mode needs no keys. */
export function activeProvider(): Provider {
  if (process.env.TRIPO_API_KEY) return "tripo";
  if (process.env.MESHY_API_KEY) return "meshy";
  return "demo";
}

export interface JobStatus {
  state: JobState;
  progress: number;
  stage: string;
  modelUrl?: string;
  demo?: { archetype: Archetype; color: string };
  error?: string;
}

const DEMO_MS = 14_000;
const isArchetype = (a: string): a is Archetype => a in PRESETS;

/**
 * Job ids carry their provider (and, for demo jobs, their parameters), so the
 * status endpoint is stateless — no database needed between serverless invocations.
 */
export async function startJob(
  file: Blob,
  mime: string,
  opts: { archetype?: string; color?: string },
): Promise<{ id: string; provider: Provider }> {
  const provider = activeProvider();
  if (provider === "tripo") return { id: `tripo.${await startTripoTask(file, ALLOWED_TYPES[mime])}`, provider };
  if (provider === "meshy") return { id: `meshy.${await startMeshyTask(file, mime)}`, provider };

  const archetype = opts.archetype && isArchetype(opts.archetype) ? opts.archetype : "compact-suv";
  const color = /^#?[0-9a-f]{6}$/i.test(opts.color ?? "") ? opts.color!.replace("#", "") : "8a8f98";
  return { id: `demo.${Date.now()}.${archetype}.${color}`, provider };
}

function stageFor(p: number) {
  if (p < 12) return "Queued on the GPU";
  if (p < 45) return "Estimating depth & silhouette";
  if (p < 75) return "Building the mesh";
  if (p < 100) return "Baking textures";
  return "Ready";
}

export async function getJob(id: string): Promise<JobStatus> {
  const dot = id.indexOf(".");
  const provider = id.slice(0, dot);
  const rest = id.slice(dot + 1);

  if (provider === "demo") {
    const [start, archetype, color] = rest.split(".");
    if (!start || !isArchetype(archetype) || !/^[0-9a-f]{6}$/i.test(color)) throw new Error("Malformed job id");
    const p = Math.min(100, Math.round(((Date.now() - Number(start)) / DEMO_MS) * 100));
    return {
      state: p >= 100 ? "success" : p < 8 ? "queued" : "running",
      progress: Math.max(0, p),
      stage: stageFor(p),
      demo: p >= 100 ? { archetype, color: `#${color}` } : undefined,
    };
  }

  if (!/^[\w-]{4,128}$/.test(rest)) throw new Error("Malformed job id");
  const t = provider === "tripo" ? await getTripoTask(rest) : provider === "meshy" ? await getMeshyTask(rest) : null;
  if (!t) throw new Error("Unknown provider");

  let modelUrl: string | undefined;
  if (t.state === "success" && t.modelUrl) {
    // Prefer a permanent copy on R2's CDN; fall back to streaming through our proxy.
    const stored = await persistModel(`generated/${provider}-${rest}.glb`, t.modelUrl).catch(() => null);
    modelUrl = stored ?? `/api/model?src=${encodeURIComponent(t.modelUrl)}`;
  }
  return { state: t.state, progress: Math.round(t.progress), stage: stageFor(t.progress), modelUrl, error: t.error };
}

/** Hosts the /api/model proxy may fetch from (prevents it being used as an open proxy). */
export function isAllowedModelHost(url: URL) {
  const allowed = (process.env.MODEL_PROXY_HOSTS ?? "tripo3d.ai,tripo3d.com,meshy.ai,bcebos.com")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const host = url.hostname.toLowerCase();
  return url.protocol === "https:" && allowed.some((h) => host === h || host.endsWith(`.${h}`));
}

/** Tiny fixed-window rate limiter (per instance, best-effort) to protect paid API credits. */
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimited(ip: string, limit = 5, windowMs = 10 * 60_000) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + windowMs });
    return false;
  }
  h.n += 1;
  return h.n > limit;
}
