import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/home/Sections";

export const metadata: Metadata = {
  title: "How it works",
  description: "The architecture behind AutoView 3D: Next.js, React Three Fiber, procedural car generation, and an async image-to-3D pipeline.",
};

const STACK = [
  ["Frontend", "Next.js 16 · React 19 · TypeScript", "Pages and API routes in one project, static car pages"],
  ["Styling", "Tailwind CSS v4", "Design tokens for night / daylight themes"],
  ["3D", "Three.js · React Three Fiber · drei", "WebGL scene as React components, camera-controls rig"],
  ["Models", "glTF / .glb + Draco", "Real scanned model + procedural loft generator"],
  ["Backend", "Next.js route handlers", "Keeps API keys server-side; stateless job polling"],
  ["Storage", "Cloudflare R2", "Generated .glb files on a CDN (optional)"],
  ["AI · 3D", "Tripo3D or Meshy", "Single photo → textured mesh"],
  ["AI · Vision", "Google Gemini", "Identifies make & model, matches the catalogue"],
];

const NODES = [
  { id: "browser", title: "Browser", lines: ["Next.js pages + Tailwind", "R3F 3D viewer", "Upload form"], x: 0, y: 0 },
  { id: "api", title: "Route handlers", lines: ["/api/cars", "/api/generate · /api/status", "/api/model"], x: 1, y: 0 },
  { id: "ai3d", title: "Image → 3D", lines: ["Tripo3D / Meshy", "photo → .glb"], x: 2, y: 0 },
  { id: "r2", title: "Cloudflare R2", lines: [".glb models", "served via CDN"], x: 0, y: 1 },
  { id: "data", title: "Car data", lines: ["data/cars.json", "→ Supabase / D1 later"], x: 1, y: 1 },
  { id: "gemini", title: "Gemini", lines: ["recognises the car", "in the photo"], x: 2, y: 1 },
];

function Architecture() {
  const W = 300;
  const H = 150;
  const gx = 90;
  const gy = 110;
  const pos = (n: (typeof NODES)[number]) => ({ x: n.x * (W + gx), y: n.y * (H + gy) });
  const center = (id: string, side: "l" | "r" | "t" | "b") => {
    const n = NODES.find((m) => m.id === id)!;
    const p = pos(n);
    return {
      l: [p.x, p.y + H / 2],
      r: [p.x + W, p.y + H / 2],
      t: [p.x + W / 2, p.y],
      b: [p.x + W / 2, p.y + H],
    }[side] as [number, number];
  };
  const edges: { from: [number, number]; to: [number, number]; label: string; accent?: boolean }[] = [
    { from: center("browser", "r"), to: center("api", "l"), label: "requests", accent: true },
    { from: center("api", "r"), to: center("ai3d", "l"), label: "image → task id", accent: true },
    { from: center("api", "b"), to: center("data", "t"), label: "read" },
    { from: center("api", "b"), to: center("gemini", "t"), label: "photo" },
    { from: center("api", "b"), to: center("r2", "t"), label: "save .glb" },
    { from: center("browser", "b"), to: center("r2", "t"), label: "" },
  ];
  const totalW = 3 * W + 2 * gx;
  const totalH = 2 * H + gy;
  return (
    <div className="overflow-x-auto rounded-[22px] border border-line bg-surface p-4 no-scrollbar sm:p-8">
      <svg viewBox={`-10 -10 ${totalW + 20} ${totalH + 20}`} className="min-w-[720px]" role="img" aria-label="System architecture diagram">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--muted)" />
          </marker>
          <marker id="arrow-accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const [x1, y1] = e.from;
          const [x2, y2] = e.to;
          const midY = (y1 + y2) / 2;
          const d = y1 === y2 ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} C${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
          return (
            <g key={i}>
              <path
                d={d}
                fill="none"
                stroke={e.accent ? "var(--accent)" : "var(--line-strong)"}
                strokeWidth={1.5}
                strokeDasharray={e.label ? undefined : "4 4"}
                markerEnd={`url(#${e.accent ? "arrow-accent" : "arrow"})`}
              />
              {e.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={y1 === y2 ? y1 - 10 : midY - 6}
                  textAnchor="middle"
                  fontSize="13"
                  fill={e.accent ? "var(--accent)" : "var(--muted)"}
                  fontFamily="var(--font-jetbrains)"
                >
                  {e.label}
                </text>
              )}
            </g>
          );
        })}
        {NODES.map((n) => {
          const p = pos(n);
          return (
            <g key={n.id} transform={`translate(${p.x} ${p.y})`}>
              <rect width={W} height={H} rx={18} fill="var(--bg)" stroke="var(--line-strong)" />
              <text x={24} y={44} fontSize="20" fontWeight={700} fill="var(--text)" fontFamily="var(--font-archivo)">
                {n.title}
              </text>
              {n.lines.map((l, i) => (
                <text key={l} x={24} y={78 + i * 24} fontSize="14" fill="var(--muted)" fontFamily="var(--font-jetbrains)">
                  {l}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const FLOWS = [
  {
    title: "Browsing a famous car",
    steps: [
      "The showroom renders from data/cars.json (also served at /api/cars).",
      "Opening /car/[id] lazy-loads the 3D viewer — three.js is only downloaded when needed.",
      "Real models stream as Draco-compressed .glb; other cars are built procedurally from their real dimensions.",
      "Specs, price and a dimensioned blueprint render as static HTML below the viewer.",
    ],
  },
  {
    title: "Uploading a photo",
    steps: [
      "The browser checks type and size (JPG/PNG/WebP, ≤ 5 MB) and extracts the paint colour.",
      "/api/generate validates again, asks Gemini what car it is, and starts the image-to-3D job.",
      "It returns a job id immediately — no waiting inside a serverless request.",
      "The page polls /api/status every 3 s with retries; when done the .glb is copied to R2 and loaded.",
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-28 sm:px-8 sm:pt-32">
      <div className="grid gap-6 md:grid-cols-12">
        <p className="eyebrow md:col-span-3">
          <span className="text-accent">00</span> — How it works
        </p>
        <div className="md:col-span-9">
          <h1 className="font-display text-[clamp(2.2rem,5.5vw,4.8rem)] font-extrabold leading-[0.9]">
            Under the
            <br />
            <span className="text-transparent [-webkit-text-stroke:1.5px_var(--text)]">bonnet.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted">
            AutoView 3D renders cars in real time with WebGL. A Next.js app serves pages and a small API; heavy AI work runs
            on external providers as asynchronous jobs, and API keys never leave the server.
          </p>
        </div>
      </div>

      <section className="pt-20">
        <SectionHeading index="01" eyebrow="Architecture" title="Six moving parts." />
        <div className="mt-10">
          <Architecture />
        </div>
      </section>

      <section className="pt-24">
        <SectionHeading index="02" eyebrow="Request flows" title="Two journeys." />
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {FLOWS.map((f) => (
            <div key={f.title} className="rounded-[22px] border border-line bg-surface p-6 sm:p-8">
              <p className="font-display text-xl font-bold">{f.title}</p>
              <ol className="mt-6 space-y-4">
                {f.steps.map((s, i) => (
                  <li key={s} className="grid grid-cols-[2.5rem_1fr] gap-2 text-sm leading-relaxed text-muted">
                    <span className="font-mono text-[12px] text-accent">{String(i + 1).padStart(2, "0")}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-24">
        <SectionHeading index="03" eyebrow="Procedural cars" title="Built from dimensions.">
          Free, licence-clean 3D models of specific cars are rare. Cars without a real scan are generated: a parametric
          profile per body style is lofted into smooth cross-sections, wheel wells are carved under the fenders, lights are
          ray-cast onto the surface, and a full cockpit is placed at the driver&apos;s eye point. Any car switches to a real
          model by setting <code className="font-mono text-text">model3d</code> in its data.
        </SectionHeading>
      </section>

      <section className="pt-24">
        <SectionHeading index="04" eyebrow="Stack" title="The toolkit." />
        <div className="mt-10 overflow-hidden rounded-[22px] border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface">
              <tr>
                {["Layer", "Tool", "Why"].map((h) => (
                  <th key={h} className="eyebrow px-5 py-4 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {STACK.map(([layer, tool, why]) => (
                <tr key={layer}>
                  <td className="px-5 py-4 font-semibold">{layer}</td>
                  <td className="px-5 py-4 font-mono text-[13px]">{tool}</td>
                  <td className="px-5 py-4 text-muted">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link
          href="/#showroom"
          className="group mt-12 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-accent-ink hover:brightness-110"
        >
          See it in action <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </section>
    </div>
  );
}
