import Link from "next/link";
import { ArrowRight, Camera, Cpu, ScanSearch, Box } from "lucide-react";
import { brands } from "@/lib/cars";

export function SectionHeading({
  index,
  eyebrow,
  title,
  children,
}: {
  index: string;
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 border-t border-line pt-6 md:grid-cols-12 md:gap-8">
      <p className="eyebrow md:col-span-3">
        <span className="text-accent">{index}</span> — {eyebrow}
      </p>
      <div className="md:col-span-9">
        <h2 className="font-display text-[clamp(1.9rem,4.4vw,3.75rem)] font-extrabold leading-[0.95]">{title}</h2>
        {children && <div className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted">{children}</div>}
      </div>
    </div>
  );
}

export function BrandMarquee() {
  const row = [...brands, ...brands];
  return (
    <div className="relative overflow-hidden border-y border-line py-5" aria-label="Brands in the showroom">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-bg to-transparent" />
      <div className="animate-marquee flex w-max items-center gap-14">
        {row.map((b, i) => (
          <span key={i} className="flex items-center gap-14 font-display text-sm font-semibold tracking-[0.12em] text-muted">
            {b}
            <span className="h-1 w-1 rotate-45 bg-accent" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function StatsStrip({ count }: { count: number }) {
  const stats = [
    [String(count).padStart(2, "0"), "Models in the showroom"],
    ["360°", "Exterior orbit & interior look-around"],
    ["60 fps", "Real-time WebGL rendering"],
    ["1 photo", "Is all it takes to generate a 3D car"],
  ];
  return (
    <div className="grid grid-cols-2 border-b border-line lg:grid-cols-4">
      {stats.map(([v, k], i) => (
        <div key={k} className={`px-4 py-8 sm:px-8 ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""} border-line`}>
          <p className="font-display text-3xl font-extrabold sm:text-4xl">{v}</p>
          <p className="mt-2 text-[13px] text-muted">{k}</p>
        </div>
      ))}
    </div>
  );
}

const PIPELINE = [
  { icon: Camera, title: "Upload", text: "A clear 3/4 or side photo, JPG or PNG under 5 MB." },
  { icon: ScanSearch, title: "Recognise", text: "Gemini identifies make & model and pulls matching specs." },
  { icon: Cpu, title: "Reconstruct", text: "An image-to-3D model (Tripo3D / Meshy) builds a textured mesh." },
  { icon: Box, title: "Explore", text: "The .glb streams into the same studio viewer — orbit, zoom, share." },
];

export function PhotoTo3DBand() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-line bg-surface">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, var(--glow), transparent 65%)" }}
      />
      <div className="relative grid gap-12 p-6 sm:p-10 lg:grid-cols-12 lg:p-14">
        <div className="lg:col-span-5">
          <p className="eyebrow">
            <span className="text-accent">AI</span> — Photo to 3D
          </p>
          <h3 className="font-display mt-4 text-[clamp(1.8rem,3.6vw,3rem)] font-extrabold leading-[0.95]">
            Your car.
            <br />
            In three dimensions.
          </h3>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
            Snap any car on the street and AutoView reconstructs it as a 3D model you can spin around — and tells you
            what it is.
          </p>
          <Link
            href="/upload"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-text px-6 py-3.5 text-sm font-semibold text-bg transition hover:bg-accent hover:text-accent-ink"
          >
            Try it with a photo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:col-span-7">
          {PIPELINE.map((s, i) => (
            <li key={s.title} className="relative bg-surface p-6">
              <div className="flex items-center justify-between">
                <s.icon className="h-5 w-5 text-accent" strokeWidth={1.6} />
                <span className="font-mono text-[11px] text-faint">STEP {String(i + 1).padStart(2, "0")}</span>
              </div>
              <p className="font-display mt-6 text-lg font-bold">{s.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
