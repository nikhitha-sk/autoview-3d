import * as THREE from "three";
import type { ResolvedShape } from "@/lib/carShapes";

/**
 * Procedural car generator.
 *
 * The body is built as a *loft*: a series of rounded-rectangle cross-sections
 * swept along the car's length. Each section's top / bottom / half-width come
 * from smooth profile functions derived from the archetype preset, so the
 * resulting surface has continuous curvature (which reads like real paint
 * under studio reflections) instead of the flat slab look of an extrusion.
 *
 * Car-local axes: +x forward, +y up, +z right (driver side for RHD).
 */

type P = { x: number; y: number; r?: number };
type Fn = (x: number) => number;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Polyline with rounded corners (quadratic fillets), sampled densely. */
function roundedChain(points: P[], samples = 500): THREE.Vector2[] {
  const path = new THREE.Path();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1];
    const p = points[i];
    const b = points[i + 1];
    const v1 = new THREE.Vector2(a.x - p.x, a.y - p.y);
    const v2 = new THREE.Vector2(b.x - p.x, b.y - p.y);
    const l1 = v1.length();
    const l2 = v2.length();
    const r = Math.min(p.r ?? 0, l1 * 0.5, l2 * 0.5);
    if (r <= 1e-4) {
      path.lineTo(p.x, p.y);
      continue;
    }
    const p1 = v1.normalize().multiplyScalar(r).add(new THREE.Vector2(p.x, p.y));
    const p2 = v2.normalize().multiplyScalar(r).add(new THREE.Vector2(p.x, p.y));
    path.lineTo(p1.x, p1.y);
    path.quadraticCurveTo(p.x, p.y, p2.x, p2.y);
  }
  const last = points[points.length - 1];
  path.lineTo(last.x, last.y);
  return path.getSpacedPoints(samples);
}

/** Turn sampled points into y = f(x) via linear interpolation (upper envelope on ties). */
function toFunction(pts: THREE.Vector2[]): Fn {
  const s = [...pts].sort((a, b) => a.x - b.x);
  const xs = s.map((p) => p.x);
  const ys = s.map((p) => p.y);
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    let lo = 0;
    let hi = xs.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid;
      else hi = mid;
    }
    const t = (x - xs[lo]) / Math.max(1e-9, xs[hi] - xs[lo]);
    return lerp(ys[lo], ys[hi], t);
  };
}

/** Quarter-ellipse blend: 0 at u=0 (flat), drops to 1 at u=1 with vertical tangent. */
const ellipseOut = (u: number) => 1 - Math.sqrt(Math.max(0, 1 - clamp(u) * clamp(u)));

interface SectionParams {
  hw: number;
  b: number;
  t: number;
  rTop: number;
  rBot: number;
  crown: number;
  /** Outer band (|z| beyond `wellZ`) is remapped to span [bOuter, t + fender]:
   *  this carves wheel wells only under the fenders and raises fender humps. */
  wellZ?: number;
  bOuter?: number;
  fender?: number;
  /** maps (y, section) -> z scale factor (tumblehome) */
  taper: (y: number, b: number, t: number) => number;
}

// Segment resolution of a rounded-rectangle ring.
const SIDE = 5;
const CORNER = 8;
const TOP = 24;
const BOTTOM = 24;
export const RING = 2 * SIDE + 4 * CORNER + TOP + BOTTOM;

/** Rounded-rectangle cross-section in the (z, y) plane, CCW when viewed from +x. */
function ring(sp: SectionParams, out: [number, number][]) {
  out.length = 0;
  const h = Math.max(0.002, sp.t - sp.b);
  const rT = Math.min(sp.rTop, h * 0.55, sp.hw * 0.95);
  const rB = Math.min(sp.rBot, Math.max(0, h - rT) * 0.9, sp.hw * 0.5);
  const push = (z: number, y: number) => out.push([z, y]);

  // right side, going up
  for (let i = 0; i < SIDE; i++) {
    const v = i / SIDE;
    push(sp.hw, lerp(sp.b + rB, sp.t - rT, v));
  }
  // top-right corner
  for (let i = 0; i < CORNER; i++) {
    const a = (i / CORNER) * (Math.PI / 2);
    push(sp.hw - rT + rT * Math.cos(a), sp.t - rT + rT * Math.sin(a));
  }
  // top edge, right -> left
  for (let i = 0; i < TOP; i++) {
    const v = i / TOP;
    push(lerp(sp.hw - rT, -(sp.hw - rT), v), sp.t);
  }
  // top-left corner
  for (let i = 0; i < CORNER; i++) {
    const a = Math.PI / 2 + (i / CORNER) * (Math.PI / 2);
    push(-(sp.hw - rT) + rT * Math.cos(a), sp.t - rT + rT * Math.sin(a));
  }
  // left side, going down
  for (let i = 0; i < SIDE; i++) {
    const v = i / SIDE;
    push(-sp.hw, lerp(sp.t - rT, sp.b + rB, v));
  }
  // bottom-left corner
  for (let i = 0; i < CORNER; i++) {
    const a = Math.PI + (i / CORNER) * (Math.PI / 2);
    push(-(sp.hw - rB) + rB * Math.cos(a), sp.b + rB + rB * Math.sin(a));
  }
  // bottom edge, left -> right
  for (let i = 0; i < BOTTOM; i++) {
    const v = i / BOTTOM;
    push(lerp(-(sp.hw - rB), sp.hw - rB, v), sp.b);
  }
  // bottom-right corner
  for (let i = 0; i < CORNER; i++) {
    const a = 1.5 * Math.PI + (i / CORNER) * (Math.PI / 2);
    push(sp.hw - rB + rB * Math.cos(a), sp.b + rB + rB * Math.sin(a));
  }

  const mid = (sp.b + sp.t) / 2;
  const bO = sp.bOuter ?? sp.b;
  const fen = sp.fender ?? 0;
  const tO = sp.t + fen;
  const wellZ = sp.wellZ ?? sp.hw * 2;
  const remap = bO > sp.b + 1e-4 || fen > 1e-4;

  // crown (top surface curvature), outer well/fender remap, tumblehome
  for (const p of out) {
    const [z, y] = p;
    const topW = smoothstep(sp.t - rT - 0.001, sp.t, y);
    const zn = sp.hw > 0 ? z / sp.hw : 0;
    let yy = y;
    if (remap) {
      const az = Math.abs(z);
      // wide soft blend for the fender on top, tight blend for the wheel-well wall below
      const w = y >= mid ? smoothstep(wellZ - 0.13, wellZ + 0.03, az) : smoothstep(wellZ - 0.015, wellZ + 0.015, az);
      if (w > 0) {
        const remapped = bO + ((y - sp.b) / Math.max(1e-4, sp.t - sp.b)) * (tO - bO);
        yy = lerp(y, remapped, w);
      }
    }
    yy += sp.crown * topW * (1 - zn * zn);
    p[0] = z * sp.taper(y, sp.b, sp.t);
    p[1] = yy;
  }
}

/** Sweep sections along x-stations into an indexed, smooth-shaded BufferGeometry with end caps. */
function loft(stations: number[], section: (x: number) => SectionParams | null): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const pts: [number, number][] = [];
  const rings: number[] = [];

  for (const x of stations) {
    const sp = section(x);
    if (!sp) continue;
    ring(sp, pts);
    rings.push(pos.length / 3);
    for (const [z, y] of pts) pos.push(x, y, z);
  }

  for (let r = 0; r < rings.length - 1; r++) {
    const s0 = rings[r];
    const s1 = rings[r + 1];
    for (let j = 0; j < RING; j++) {
      const j1 = (j + 1) % RING;
      const a = s0 + j;
      const b = s1 + j;
      const c = s1 + j1;
      const d = s0 + j1;
      idx.push(a, b, d, b, c, d);
    }
  }

  // end caps (separate vertices for crisp normals)
  const cap = (start: number, front: boolean) => {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let j = 0; j < RING; j++) {
      cx += pos[(start + j) * 3];
      cy += pos[(start + j) * 3 + 1];
      cz += pos[(start + j) * 3 + 2];
    }
    const base = pos.length / 3;
    pos.push(cx / RING, cy / RING, cz / RING);
    for (let j = 0; j < RING; j++) {
      pos.push(pos[(start + j) * 3], pos[(start + j) * 3 + 1], pos[(start + j) * 3 + 2]);
    }
    for (let j = 0; j < RING; j++) {
      const j1 = (j + 1) % RING;
      if (front) idx.push(base, base + 1 + j1, base + 1 + j);
      else idx.push(base, base + 1 + j, base + 1 + j1);
    }
  };
  if (rings.length > 1) {
    cap(rings[0], false);
    cap(rings[rings.length - 1], true);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

export interface Placement {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

export interface CarBuild {
  body: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  roof: THREE.BufferGeometry;
  /** wheel centres in car-local space; z sign tells the side */
  wheels: THREE.Vector3[];
  archR: number;
  /** |z| where the wheel wells begin */
  wellZ: number;
  bodyHalfWidthAt: Fn;
  topAt: Fn;
  bottomAt: Fn;
  beltY: number;
  /** helper that projects onto the body surface along a direction */
  stick: (origin: THREE.Vector3, dir: THREE.Vector3, offset?: number) => Placement | null;
  noseTopY: number;
  noseMidY: number;
  chinY: number;
  tailMidY: number;
  deckY: number;
}

/** Build stations: cosine-clustered at the ends, dense around the wheel arches. */
function makeStations(xR: number, xF: number, arches: { x: number; r: number }[]) {
  const s: number[] = [];
  const N = 150;
  for (let i = 0; i <= N; i++) {
    const u = (1 - Math.cos((Math.PI * i) / N)) / 2;
    s.push(lerp(xR, xF, u));
  }
  for (const a of arches) {
    const K = 40;
    for (let i = 0; i <= K; i++) s.push(a.x - a.r + (2 * a.r * i) / K);
    // exact vertical arch walls
    s.push(a.x - a.r - 1e-4, a.x + a.r + 1e-4);
  }
  return [...new Set(s.map((v) => Math.round(v * 1e5) / 1e5))]
    .filter((v) => v >= xR && v <= xF)
    .sort((a, b) => a - b);
}

export function buildCar(s: ResolvedShape): CarBuild {
  const { L, W, H, xF, xR, xFw, xRw, xA, xC, xRf, xRr } = s;
  const R = s.wheelR;
  const cl = s.clearance;
  const aR = R + 0.035;
  const archTop = R + aR;

  // ---------- lower body profile ----------
  const noseRun = Math.max(0.05, s.noseRun * L);
  const noseTopY = s.noseY * H;
  const noseMidY = Math.max(cl + 0.12, noseTopY - Math.max(noseRun, 0.06) * 0.9);
  const chinR = Math.min(0.28, 0.06 * L);
  const chinY = cl + (noseMidY - cl) * 0.32;
  const hoodY = s.hoodY * H;
  const beltRear = s.beltRearY * H;
  const deckY = s.deckY * H;
  const tailMid = Math.min(s.tailMidY * H, deckY - 0.04);
  const tailRun = Math.max(0.03, Math.min(0.02 * L, (xC - xR) * 0.5));
  const rearChinR = Math.min(0.24, 0.05 * L);
  const rearChinY = cl + (tailMid - cl) * 0.35;

  const x3 = xF - noseRun;
  const x6 = xR + tailRun;
  const topChain = roundedChain([
    { x: x3, y: noseTopY },
    { x: xA, y: hoodY, r: 0.35 },
    { x: xC, y: beltRear, r: 0.3 },
    { x: x6, y: deckY },
  ]);
  const topMid = toFunction(topChain);

  const wheelsX = [xFw, xRw];

  const topAt: Fn = (x) => {
    let t: number;
    if (x > x3) t = lerp(noseTopY, noseMidY, ellipseOut((x - x3) / (xF - x3)));
    else if (x < x6) t = lerp(deckY, tailMid, ellipseOut((x6 - x) / (x6 - xR)));
    else t = topMid(x);
    let lift = 0;
    for (const w of wheelsX) {
      const d = Math.abs(x - w);
      const fall = smoothstep(aR + 1.2, aR * 0.4, d);
      lift = Math.max(lift, Math.max(0, archTop - 0.035 - t) * fall);
    }
    return t + lift;
  };

  /** Height of the wheel-arch opening at x (or -Infinity outside arches). */
  const archBottom: Fn = (x) => {
    let b = -Infinity;
    for (const w of wheelsX) {
      const d = Math.abs(x - w);
      if (d < aR) b = Math.max(b, R + Math.sqrt(aR * aR - d * d));
    }
    return b;
  };

  /** Fender hump needed over the wheels so the outer skin clears the arch. */
  const fenderAt: Fn = (x) => {
    let f = 0;
    for (const w of wheelsX) {
      const d = Math.abs(x - w);
      const fall = smoothstep(aR + 1.05, aR * 0.55, d);
      const need = archTop + 0.04 - topAt(x);
      f = Math.max(f, Math.max(0, need) * fall + s.fenderFlare * fall);
    }
    return f;
  };

  const bottomAt: Fn = (x) => {
    let b = cl;
    if (x > xF - chinR) b = lerp(cl, chinY, ellipseOut((x - (xF - chinR)) / chinR));
    if (x < xR + rearChinR) b = lerp(cl, rearChinY, ellipseOut((xR + rearChinR - x) / rearChinR));
    return b;
  };

  const rpF = clamp(s.noseRound * 1.25, 0.06, 0.4);
  const rpR = clamp(s.tailRound * 1.25, 0.05, 0.38);
  const hwAt: Fn = (x) => {
    let hw = W / 2;
    if (x > xF - rpF) hw -= rpF * ellipseOut((x - (xF - rpF)) / rpF);
    if (x < xR + rpR) hw -= rpR * ellipseOut((xR + rpR - x) / rpR);
    return hw;
  };

  const bodyTaper = (y: number, b: number, t: number) => {
    const f = (y - b) / Math.max(1e-3, t - b);
    return 1 - 0.065 * smoothstep(0.55, 1.0, f) - 0.05 * smoothstep(0.3, 0, f);
  };

  const stations = makeStations(xR, xF, wheelsX.map((x) => ({ x, r: aR })));
  const wellZ = W / 2 - s.tireW - 0.07;
  const body = loft(stations, (x) => {
    const b = bottomAt(x);
    const ab = archBottom(x);
    return {
      hw: hwAt(x),
      b,
      t: topAt(x),
      rTop: 0.16,
      rBot: 0.06,
      crown: 0.025,
      wellZ,
      bOuter: Math.max(b, ab),
      fender: fenderAt(x),
      taper: bodyTaper,
    };
  });

  // ---------- greenhouse (glass) ----------
  const glassChain = roundedChain([
    { x: xC, y: beltRear - 0.02 },
    { x: xRr, y: H, r: s.roofRound * 0.9 },
    { x: xRf, y: H, r: s.roofRound },
    { x: xA, y: hoodY - 0.02 },
  ]);
  const gTop = toFunction(glassChain);
  const beltY = hoodY;
  const ghw = (W / 2) * s.glassWidth;
  const glassTaper = (y: number) => 1 - s.glassTaper * clamp((y - beltY) / (H - beltY));
  const gStations: number[] = [];
  const GN = 120;
  for (let i = 0; i <= GN; i++) gStations.push(lerp(xC + 0.005, xA - 0.005, (1 - Math.cos((Math.PI * i) / GN)) / 2));
  const glass = loft(gStations, (x) => {
    const t = gTop(x);
    const b = Math.min(topAt(x) - 0.06, t - 0.02);
    return {
      hw: ghw,
      b,
      t,
      rTop: Math.min(0.1 + s.roofRound * 0.2, 0.18),
      rBot: 0.01,
      crown: 0.03,
      taper: (y) => glassTaper(y),
    };
  });

  // ---------- roof panel ----------
  const roofInset = 0.06;
  const rx0 = lerp(xRr, xC, s.roofExtend) + roofInset;
  const rx1 = xRf - roofInset;
  const rStations: number[] = [];
  const RN = 60;
  const rRound = 0.18;
  for (let i = 0; i <= RN; i++) rStations.push(lerp(rx0, rx1, (1 - Math.cos((Math.PI * i) / RN)) / 2));
  const roofHwBase = ghw * glassTaper(H) - 0.035;
  const roof = loft(rStations, (x) => {
    const t = gTop(x) + 0.006;
    let hw = roofHwBase;
    if (x > rx1 - rRound) hw -= rRound * ellipseOut((x - (rx1 - rRound)) / rRound) * 0.6;
    if (x < rx0 + rRound) hw -= rRound * ellipseOut((rx0 + rRound - x) / rRound) * 0.6;
    return {
      hw,
      b: t - 0.06,
      t,
      rTop: 0.035,
      rBot: 0.005,
      crown: 0.03,
      taper: () => 1,
    };
  });

  // ---------- surface sticking helper ----------
  const bodyMesh = new THREE.Mesh(body);
  const ray = new THREE.Raycaster();
  const up = new THREE.Vector3(0, 1, 0);
  const stick = (origin: THREE.Vector3, dir: THREE.Vector3, offset = 0.004): Placement | null => {
    ray.set(origin, dir.clone().normalize());
    const hit = ray.intersectObject(bodyMesh, false)[0];
    if (!hit || !hit.face) return null;
    const n = hit.face.normal.clone().normalize();
    const xAxis = new THREE.Vector3().crossVectors(up, n);
    if (xAxis.lengthSq() < 1e-6) xAxis.set(1, 0, 0);
    xAxis.normalize();
    const yAxis = new THREE.Vector3().crossVectors(n, xAxis).normalize();
    const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, n);
    return {
      position: hit.point.clone().addScaledVector(n, offset),
      quaternion: new THREE.Quaternion().setFromRotationMatrix(m),
    };
  };

  const wz = W / 2 - s.tireW / 2 - 0.035;
  const wheels = [
    new THREE.Vector3(xFw, R, wz),
    new THREE.Vector3(xFw, R, -wz),
    new THREE.Vector3(xRw, R, wz),
    new THREE.Vector3(xRw, R, -wz),
  ];

  return {
    body,
    glass,
    roof,
    wheels,
    archR: aR,
    wellZ,
    bodyHalfWidthAt: hwAt,
    topAt,
    bottomAt,
    beltY,
    stick,
    noseTopY,
    noseMidY,
    chinY,
    tailMidY: tailMid,
    deckY,
  };
}

/** Tyre cross-section revolved around the axle (axis along z after rotation). */
export function tyreGeometry(R: number, w: number) {
  const rim = R * 0.66;
  const pts = [
    new THREE.Vector2(rim, -w / 2 + 0.01),
    new THREE.Vector2(R - 0.05, -w / 2),
    new THREE.Vector2(R - 0.012, -w / 2 + 0.018),
    new THREE.Vector2(R, -w / 2 + 0.05),
    new THREE.Vector2(R, w / 2 - 0.05),
    new THREE.Vector2(R - 0.012, w / 2 - 0.018),
    new THREE.Vector2(R - 0.05, w / 2),
    new THREE.Vector2(rim, w / 2 - 0.01),
  ];
  const g = new THREE.LatheGeometry(pts, 56);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Simple canvas-drawn textures for the procedural cockpit displays. */
export function cockpitTexture(kind: "cluster" | "center", accent: string, label: string) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, 0, 256);
  bg.addColorStop(0, "#06080c");
  bg.addColorStop(1, "#0d1118");
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 256);
  if (kind === "cluster") {
    const dial = (cx: number, value: number, title: string, big: string) => {
      g.lineWidth = 10;
      g.strokeStyle = "#1c2330";
      g.beginPath();
      g.arc(cx, 140, 88, Math.PI * 0.75, Math.PI * 2.25);
      g.stroke();
      g.strokeStyle = accent;
      g.beginPath();
      g.arc(cx, 140, 88, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * value));
      g.stroke();
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * (0.75 + 0.15 * i);
        g.strokeStyle = "#5b6577";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * 72, 140 + Math.sin(a) * 72);
        g.lineTo(cx + Math.cos(a) * 64, 140 + Math.sin(a) * 64);
        g.stroke();
      }
      g.fillStyle = "#e8edf5";
      g.font = "600 44px sans-serif";
      g.textAlign = "center";
      g.fillText(big, cx, 150);
      g.fillStyle = "#7d8799";
      g.font = "500 16px monospace";
      g.fillText(title, cx, 180);
    };
    dial(128, 0.62, "KM/H", "112");
    dial(384, 0.38, "RPM x1000", "3.4");
    g.fillStyle = "#7d8799";
    g.font = "500 14px monospace";
    g.textAlign = "center";
    g.fillText(label.toUpperCase(), 256, 34);
  } else {
    g.strokeStyle = "#16202c";
    g.lineWidth = 1;
    for (let i = 0; i < 512; i += 24) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 256);
      g.stroke();
    }
    for (let i = 0; i < 256; i += 24) {
      g.beginPath();
      g.moveTo(0, i);
      g.lineTo(512, i);
      g.stroke();
    }
    g.strokeStyle = accent;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(40, 220);
    g.bezierCurveTo(160, 200, 180, 90, 300, 110);
    g.bezierCurveTo(380, 120, 420, 60, 480, 40);
    g.stroke();
    g.fillStyle = "#e8edf5";
    g.font = "600 26px sans-serif";
    g.fillText("AutoView Drive", 28, 46);
    g.fillStyle = "#7d8799";
    g.font = "500 15px monospace";
    g.fillText("NAV · 12.4 KM · 18 MIN", 28, 72);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
