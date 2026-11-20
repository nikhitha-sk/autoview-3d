"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Maximize2, Minimize2, Pause, Play, RotateCcw } from "lucide-react";
import ViewerLazy from "./ViewerLazy";
import { interiorAvailable } from "@/lib/interior";
import { useTheme } from "@/lib/hooks/useTheme";
import type { Car } from "@/lib/types";
import type { ViewMode, ViewPreset } from "./CarViewer";

const PRESETS: { id: ViewPreset; label: string; key: string }[] = [
  { id: "hero", label: "3/4", key: "1" },
  { id: "front", label: "Front", key: "2" },
  { id: "side", label: "Side", key: "3" },
  { id: "rear", label: "Rear", key: "4" },
  { id: "top", label: "Top", key: "5" },
];

const FINISH_LABEL = { gloss: "Solid gloss", metallic: "Metallic", pearl: "Pearlescent", matte: "Matte" } as const;

export default function CarExperience({ car }: { car: Car }) {
  const { theme } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const [paintIdx, setPaintIdx] = useState(0);
  const [mode, setMode] = useState<ViewMode>("exterior");
  const [autoRotate, setAutoRotate] = useState(true);
  const [view, setView] = useState<{ preset: ViewPreset; nonce: number }>({ preset: "hero", nonce: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const canInterior = useMemo(() => interiorAvailable(car), [car]);
  const paint = car.paints[paintIdx];

  const goView = useCallback((preset: ViewPreset) => {
    setMode("exterior");
    setView((v) => ({ preset, nonce: v.nonce + 1 }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Keyboard shortcuts: 1–5 views, I interior, R rotate, F fullscreen, [ ] paint
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey) return;
      const p = PRESETS.find((x) => x.key === e.key);
      if (p) goView(p.id);
      else if (e.key === "i" && canInterior) setMode((m) => (m === "interior" ? "exterior" : "interior"));
      else if (e.key === "r") setAutoRotate((v) => !v);
      else if (e.key === "f") toggleFullscreen();
      else if (e.key === "]") setPaintIdx((i) => (i + 1) % car.paints.length);
      else if (e.key === "[") setPaintIdx((i) => (i - 1 + car.paints.length) % car.paints.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goView, canInterior, toggleFullscreen, car.paints.length]);

  const stats = [
    ["Power", car.power],
    ["0–100 km/h", car.acceleration],
    ["Top speed", car.topSpeed],
    [car.fuel === "Electric" ? "Range" : "Mileage", car.mileage],
  ].filter(([, v]) => v && v !== "—" && v !== "Not disclosed");

  return (
    <section ref={rootRef} className="relative h-[100svh] min-h-[620px] overflow-hidden bg-bg" aria-label={`${car.brand} ${car.name} 3D viewer`}>
      <ViewerLazy
        car={car}
        paint={paint}
        mode={mode}
        autoRotate={autoRotate}
        view={view}
        theme={theme}
        accent="#ff5a1f"
        onInteract={() => setAutoRotate(false)}
        distanceScale={1.12}
        focalOffset={[-0.35, -0.15, 0]}
        className="absolute inset-0"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-bg/90 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-bg/90 to-transparent" />

      {/* Title block */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 mx-auto max-w-[1600px] px-4 pt-20 transition-opacity duration-500 sm:px-8 sm:pt-24 ${
          mode === "interior" ? "opacity-0 sm:opacity-30" : ""
        }`}
      >
        <Link
          href="/#showroom"
          className="pointer-events-auto inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted hover:text-text"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Showroom
        </Link>
        <p className="rise mt-5 text-[12px] font-semibold uppercase tracking-[0.24em] text-muted">
          {car.brand} · {car.year}
        </p>
        <h1 className="rise font-display mt-2 text-[clamp(2.2rem,6vw,5.5rem)] font-extrabold leading-[0.9]">{car.name}</h1>
        <p className="rise mt-3 max-w-md text-sm text-muted sm:text-[15px]">{car.tagline}</p>
      </div>

      {/* Live stats (desktop) */}
      <dl
        className={`pointer-events-none absolute right-8 top-1/2 hidden w-52 -translate-y-1/2 divide-y divide-line border-y border-line transition-opacity duration-500 xl:block ${
          mode === "interior" ? "opacity-0" : ""
        }`}
      >
        {stats.map(([k, v]) => (
          <div key={k} className="py-4">
            <dt className="eyebrow !text-[10px]">{k}</dt>
            <dd className="mt-1 font-mono text-lg">{v}</dd>
          </div>
        ))}
        <div className="py-4">
          <dt className="eyebrow !text-[10px]">Ex-showroom</dt>
          <dd className="mt-1 font-mono text-lg">{car.priceRange}</dd>
        </div>
      </dl>

      {/* Interior hint */}
      {mode === "interior" && (
        <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 sm:top-28">
          <p className="glass rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Driver&apos;s seat · drag to look around
          </p>
        </div>
      )}

      {/* Control dock */}
      <div className="absolute inset-x-0 bottom-0 px-3 pb-3 sm:px-8 sm:pb-8">
        <div className="glass mx-auto flex max-w-[980px] flex-col gap-3 rounded-[22px] p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Exterior / Interior segmented control */}
            <div role="radiogroup" aria-label="View mode" className="relative grid grid-cols-2 rounded-full border border-line p-1">
              <span
                aria-hidden
                className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-text transition-transform duration-500 ease-out-expo ${
                  mode === "interior" ? "translate-x-full" : ""
                }`}
              />
              {(["exterior", "interior"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  disabled={m === "interior" && !canInterior}
                  title={m === "interior" && !canInterior ? "Interior not available for this model" : `${m} view (I)`}
                  onClick={() => setMode(m)}
                  className={`relative z-10 px-4 py-1.5 text-[12px] font-semibold capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    mode === m ? "text-bg" : "text-muted hover:text-text"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar" role="group" aria-label="Camera angle">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => goView(p.id)}
                  title={`${p.label} view (${p.key})`}
                  className={`shrink-0 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition ${
                    mode === "exterior" && view.preset === p.id ? "bg-surface-2 text-text" : "text-muted hover:text-text"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-1">
              <IconBtn label={autoRotate ? "Pause turntable (R)" : "Play turntable (R)"} onClick={() => setAutoRotate((v) => !v)} active={autoRotate}>
                {autoRotate ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </IconBtn>
              <IconBtn label="Reset camera" onClick={() => goView("hero")}>
                <RotateCcw className="h-4 w-4" />
              </IconBtn>
              <IconBtn label={fullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"} onClick={toggleFullscreen}>
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </IconBtn>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t border-line pt-3">
            <div className="min-w-0 flex-1">
              <p className="eyebrow !text-[10px]">Paint · {FINISH_LABEL[paint.finish]}</p>
              <p className="truncate text-sm font-semibold">{paint.name}</p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar" role="radiogroup" aria-label="Paint colour">
              {car.paints.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  role="radio"
                  aria-checked={i === paintIdx}
                  aria-label={`${p.name} (${FINISH_LABEL[p.finish]})`}
                  title={p.name}
                  onClick={() => setPaintIdx(i)}
                  className={`relative h-8 w-8 shrink-0 rounded-full transition-transform duration-300 hover:scale-110 ${
                    i === paintIdx ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : "ring-1 ring-line-strong"
                  }`}
                  style={{
                    background:
                      p.finish === "matte"
                        ? p.hex
                        : `radial-gradient(circle at 32% 28%, rgba(255,255,255,${p.finish === "gloss" ? 0.55 : 0.4}), transparent 42%), ${p.hex}`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 hidden text-center font-mono text-[10px] uppercase tracking-[0.14em] text-faint lg:block">
          Keys · 1–5 camera · I interior · R turntable · [ ] paint · F fullscreen
        </p>
      </div>
    </section>
  );
}

function IconBtn({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-full transition ${active ? "text-accent" : "text-muted hover:bg-surface-2 hover:text-text"}`}
    >
      {children}
    </button>
  );
}
