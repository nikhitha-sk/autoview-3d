"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, Download, ImagePlus, Loader2, RefreshCw, ScanSearch, Sparkles, X } from "lucide-react";
import ViewerLazy from "../ViewerLazy";
import { useTheme } from "@/lib/hooks/useTheme";
import { dominantPaint } from "@/lib/color";
import { ARCHETYPE_LABELS, demoCar } from "@/lib/demoCar";
import type { Archetype, Car } from "@/lib/types";

const MAX = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const POLL_MS = 3000;

interface Capabilities {
  provider: "tripo" | "meshy" | "demo";
  recognition: boolean;
  storage: "r2" | "proxy";
}

interface Recognition {
  isCar: boolean;
  make: string | null;
  model: string | null;
  year: string | null;
  bodyType: string | null;
  color: string | null;
  confidence: number;
  match: string | null;
}

interface Job {
  state: "queued" | "running" | "success" | "failed";
  progress: number;
  stage: string;
  modelUrl?: string;
  demo?: { archetype: Archetype; color: string };
  error?: string;
}

type Phase = "idle" | "uploading" | "generating" | "done" | "error";

const PROVIDER_LABEL = { tripo: "Tripo3D", meshy: "Meshy", demo: "Demo mode" } as const;

export default function UploadStudio({ catalogue }: { catalogue: Pick<Car, "id" | "brand" | "name" | "thumbnail">[] }) {
  const { theme } = useTheme();
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [paint, setPaint] = useState<string>("#8a8f98");
  const [hint, setHint] = useState<"auto" | Archetype>("auto");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<Recognition | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [now, setNow] = useState<number>(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/generate")
      .then((r) => r.json())
      .then(setCaps)
      .catch(() => setCaps({ provider: "demo", recognition: false, storage: "proxy" }));
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "generating" && phase !== "uploading") return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [phase]);

  const reset = useCallback(() => {
    if (pollRef.current) clearTimeout(pollRef.current);
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setPhase("idle");
    setError(null);
    setRecognition(null);
    setJob(null);
  }, [preview]);

  const accept = useCallback(
    async (f: File | undefined | null) => {
      if (!f) return;
      setError(null);
      if (!TYPES.includes(f.type)) return setError("Please choose a JPG, PNG or WebP image.");
      if (f.size > MAX) return setError(`That image is ${(f.size / 1048576).toFixed(1)} MB — the limit is 5 MB.`);
      if (preview) URL.revokeObjectURL(preview);
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setPhase("idle");
      setJob(null);
      setRecognition(null);
      try {
        setPaint(await dominantPaint(f));
      } catch {
        /* keep default */
      }
    },
    [preview],
  );

  // paste an image from the clipboard
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      if (item) accept(item.getAsFile());
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [accept]);

  const poll = useCallback(function tick(id: string, failures = 0) {
    pollRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/status?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        const j = (await res.json()) as Job & { error?: string };
        if (!res.ok) throw new Error(j.error ?? "Status check failed");
        setJob(j);
        if (j.state === "success") return setPhase("done");
        if (j.state === "failed") {
          setError(j.error ?? "Generation failed. Try a clearer photo.");
          return setPhase("error");
        }
        tick(id, 0);
      } catch (e) {
        if (failures >= 4) {
          setError(e instanceof Error ? e.message : "Lost connection to the 3D service.");
          return setPhase("error");
        }
        tick(id, failures + 1); // transient network error — retry
      }
    }, POLL_MS);
  }, []);

  const generate = useCallback(async () => {
    if (!file) return;
    setPhase("uploading");
    setError(null);
    setStartedAt(Date.now());
    setNow(Date.now());
    const body = new FormData();
    body.append("image", file);
    body.append("archetype", hint);
    body.append("color", paint);
    try {
      const res = await fetch("/api/generate", { method: "POST", body });
      const j = await res.json();
      if (j.recognition) setRecognition(j.recognition);
      if (!res.ok) throw new Error(j.error ?? "Upload failed");
      setJob({ state: "queued", progress: 0, stage: "Queued on the GPU" });
      setPhase("generating");
      poll(j.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setPhase("error");
    }
  }, [file, hint, paint, poll]);

  const busy = phase === "uploading" || phase === "generating";
  const elapsed = Math.max(0, Math.round((now - startedAt) / 1000));
  const matched = recognition?.match ? catalogue.find((c) => c.id === recognition.match) : undefined;
  const resultCar = job?.demo ? demoCar(job.demo.archetype, job.demo.color) : undefined;

  const steps = [
    { label: "Upload", done: phase !== "idle" && phase !== "uploading", active: phase === "uploading" },
    {
      label: "Recognise",
      done: phase === "generating" || phase === "done",
      active: phase === "uploading",
      skipped: caps ? !caps.recognition : false,
    },
    { label: "Reconstruct", done: phase === "done", active: phase === "generating" },
    { label: "Ready", done: phase === "done", active: false },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      {/* ---------------- Input column ---------------- */}
      <div className="flex flex-col gap-5 lg:col-span-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy) accept(e.dataTransfer.files?.[0]);
          }}
          className={`frame relative aspect-[4/3] overflow-hidden rounded-[22px] border bg-surface transition-colors ${
            dragging ? "border-accent" : "border-line"
          }`}
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Your uploaded car" className="h-full w-full object-cover" />
              {busy && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute inset-0 bg-bg/30" />
                  <div className="animate-scan absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-accent/25 to-transparent" />
                  <div className="grid-bg absolute inset-0 opacity-60" />
                </div>
              )}
              {!busy && (
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Remove photo"
                  className="glass absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full hover:text-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="glass absolute bottom-3 left-3 flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3">
                <span className="h-5 w-5 rounded-full border border-line-strong" style={{ background: paint }} />
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">Paint {paint}</span>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="group grid h-full w-full place-items-center p-8 text-center"
            >
              <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
              <div className="relative">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-line-strong transition group-hover:border-accent group-hover:text-accent">
                  <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
                </span>
                <p className="font-display mt-5 text-lg font-bold">Drop a car photo</p>
                <p className="mt-1 text-sm text-muted">or click to browse · paste with Ctrl+V</p>
                <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-faint">JPG · PNG · WebP — up to 5 MB</p>
              </div>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={TYPES.join(",")}
            className="sr-only"
            onChange={(e) => {
              accept(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        {caps?.provider === "demo" && (
          <label className="block">
            <span className="eyebrow">Shape hint · demo mode</span>
            <select
              value={hint}
              onChange={(e) => setHint(e.target.value as "auto" | Archetype)}
              disabled={busy}
              className="mt-2 h-12 w-full rounded-full border border-line bg-bg px-4 text-sm outline-none focus:border-accent"
            >
              <option value="auto">Auto-detect from photo</option>
              {Object.entries(ARCHETYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={generate}
          disabled={!file || busy}
          className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {phase === "uploading" ? "Uploading & recognising…" : phase === "generating" ? "Generating 3D model…" : "Generate 3D model"}
        </button>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <div className="flex-1">
              <p>{error}</p>
              {phase === "error" && file && (
                <button type="button" onClick={generate} className="mt-2 inline-flex items-center gap-1.5 font-semibold text-accent">
                  <RefreshCw className="h-3.5 w-3.5" /> Try again
                </button>
              )}
            </div>
          </div>
        )}

        <ul className="space-y-2 text-[13px] text-muted">
          {[
            "A clear side or front three-quarter view works best.",
            "Keep the whole car in frame, with little background clutter.",
            "Single-photo models are approximate — hidden sides are inferred.",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rotate-45 bg-accent" /> {t}
            </li>
          ))}
        </ul>
      </div>

      {/* ---------------- Output column ---------------- */}
      <div className="flex flex-col gap-5 lg:col-span-7">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] border border-line bg-surface sm:aspect-[16/11]">
          {phase === "done" && (job?.modelUrl || resultCar) ? (
            <>
              <ViewerLazy
                className="absolute inset-0"
                car={resultCar}
                modelUrl={job?.modelUrl}
                normalize={Boolean(job?.modelUrl)}
                theme={theme}
                autoRotate
              />
              <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
                <span className="glass rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em]">
                  {job?.demo ? "Demo reconstruction" : "AI reconstruction"}
                </span>
              </div>
              <div className="absolute bottom-4 right-4 flex gap-2">
                {job?.modelUrl && (
                  <a
                    href={job.modelUrl}
                    download="autoview-model.glb"
                    className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold hover:text-accent"
                  >
                    <Download className="h-3.5 w-3.5" /> .glb
                  </a>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold hover:text-accent"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> New photo
                </button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 grid place-items-center p-8">
              <div className="grid-bg pointer-events-none absolute inset-0 opacity-70" />
              {busy ? (
                <div className="relative w-full max-w-sm text-center">
                  <p className="eyebrow">{phase === "uploading" ? "Uploading" : job?.stage}</p>
                  <p className="font-display mt-3 text-6xl font-extrabold tabular-nums">
                    {phase === "uploading" ? "—" : `${job?.progress ?? 0}%`}
                  </p>
                  <div className="mt-6 h-1 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out-expo"
                      style={{ width: `${phase === "uploading" ? 4 : Math.max(4, job?.progress ?? 0)}%` }}
                    />
                  </div>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
                    Elapsed {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} · usually 1–3 min
                  </p>
                </div>
              ) : (
                <div className="relative text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-dashed border-line-strong text-faint">
                    <ScanSearch className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <p className="font-display mt-4 text-lg font-bold">Your model appears here</p>
                  <p className="mt-1 text-sm text-muted">Orbit, zoom and download it as .glb when it&apos;s ready.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* stepper */}
        <ol className="grid grid-cols-4 gap-px overflow-hidden rounded-2xl border border-line bg-line">
          {steps.map((s, i) => (
            <li key={s.label} className="bg-surface px-3 py-3 sm:px-4">
              <div className="flex items-center gap-2">
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${
                    s.done ? "border-accent bg-accent text-accent-ink" : s.active ? "border-accent text-accent" : "border-line-strong text-faint"
                  }`}
                >
                  {s.done ? <Check className="h-3 w-3" /> : s.active ? <Loader2 className="h-3 w-3 animate-spin" /> : i + 1}
                </span>
                <span className={`truncate text-[12px] font-semibold ${s.done || s.active ? "text-text" : "text-faint"}`}>{s.label}</span>
              </div>
              {s.skipped && <p className="mt-1 font-mono text-[10px] text-faint">not configured</p>}
            </li>
          ))}
        </ol>

        {/* recognition */}
        {recognition && recognition.isCar && (
          <div className="rounded-[22px] border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Gemini recognition</p>
              <span className="font-mono text-[11px] text-faint">{Math.round(recognition.confidence * 100)}% confidence</span>
            </div>
            <p className="font-display mt-3 text-2xl font-bold">
              {[recognition.make, recognition.model].filter(Boolean).join(" ") || "Unidentified model"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {[recognition.year, recognition.bodyType, recognition.color].filter(Boolean).join(" · ")}
            </p>
            {matched && (
              <Link
                href={`/car/${matched.id}`}
                className="group mt-5 flex items-center justify-between rounded-2xl border border-line bg-bg p-4 transition hover:border-accent"
              >
                <span>
                  <span className="eyebrow block !text-[10px]">In our showroom</span>
                  <span className="mt-1 block font-semibold">
                    {matched.brand} {matched.name} — full specs, interior &amp; paints
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        )}

        {caps && (
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
            Engine: {PROVIDER_LABEL[caps.provider]} · Recognition: {caps.recognition ? "Gemini" : "off"} · Storage:{" "}
            {caps.storage === "r2" ? "Cloudflare R2" : "streamed"}
            {caps.provider === "demo" && " — add TRIPO_API_KEY or MESHY_API_KEY for real reconstructions"}
          </p>
        )}
      </div>
    </div>
  );
}
