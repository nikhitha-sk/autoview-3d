"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, Move3d } from "lucide-react";
import ViewerLazy from "../ViewerLazy";
import { useTheme } from "@/lib/hooks/useTheme";
import type { Car } from "@/lib/types";

export default function Hero({ featured }: { featured: Car[] }) {
  const { theme } = useTheme();
  const [active, setActive] = useState(0);
  const [desktop, setDesktop] = useState(false);
  const car = featured[active];

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const set = () => setDesktop(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  return (
    <section className="noise relative overflow-hidden lg:h-[100svh] lg:min-h-[680px]" aria-label="Featured car in 3D">
      <ViewerLazy
        key={car.id}
        car={car}
        theme={theme}
        autoRotate
        interactive={desktop}
        wheelZoom={false}
        focalOffset={desktop ? [-1.5, 0.35, 0] : [0, 0.2, 0]}
        distanceScale={desktop ? 1.3 : 1}
        className="absolute inset-x-0 top-14 h-[46svh] lg:inset-0 lg:h-auto"
      />

      {/* vignettes keep text legible over the 3D scene */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-[calc(46svh-2.5rem)] h-24 bg-gradient-to-t from-bg to-transparent lg:hidden" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[45%] bg-gradient-to-t from-bg via-bg/70 to-transparent lg:block" />
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[45%] bg-gradient-to-r from-bg/80 to-transparent lg:block" />

      <div className="pointer-events-none relative mx-auto flex h-full max-w-[1600px] flex-col justify-end px-4 pb-10 pt-[calc(46svh+3.5rem)] sm:px-8 lg:pb-16 lg:pt-0">
        <div className="pointer-events-auto max-w-3xl">
          <p className="eyebrow rise flex items-center gap-2">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-accent" /> Live · real-time WebGL studio
          </p>
          <h1 className="rise font-display mt-5 text-[clamp(2.5rem,7.2vw,7rem)] font-extrabold leading-[0.88]" style={{ animationDelay: "80ms" }}>
            Every angle.
            <br />
            <span className="text-transparent [-webkit-text-stroke:1.5px_var(--text)]">Inside &amp; out.</span>
          </h1>
          <p className="rise mt-6 max-w-lg text-[15px] leading-relaxed text-muted sm:text-base" style={{ animationDelay: "160ms" }}>
            Walk around the world&apos;s most famous cars, change the paint, sit in the driver&apos;s seat — or upload a
            photo of any car and get a 3D model back.
          </p>
          <div className="rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
            <Link
              href="#showroom"
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-accent-ink transition hover:brightness-110"
            >
              Enter the showroom
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-full border border-line-strong px-6 py-3.5 text-sm font-semibold backdrop-blur transition hover:border-text"
            >
              Turn a photo into 3D
            </Link>
          </div>
        </div>

        {/* Featured selector + live readout */}
        <div className="pointer-events-auto mt-10 grid gap-4 lg:absolute lg:bottom-16 lg:right-8 lg:mt-0 lg:w-[380px]">
          <div className="glass frame rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Now on the turntable</span>
              <span className="font-mono text-[11px] text-faint">
                {String(active + 1).padStart(2, "0")} / {String(featured.length).padStart(2, "0")}
              </span>
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{car.brand}</p>
            <p className="font-display text-2xl font-bold leading-tight">{car.name}</p>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
              {[
                ["Power", car.power],
                ["0–100", car.acceleration],
                ["Top speed", car.topSpeed],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="eyebrow !text-[10px]">{k}</dt>
                  <dd className="mt-1 font-mono text-sm">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex items-center gap-2">
              {featured.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Show ${f.brand} ${f.name}`}
                  aria-pressed={i === active}
                  className={`h-1 flex-1 rounded-full transition-colors ${i === active ? "bg-accent" : "bg-line-strong hover:bg-muted"}`}
                />
              ))}
              <Link
                href={`/car/${car.id}`}
                className="ml-3 inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-text hover:text-accent"
              >
                Open <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* HUD hints */}
      <div className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 lg:block">
        <p className="eyebrow flex items-center gap-2 [writing-mode:vertical-rl]">
          <Move3d className="h-3.5 w-3.5 rotate-90" /> Drag to orbit the car
        </p>
      </div>
      <a
        href="#showroom"
        aria-label="Scroll to showroom"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-muted hover:text-text lg:block"
      >
        <ArrowDown className="h-4 w-4 animate-bounce" />
      </a>
    </section>
  );
}
