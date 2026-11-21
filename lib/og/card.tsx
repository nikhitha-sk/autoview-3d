import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const ogSize = { width: 1200, height: 630 };

/** next/og can't decode WebP: use the PNG copy made by scripts/og-images.mjs (/cars/x.webp -> /og/x.png). */
async function pngDataUrl(thumbnail: string) {
  const png = thumbnail.replace(/^\/cars\/(.+)\.webp$/, "og/$1.png");
  const buf = await readPublic(png);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** Read a file from /public: from disk under Node (build, dev), from the static-assets binding on Cloudflare Workers. */
async function readPublic(path: string): Promise<Buffer> {
  try {
    return await readFile(join(process.cwd(), "public", path));
  } catch {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const res = await env.ASSETS!.fetch(new URL(`/${path}`, "https://assets.local"));
    if (!res.ok) throw new Error(`asset ${path}: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
}

/** Shared social card: dark showroom, car render, wide uppercase title. */
export async function ogCard({ eyebrow, title, subtitle, image }: { eyebrow: string; title: string; subtitle: string; image: string }) {
  const src = await pngDataUrl(image);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "radial-gradient(80% 70% at 70% 70%, #2a1208 0%, #08090b 60%)",
        color: "#eceef1",
        padding: 64,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, letterSpacing: 4 }}>
        <div style={{ width: 14, height: 14, borderRadius: 7, background: "#ff5a1f" }} />
        AUTOVIEW <span style={{ color: "#ff5a1f" }}>3D</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ position: "absolute", right: -30, bottom: 80, width: 700, objectFit: "contain" }} />
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 520 }}>
        <div style={{ fontSize: 20, letterSpacing: 4, color: "#8b919b" }}>{eyebrow.toUpperCase()}</div>
        <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 0.95, marginTop: 12 }}>{title.toUpperCase()}</div>
        <div style={{ fontSize: 26, color: "#8b919b", marginTop: 18 }}>{subtitle}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: "#ff5a1f" }} />
    </div>
  );
}
