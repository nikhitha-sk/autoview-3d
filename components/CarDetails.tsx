import Link from "next/link";
import { ArrowUpRight, Camera, Info } from "lucide-react";
import { silhouette } from "@/lib/silhouette";
import type { Car } from "@/lib/types";

function SpecGroup({ title, rows }: { title: string; rows: [string, string | number][] }) {
  return (
    <div>
      <p className="eyebrow mb-3">{title}</p>
      <dl className="divide-y divide-line border-y border-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 py-3.5 text-sm">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-mono text-[13px] text-text">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Technical side-elevation with dimension lines, like a manufacturer data sheet. */
export function Blueprint({ car }: { car: Car }) {
  const s = silhouette(car);
  const pad = 0.55;
  const vbW = s.L + pad * 2;
  const vbH = s.H + 1.05;
  const { length, height, wheelbase, width } = car.dimensions;
  const groundY = s.H;
  return (
    <figure className="relative overflow-hidden rounded-[22px] border border-line bg-surface">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-70" />
      <figcaption className="relative flex items-center justify-between border-b border-line px-5 py-3">
        <span className="eyebrow">Side elevation · scale 1:{Math.round(length / 120)}</span>
        <span className="font-mono text-[11px] text-faint">W {width.toLocaleString("en-IN")} mm</span>
      </figcaption>
      <svg
        viewBox={`${-pad} -0.35 ${vbW} ${vbH}`}
        className="relative block h-auto w-full text-text"
        role="img"
        aria-label={`${car.brand} ${car.name}: length ${length} mm, height ${height} mm, wheelbase ${wheelbase} mm`}
      >
        <line x1={-pad} x2={s.L + pad} y1={groundY} y2={groundY} stroke="var(--line-strong)" strokeWidth={0.008} />
        <path d={s.body} fill="var(--glow)" stroke="currentColor" strokeWidth={0.014} strokeLinejoin="round" />
        <path d={s.glass} fill="none" stroke="var(--muted)" strokeWidth={0.008} strokeDasharray="0.03 0.025" />
        {s.wheels.map((w, i) => (
          <g key={i}>
            <circle cx={w.cx} cy={w.cy} r={w.r} fill="var(--bg)" stroke="currentColor" strokeWidth={0.014} />
            <circle cx={w.cx} cy={w.cy} r={w.r * 0.64} fill="none" stroke="var(--muted)" strokeWidth={0.008} />
            <line x1={w.cx - 0.06} x2={w.cx + 0.06} y1={w.cy} y2={w.cy} stroke="var(--accent)" strokeWidth={0.01} />
            <line x1={w.cx} x2={w.cx} y1={w.cy - 0.06} y2={w.cy + 0.06} stroke="var(--accent)" strokeWidth={0.01} />
          </g>
        ))}

        {/* wheelbase */}
        <Dim x1={s.wheelbase.x1} x2={s.wheelbase.x2} y={groundY + 0.22} label={`WHEELBASE ${wheelbase.toLocaleString("en-IN")}`} accent />
        {/* overall length */}
        <Dim x1={0} x2={s.L} y={groundY + 0.5} label={`LENGTH ${length.toLocaleString("en-IN")} MM`} />
        {/* height */}
        <g stroke="var(--muted)" strokeWidth={0.008}>
          <line x1={s.L + 0.28} x2={s.L + 0.28} y1={0} y2={groundY} />
          <line x1={s.L + 0.2} x2={s.L + 0.36} y1={0} y2={0} />
          <line x1={s.L + 0.2} x2={s.L + 0.36} y1={groundY} y2={groundY} />
        </g>
        <text
          x={s.L + 0.4}
          y={groundY / 2}
          fontSize={0.085}
          fill="var(--muted)"
          fontFamily="var(--font-jetbrains)"
          transform={`rotate(-90 ${s.L + 0.4} ${groundY / 2})`}
          textAnchor="middle"
        >
          {height.toLocaleString("en-IN")}
        </text>
      </svg>
    </figure>
  );
}

function Dim({ x1, x2, y, label, accent = false }: { x1: number; x2: number; y: number; label: string; accent?: boolean }) {
  const c = accent ? "var(--accent)" : "var(--muted)";
  return (
    <g>
      <line x1={x1} x2={x2} y1={y} y2={y} stroke={c} strokeWidth={0.008} />
      <line x1={x1} x2={x1} y1={y - 0.06} y2={y + 0.06} stroke={c} strokeWidth={0.008} />
      <line x1={x2} x2={x2} y1={y - 0.06} y2={y + 0.06} stroke={c} strokeWidth={0.008} />
      <rect x={(x1 + x2) / 2 - label.length * 0.031} y={y - 0.07} width={label.length * 0.062} height={0.14} fill="var(--surface)" />
      <text x={(x1 + x2) / 2} y={y + 0.03} fontSize={0.085} fill={c} fontFamily="var(--font-jetbrains)" textAnchor="middle" letterSpacing={0.01}>
        {label}
      </text>
    </g>
  );
}

export default function CarDetails({ car }: { car: Car }) {
  const range = car.fuel === "Electric";
  return (
    <section id="specs" className="mx-auto max-w-[1600px] scroll-mt-20 px-4 pt-20 sm:px-8 sm:pt-28">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="eyebrow">
            <span className="text-accent">01</span> — Overview
          </p>
          <h2 className="font-display mt-4 text-[clamp(2rem,4vw,3.4rem)] font-extrabold leading-[0.95]">
            {car.brand}
            <br />
            {car.name}
          </h2>
          <p className="mt-6 text-[15px] leading-relaxed text-muted">{car.description}</p>

          <div className="frame mt-10 rounded-2xl border border-line bg-surface p-6">
            <p className="eyebrow">Ex-showroom price · India</p>
            <p className="font-display mt-3 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold">{car.priceRange}</p>
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-faint">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Indicative range across variants. On-road prices vary by city,
              taxes and options.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-full border border-line-strong px-5 py-3 text-sm font-semibold transition hover:border-text"
            >
              <Camera className="h-4 w-4" /> Seen one on the road? Scan it
            </Link>
            {car.modelCredit && (
              <a
                href={car.modelCredit.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2 py-3 text-xs text-muted hover:text-text"
              >
                Model by {car.modelCredit.author} · {car.modelCredit.license} <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <div className="space-y-10 lg:col-span-7">
          <Blueprint car={car} />
          <div className="grid gap-10 md:grid-cols-2">
            <SpecGroup
              title="Performance"
              rows={[
                ["Power", car.power],
                ["Torque", car.torque],
                ["0–100 km/h", car.acceleration],
                ["Top speed", car.topSpeed],
              ]}
            />
            <SpecGroup
              title="Powertrain"
              rows={[
                ["Engine", car.engine],
                ["Fuel", car.fuel],
                ["Transmission", car.transmission],
                ["Drivetrain", car.drivetrain],
              ]}
            />
            <SpecGroup
              title="Practicality"
              rows={[
                [range ? "Range" : "Mileage", car.mileage],
                ["Seats", car.seats],
                ["Body type", car.bodyType],
                ["Model year", car.year],
              ]}
            />
            <SpecGroup
              title="Dimensions"
              rows={[
                ["Length", `${car.dimensions.length.toLocaleString("en-IN")} mm`],
                ["Width", `${car.dimensions.width.toLocaleString("en-IN")} mm`],
                ["Height", `${car.dimensions.height.toLocaleString("en-IN")} mm`],
                ["Wheelbase", `${car.dimensions.wheelbase.toLocaleString("en-IN")} mm`],
              ]}
            />
          </div>
          <p className="text-xs text-faint">Origin: {car.origin}. Figures are manufacturer-claimed or indicative.</p>
        </div>
      </div>
    </section>
  );
}
