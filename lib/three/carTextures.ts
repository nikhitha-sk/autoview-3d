import * as THREE from "three";
import type { ResolvedShape } from "@/lib/carShapes";
import { clamp, lerp, type CarBuild, type GhMetrics } from "./buildCar";

/**
 * Canvas-painted textures for the procedural car.
 *
 * - greenhouse: paint / black-trim colour + window holes in the alpha channel,
 *   painted in the greenhouse's (x, ring-parameter) UV space
 * - body: panel shut lines and a bump map with grooves and character creases
 * - lamps, grilles, plates: graphics for the wrap-around decals
 */

const hasDOM = () => typeof document !== "undefined";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
}

function toTexture(c: HTMLCanvasElement, srgb = true, aniso = 8) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

/** Signed distance of a rounded box given inner distances to its edges (negative inside). */
function roundedSD(dx: number, dy: number, r: number) {
  const ex = r - dx;
  const ey = r - dy;
  return Math.hypot(Math.max(ex, 0), Math.max(ey, 0)) + Math.min(Math.max(ex, ey), 0) - r;
}

/** Surface distance from the roof centreline for ring parameter p on the right half (p ∈ [0, 3]). */
function qOfP(p: number, m: GhMetrics) {
  if (p <= 1) return m.hwmrt + m.arc + (1 - p) * m.bandH;
  if (p <= 2) return m.hwmrt + (2 - p) * m.arc;
  return (3 - p) * m.hwmrt;
}

interface Col {
  x: number;
  m: GhMetrics;
  /** height of the greenhouse above the sill (m) */
  above: number;
}

// ---------------------------------------------------------------- greenhouse

export function greenhouseTexture(s: ResolvedShape, b: CarBuild) {
  if (!hasDOM()) return null;
  const W = 2048;
  const H = 768;
  const { c, g } = canvas(W, H);
  const img = g.createImageData(W, H);
  const d = img.data;
  const { ghX0, ghX1, xB, bHalf, doors, xDoorR } = b.layout;

  const cols: Col[] = [];
  for (let i = 0; i < W; i++) {
    const x = lerp(ghX0, ghX1, (i + 0.5) / W);
    const m = b.ghMetrics(x);
    cols.push({ x, m, above: b.ghSection(x).sp.t - b.sillAt(x) });
  }

  const BIG = 9;
  const slim = s.rearPillar === "slim";
  // rear glass hangs from the roof; on fastbacks (roofExtend > 0) the lower part of the slope is painted
  // upright tailgates get a body-colour spoiler lip above the glass
  const xRgTop = s.xRr - (slim ? 0.06 : 0.03);
  const xRgBottom = s.roofExtend > 0 ? lerp(s.xRr, s.xC, 1 - s.roofExtend) : s.xC - 0.4;
  const cPillar = (f: number) =>
    slim ? s.xRr + 0.06 + 0.1 * f : lerp(lerp(s.xRr, s.xC, 0.24), s.xRr + 0.1, f);

  type Side = { xr: (f: number) => number; xf: (f: number) => number };
  const sides: Side[] = [];
  if (doors === 4) {
    sides.push({ xr: () => xB + bHalf, xf: () => s.xA + 1 });
    const xQ = xDoorR + 0.02;
    const hasQuarter = slim && xQ - cPillar(0.5) > 0.16;
    sides.push({ xr: hasQuarter ? () => xQ + 0.018 : cPillar, xf: () => xB - bHalf });
    if (hasQuarter) sides.push({ xr: cPillar, xf: () => xQ - 0.018 });
  } else {
    const quarter = xB - 0.02 - cPillar(0.4) > 0.14;
    sides.push({ xr: quarter ? () => xB + 0.018 : cPillar, xf: () => s.xA + 1 });
    if (quarter) sides.push({ xr: cPillar, xf: () => xB - 0.018 });
  }

  const sunLen = Math.min(0.85, (s.xRf - s.xRr) * 0.55);

  for (let i = 0; i < W; i++) {
    const { x, m, above } = cols[i];
    const { qWs, qTop } = m;
    // tailgate glass sits inside visible D-pillars and well above the belt (painted panel below)
    const qRg = slim ? m.hwmrt * 0.97 : m.hwmrt * 0.8;
    const wsBottom = above - 0.02;
    const rgBottom = above - (slim ? 0.16 : 0.05);
    for (let j = 0; j < H; j++) {
      const p = 6 * (1 - (j + 0.5) / H);
      const pp = p <= 3 ? p : 6 - p;
      const q = qOfP(pp, m);

      let sd = BIG;
      // windscreen
      sd = Math.min(sd, roundedSD(Math.min(x - (s.xRf + 0.03), wsBottom), qWs - q, 0.07));
      // rear glass
      sd = Math.min(sd, roundedSD(Math.min(xRgTop - x, x - xRgBottom, rgBottom), qRg - q, 0.06));
      // side windows
      const span = m.qSill - qTop;
      if (span > 0) {
        const f = clamp((m.qSill - q) / span);
        const dy = Math.min(m.qSill - q, q - qTop);
        for (const w of sides) sd = Math.min(sd, roundedSD(Math.min(x - w.xr(f), w.xf(f) - x), dy, 0.045));
      }
      // glass roof / sunroof
      if (s.glassRoof) sd = Math.min(sd, roundedSD(Math.min(x - (xRgTop - 0.08), s.xRf + 0.05 - x), m.hwmrt * 0.9 - q, 0.06));
      else if (s.sunroof) sd = Math.min(sd, roundedSD(Math.min(x - (s.xRf - 0.14 - sunLen), s.xRf - 0.14 - x), m.hwmrt * 0.72 - q, 0.05));

      let black = s.pillarsBlack;
      if (!black && s.roofBlack && q < m.hwmrt + m.arc * 0.62) black = true;
      if (!black && doors === 4 && Math.abs(x - xB) < bHalf + 0.014 && q > m.hwmrt + m.arc * 0.55) black = true;
      if (!black && doors === 2 && Math.abs(x - xB) < 0.03 && q > qTop - 0.02) black = true;
      if (sd < 0.014) black = true; // window seals

      const k = (j * W + i) * 4;
      const alpha = clamp(0.5 + sd / 0.003);
      const v = black ? 16 : 255;
      d[k] = v;
      d[k + 1] = v;
      d[k + 2] = v;
      d[k + 3] = Math.round(alpha * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const t = toTexture(c);
  t.premultiplyAlpha = false;
  return t;
}

// ---------------------------------------------------------------- body panels

export function bodyTextures(s: ResolvedShape, b: CarBuild) {
  if (!hasDOM()) return null;
  const W = 2048;
  const H = 1024;
  const { bodyX0, bodyX1, xDoorF, xB, xDoorR, doors } = b.layout;
  const px = (x: number) => ((x - bodyX0) / (bodyX1 - bodyX0)) * W;
  const py = (p: number) => (1 - p / 10) * H;

  const col = canvas(W, H);
  const bump = canvas(W, H);
  col.g.fillStyle = "#ffffff";
  col.g.fillRect(0, 0, W, H);
  bump.g.fillStyle = "#808080";
  bump.g.fillRect(0, 0, W, H);

  // both sides: right side uses p directly, left side mirrors p -> 6 - p
  const path = (pts: [number, number][], mirror: boolean) => {
    const gs = [col.g, bump.g];
    for (const g of gs) {
      g.beginPath();
      pts.forEach(([x, p], i) => {
        const pm = mirror ? 6 - p : p;
        if (i === 0) g.moveTo(px(x), py(pm));
        else g.lineTo(px(x), py(pm));
      });
    }
  };
  const groove = (pts: [number, number][], width = 2.2) => {
    for (const mirror of [false, true]) {
      path(pts, mirror);
      col.g.strokeStyle = "rgba(20,20,22,0.85)";
      col.g.lineWidth = width;
      col.g.lineCap = "round";
      col.g.lineJoin = "round";
      col.g.stroke();
      bump.g.strokeStyle = "#000000";
      bump.g.lineWidth = width + 1.5;
      bump.g.lineCap = "round";
      bump.g.lineJoin = "round";
      bump.g.stroke();
    }
  };

  // top-band ring parameter for a given |z| on the body at x
  const pTop = (x: number, zFrac: number) => {
    const sec = b.bodySection(x);
    const hwmrt = Math.max(0.05, sec.sp.hw - sec.rT);
    return 2 + clamp(1 - (sec.sp.hw * zFrac) / hwmrt, 0, 0.95);
  };
  const vLine = (x: number, p0 = 0.05, p1 = 2.05) => groove([[x, p0], [x, p1]]);

  // doors
  vLine(xDoorF);
  vLine(xB);
  if (doors === 4) vLine(xDoorR);

  // hood: two seams along the fenders, cowl line and leading edge
  const noseRun = Math.max(0.05, s.noseRun * s.L);
  const hoodFront = s.xF - noseRun + 0.02;
  const hoodBack = s.xA + 0.04;
  const seam: [number, number][] = [];
  for (let i = 0; i <= 30; i++) {
    const x = lerp(hoodBack, hoodFront, i / 30);
    seam.push([x, pTop(x, 0.64 - 0.06 * (i / 30) ** 2)]);
  }
  groove(seam);
  groove([[hoodBack, pTop(hoodBack, 0.64)], [hoodBack, 3]]);
  groove([[hoodFront, seam[seam.length - 1][1]], [hoodFront, 3]]);

  // boot lid on cars with a real rear deck
  const tailRun = Math.max(0.03, Math.min(0.02 * s.L, (s.xC - s.xR) * 0.5));
  const deckEnd = s.xR + tailRun + 0.02;
  if (s.xC - deckEnd > 0.3) {
    const bootF = s.xC - 0.05;
    const bs: [number, number][] = [];
    for (let i = 0; i <= 16; i++) {
      const x = lerp(bootF, deckEnd, i / 16);
      bs.push([x, pTop(x, 0.7)]);
    }
    groove(bs);
    groove([[bootF, pTop(bootF, 0.7)], [bootF, 3]]);
  }

  // fuel filler flap above the rear wheel (right side only)
  const fx = s.xRw + (doors === 4 ? -0.08 : 0.15);
  for (const [ctx, color, width] of [
    [col.g, "rgba(20,20,22,0.8)", 2],
    [bump.g, "#000", 3],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.roundRect(px(fx - 0.08), py(0.86), px(fx + 0.08) - px(fx - 0.08), py(0.62) - py(0.86), 6);
    ctx.stroke();
  }

  // character crease along the flank (a soft ridge in the bump map only)
  if (s.crease !== "none") {
    bump.g.save();
    bump.g.filter = "blur(2.5px)";
    const x0 = s.xFw - b.archR * 0.6;
    const x1 = s.xRw + b.archR * 0.4;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      const rise = s.crease === "rising" ? u * 0.12 : 0;
      pts.push([lerp(x0, x1, u), s.creaseP + rise]);
    }
    for (const mirror of [false, true]) {
      bump.g.beginPath();
      pts.forEach(([x, p], i) => {
        const pm = mirror ? 6 - p : p;
        if (i === 0) bump.g.moveTo(px(x), py(pm));
        else bump.g.lineTo(px(x), py(pm));
      });
      bump.g.strokeStyle = "#d8d8d8";
      bump.g.lineWidth = 5;
      bump.g.stroke();
    }
    bump.g.restore();
  }

  const map = toTexture(col.c);
  const bumpMap = toTexture(bump.c, false);
  return { map, bumpMap };
}

// ---------------------------------------------------------------- decal graphics

export interface DecalTex {
  map: THREE.Texture;
  emissive?: THREE.Texture;
}

type Paint = (g: CanvasRenderingContext2D, emit: boolean, w: number, h: number) => void;

function decalTex(w: number, h: number, paint: Paint, emissive = true): DecalTex | null {
  if (!hasDOM()) return null;
  const a = canvas(w, h);
  paint(a.g, false, w, h);
  const out: DecalTex = { map: toTexture(a.c) };
  if (emissive) {
    const e = canvas(w, h);
    e.g.fillStyle = "#000";
    e.g.fillRect(0, 0, w, h);
    paint(e.g, true, w, h);
    out.emissive = toTexture(e.c);
  }
  return out;
}

const LENS = "#0c0e12";
const HOUSING = "#2a2e35";
const REFLECTOR = "#8c929b";

function poly(g: CanvasRenderingContext2D, pts: [number, number][]) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}

/** Headlight graphics; u runs inner (0) -> outer (1), v top (0) -> bottom (1). */
export function headlightTex(style: string) {
  return decalTex(512, 256, (g, emit, w, h) => {
    const glow = (fill: string) => (emit ? "#ffffff" : fill);
    g.lineJoin = "round";
    g.lineCap = "round";
    if (style === "round") {
      const cx = w / 2;
      const cy = h / 2;
      const r = h * 0.47;
      g.save();
      g.scale(w / h, 1); // texture is 2:1 but the decal is square in metres: draw an ellipse that lands round
      const sx = cx / (w / h);
      if (!emit) {
        g.fillStyle = "#b9bec6";
        g.beginPath();
        g.arc(sx, cy, r, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = LENS;
        g.beginPath();
        g.arc(sx, cy, r * 0.9, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = REFLECTOR;
        g.beginPath();
        g.arc(sx, cy, r * 0.42, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = glow("#dfe8ff");
      g.lineWidth = r * 0.09;
      g.beginPath();
      g.arc(sx, cy, r * 0.72, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = glow("#f4f7ff");
      g.beginPath();
      g.arc(sx, cy, r * 0.22, 0, Math.PI * 2);
      g.fill();
      g.restore();
      return;
    }
    if (style === "split") {
      // slim full-width DRL blade
      if (!emit) {
        g.fillStyle = LENS;
        g.beginPath();
        g.roundRect(0, h * 0.28, w * 0.98, h * 0.44, h * 0.2);
        g.fill();
      }
      g.fillStyle = glow("#e9f1ff");
      g.beginPath();
      g.roundRect(0, h * 0.4, w * 0.95, h * 0.2, h * 0.1);
      g.fill();
      return;
    }
    if (style === "lamp") {
      // lower main-beam cluster for split headlights
      if (!emit) {
        g.fillStyle = LENS;
        g.beginPath();
        g.roundRect(w * 0.02, h * 0.1, w * 0.96, h * 0.8, h * 0.25);
        g.fill();
      }
      for (let i = 0; i < 3; i++) {
        const cx = w * (0.22 + i * 0.28);
        if (!emit) {
          g.fillStyle = REFLECTOR;
          g.beginPath();
          g.arc(cx, h / 2, h * 0.24, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = glow("#f6f8ff");
        g.beginPath();
        g.arc(cx, h / 2, h * 0.12, 0, Math.PI * 2);
        g.fill();
      }
      return;
    }
    if (style === "sharp") {
      const shape: [number, number][] = [
        [0, h * 0.62],
        [w * 0.18, h * 0.38],
        [w, h * 0.08],
        [w, h * 0.62],
        [w * 0.82, h * 0.92],
        [0, h * 0.92],
      ];
      if (!emit) {
        g.fillStyle = HOUSING;
        poly(g, shape);
        g.fill();
        g.fillStyle = LENS;
        g.save();
        g.translate(w * 0.5, h * 0.55);
        g.scale(0.94, 0.86);
        g.translate(-w * 0.5, -h * 0.55);
        poly(g, shape);
        g.fill();
        g.restore();
        for (const cx of [0.42, 0.66]) {
          g.fillStyle = REFLECTOR;
          g.beginPath();
          g.arc(w * cx, h * 0.6, h * 0.17, 0, Math.PI * 2);
          g.fill();
        }
      }
      for (const cx of [0.42, 0.66]) {
        g.fillStyle = glow("#ffffff");
        g.beginPath();
        g.arc(w * cx, h * 0.6, h * 0.08, 0, Math.PI * 2);
        g.fill();
      }
      // DRL: swept line along the upper edge, hooking down at the outer end
      g.strokeStyle = glow("#e6efff");
      g.lineWidth = h * 0.07;
      g.beginPath();
      g.moveTo(w * 0.12, h * 0.5);
      g.lineTo(w * 0.24, h * 0.36);
      g.lineTo(w * 0.93, h * 0.17);
      g.lineTo(w * 0.93, h * 0.55);
      g.stroke();
      return;
    }
    // "strip": slim, wide lens with a row of LED projectors
    const shape: [number, number][] = [
      [0, h * 0.4],
      [w * 0.96, h * 0.18],
      [w, h * 0.35],
      [w * 0.96, h * 0.82],
      [0, h * 0.86],
    ];
    if (!emit) {
      g.fillStyle = HOUSING;
      poly(g, shape);
      g.fill();
      g.fillStyle = LENS;
      g.save();
      g.translate(w * 0.5, h * 0.55);
      g.scale(0.97, 0.8);
      g.translate(-w * 0.5, -h * 0.55);
      poly(g, shape);
      g.fill();
      g.restore();
    }
    for (let i = 0; i < 4; i++) {
      const cx = w * (0.18 + i * 0.19);
      if (!emit) {
        g.fillStyle = REFLECTOR;
        g.beginPath();
        g.roundRect(cx - h * 0.1, h * 0.52, h * 0.2, h * 0.2, h * 0.04);
        g.fill();
      }
      g.fillStyle = glow("#ffffff");
      g.beginPath();
      g.roundRect(cx - h * 0.06, h * 0.56, h * 0.12, h * 0.12, h * 0.03);
      g.fill();
    }
    g.strokeStyle = glow("#e6efff");
    g.lineWidth = h * 0.06;
    g.beginPath();
    g.moveTo(w * 0.04, h * 0.44);
    g.lineTo(w * 0.94, h * 0.25);
    g.stroke();
  });
}

const RED_LENS = "#3a0508";
const RED = "#ff2233";

/** Tail-light graphics. "bar" spans the full width (u = left -> right); others are per side (u inner -> outer). */
export function taillightTex(style: string) {
  return decalTex(1024, 256, (g, emit, w, h) => {
    const glow = (fill: string) => fill;
    g.lineCap = "round";
    g.lineJoin = "round";
    if (style === "bar") {
      if (!emit) {
        g.fillStyle = RED_LENS;
        g.beginPath();
        g.roundRect(0, h * 0.32, w, h * 0.36, h * 0.12);
        g.fill();
        // dark ends with brighter blocks (main lamps)
        g.fillStyle = "#1a0306";
        for (const x0 of [0, w * 0.84]) {
          g.beginPath();
          g.roundRect(x0, h * 0.2, w * 0.16, h * 0.6, h * 0.12);
          g.fill();
        }
      }
      g.fillStyle = glow(RED);
      g.beginPath();
      g.roundRect(w * 0.01, h * 0.45, w * 0.98, h * 0.1, h * 0.05);
      g.fill();
      for (const x0 of [w * 0.015, w * 0.855]) {
        g.strokeStyle = glow(RED);
        g.lineWidth = h * 0.07;
        g.beginPath();
        g.roundRect(x0, h * 0.28, w * 0.13, h * 0.44, h * 0.08);
        g.stroke();
      }
      return;
    }
    if (style === "vertical") {
      // stacked tail / indicator / reverse cells; only the tail cell glows
      if (!emit) {
        g.fillStyle = "#1a1d22";
        g.beginPath();
        g.roundRect(w * 0.3, 0, w * 0.68, h, h * 0.1);
        g.fill();
        ["#3a0508", "#5a3600", "#4a4f57"].forEach((fill, i) => {
          g.fillStyle = fill;
          g.beginPath();
          g.roundRect(w * 0.34, h * (0.05 + i * 0.31), w * 0.6, h * 0.27, h * 0.05);
          g.fill();
        });
      }
      g.fillStyle = RED;
      g.beginPath();
      g.roundRect(w * 0.38, h * 0.09, w * 0.52, h * 0.19, h * 0.04);
      g.fill();
      return;
    }
    // "pair": wrap-around cluster, C-shaped light signature
    const shape: [number, number][] = [
      [0, h * 0.2],
      [w * 0.92, h * 0.1],
      [w, h * 0.3],
      [w, h * 0.78],
      [w * 0.3, h * 0.86],
      [0, h * 0.8],
    ];
    if (!emit) {
      g.fillStyle = RED_LENS;
      poly(g, shape);
      g.fill();
    }
    g.strokeStyle = glow(RED);
    g.lineWidth = h * 0.08;
    g.beginPath();
    g.moveTo(w * 0.05, h * 0.3);
    g.lineTo(w * 0.88, h * 0.22);
    g.lineTo(w * 0.9, h * 0.68);
    g.lineTo(w * 0.35, h * 0.72);
    g.stroke();
    if (!emit) {
      g.fillStyle = "#c7ccd2";
      g.beginPath();
      g.roundRect(w * 0.42, h * 0.38, w * 0.16, h * 0.2, h * 0.05);
      g.fill();
    }
  });
}

/** Grille graphics (alpha = shape; body paint shows through elsewhere). */
export function grilleTex(style: string) {
  return decalTex(
    512,
    256,
    (g, emit, w, h) => {
      if (emit) return;
      g.lineJoin = "round";
      if (style === "kidney") {
        for (const side of [-1, 1]) {
          const cx = w / 2 + side * w * 0.22;
          g.fillStyle = "#c8ccd2";
          g.beginPath();
          g.roundRect(cx - w * 0.2, h * 0.04, w * 0.4, h * 0.92, h * 0.22);
          g.fill();
          g.fillStyle = "#07080a";
          g.beginPath();
          g.roundRect(cx - w * 0.18, h * 0.08, w * 0.36, h * 0.84, h * 0.19);
          g.fill();
          g.fillStyle = "#25282d";
          for (let i = -4; i <= 4; i++) g.fillRect(cx + i * w * 0.036 - 3, h * 0.08, 6, h * 0.84);
        }
        return;
      }
      if (style === "slots") {
        const n = 7;
        for (let i = 0; i < n; i++) {
          const cx = w * (0.08 + (0.84 * (i + 0.5)) / n);
          g.fillStyle = "#b8bdc4";
          g.beginPath();
          g.roundRect(cx - w * 0.044, h * 0.03, w * 0.088, h * 0.94, w * 0.034);
          g.fill();
          g.fillStyle = "#050607";
          g.beginPath();
          g.roundRect(cx - w * 0.036, h * 0.07, w * 0.072, h * 0.86, w * 0.028);
          g.fill();
        }
        return;
      }
      if (style === "bars") {
        // full-height vertical chrome slats in a framed grille (G-Class "Panamericana" style)
        g.fillStyle = "#c3c8ce";
        g.beginPath();
        g.roundRect(0, 0, w, h, h * 0.08);
        g.fill();
        g.fillStyle = "#060708";
        g.beginPath();
        g.roundRect(w * 0.025, h * 0.06, w * 0.95, h * 0.88, h * 0.05);
        g.fill();
        g.fillStyle = "#aeb3ba";
        const n = 15;
        for (let i = 1; i < n; i++) g.fillRect(w * 0.025 + (w * 0.95 * i) / n - 4, h * 0.06, 8, h * 0.88);
        g.fillRect(w * 0.025, h * 0.47, w * 0.95, 6);
        return;
      }
      if (style === "hex") {
        g.fillStyle = "#08090b";
        poly(g, [
          [w * 0.08, h * 0.05],
          [w * 0.92, h * 0.05],
          [w, h * 0.45],
          [w * 0.86, h * 0.95],
          [w * 0.14, h * 0.95],
          [0, h * 0.45],
        ]);
        g.fill();
        g.save();
        g.clip();
        g.strokeStyle = "#30343a";
        g.lineWidth = 3;
        const r = 14;
        for (let y = 0; y < h + r; y += r * 1.5)
          for (let x = 0; x < w + r; x += r * Math.sqrt(3)) {
            const ox = (Math.round(y / (r * 1.5)) % 2) * r * 0.87;
            g.beginPath();
            for (let k = 0; k < 6; k++) {
              const a = (Math.PI / 3) * k + Math.PI / 6;
              const xx = x + ox + Math.cos(a) * r * 0.62;
              const yy = y + Math.sin(a) * r * 0.62;
              if (k) g.lineTo(xx, yy);
              else g.moveTo(xx, yy);
            }
            g.closePath();
            g.stroke();
          }
        g.restore();
        return;
      }
      if (style === "intake") {
        g.fillStyle = "#07080a";
        g.beginPath();
        g.roundRect(0, h * 0.1, w, h * 0.8, h * 0.35);
        g.fill();
        g.save();
        g.clip();
        g.strokeStyle = "#22252a";
        g.lineWidth = 4;
        for (let x = -h; x < w + h; x += 18) {
          g.beginPath();
          g.moveTo(x, h * 0.1);
          g.lineTo(x + h * 0.8, h * 0.9);
          g.moveTo(x + h * 0.8, h * 0.1);
          g.lineTo(x, h * 0.9);
          g.stroke();
        }
        g.restore();
        return;
      }
      if (style === "diffuser") {
        g.fillStyle = "#0a0b0d";
        g.beginPath();
        g.roundRect(0, 0, w, h, h * 0.2);
        g.fill();
        g.fillStyle = "#24272c";
        for (let i = 1; i < 8; i++) g.fillRect((w * i) / 8 - 4, h * 0.1, 8, h * 0.9);
        return;
      }
      // "wide": large grille with chrome horizontal bars
      g.fillStyle = "#c9cdd3";
      g.beginPath();
      g.roundRect(0, 0, w, h, h * 0.18);
      g.fill();
      g.fillStyle = "#07080a";
      g.beginPath();
      g.roundRect(w * 0.02, h * 0.06, w * 0.96, h * 0.88, h * 0.14);
      g.fill();
      g.fillStyle = "#9aa0a8";
      for (let i = 1; i < 6; i++) g.fillRect(w * 0.03, (h * i) / 6 - 3, w * 0.94, 6);
    },
    false,
  );
}

/** Registration plate (white, Indian private-vehicle style). */
export function plateTex(text: string) {
  return decalTex(
    520,
    120,
    (g, emit, w, h) => {
      if (emit) return;
      g.fillStyle = "#f4f4f2";
      g.beginPath();
      g.roundRect(0, 0, w, h, 10);
      g.fill();
      g.strokeStyle = "#111";
      g.lineWidth = 5;
      g.beginPath();
      g.roundRect(6, 6, w - 12, h - 12, 8);
      g.stroke();
      g.fillStyle = "#121212";
      g.font = "700 74px 'Arial Narrow', Arial, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, w / 2, h / 2 + 3);
    },
    false,
  );
}
