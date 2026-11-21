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
 * Every ring vertex carries a ring parameter `p` (see `sectionPoint`) which is
 * also written to the UVs, so textures can be painted in (x, p) space: door
 * shut lines on the body, window openings on the greenhouse.
 *
 * Car-local axes: +x forward, +y up, +z right (driver side for RHD).
 */

type P = { x: number; y: number };
export type Fn = (x: number) => number;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Smooth (centripetal Catmull-Rom) curve through control points: continuous curvature, no kinks. */
function smoothChain(points: P[], samples = 500): THREE.Vector2[] {
  const clean: P[] = [];
  for (const p of points) {
    const last = clean[clean.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.03) clean.push(p);
  }
  if (clean.length < 2) return clean.map((p) => new THREE.Vector2(p.x, p.y));
  const curve = new THREE.CatmullRomCurve3(
    clean.map((p) => new THREE.Vector3(p.x, p.y, 0)),
    false,
    "centripetal",
  );
  return curve.getSpacedPoints(samples).map((v) => new THREE.Vector2(v.x, v.y));
}

/** Turn sampled points into y = f(x) via linear interpolation. */
function toFunction(pts: { x: number; y: number }[]): Fn {
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

export interface SectionParams {
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
  /** Cabin opening: top surface inside |z| < cabinZ drops to cabinFloor (the "tub"). */
  cabinZ?: number;
  cabinFloor?: number;
  /** maps (y, section) -> z scale factor (tumblehome) */
  taper: (y: number, b: number, t: number) => number;
}

export interface Section {
  sp: SectionParams;
  rT: number;
  rB: number;
  mid: number;
  bO: number;
  tO: number;
  wellZ: number;
  remap: boolean;
}

export function prepSection(sp: SectionParams): Section {
  const h = Math.max(0.002, sp.t - sp.b);
  const rT = Math.min(sp.rTop, h * 0.55, sp.hw * 0.95);
  const rB = Math.min(sp.rBot, Math.max(0, h - rT) * 0.9, sp.hw * 0.5);
  const bO = sp.bOuter ?? sp.b;
  const fen = sp.fender ?? 0;
  return {
    sp,
    rT,
    rB,
    mid: (sp.b + sp.t) / 2,
    bO,
    tO: sp.t + fen,
    wellZ: sp.wellZ ?? sp.hw * 2,
    remap: bO > sp.b + 1e-4 || fen > 1e-4,
  };
}

const HALF_PI = Math.PI / 2;

/**
 * Point on a rounded-rectangle section for ring parameter p ∈ [0, 10):
 *   [0,1) right side (bottom → top)      [1,2) top-right corner
 *   [2,4) top (right → left, centre = 3)  [4,5) top-left corner
 *   [5,6) left side (top → bottom)       [6,7) bottom-left corner
 *   [7,9) bottom (left → right)          [9,10) bottom-right corner
 * Returns [z, y].
 */
export function sectionPoint(sec: Section, p: number): [number, number] {
  const { sp, rT, rB } = sec;
  const { hw, b, t } = sp;
  let z: number;
  let y: number;
  if (p < 1) {
    z = hw;
    y = lerp(b + rB, t - rT, p);
  } else if (p < 2) {
    const a = (p - 1) * HALF_PI;
    z = hw - rT + rT * Math.cos(a);
    y = t - rT + rT * Math.sin(a);
  } else if (p < 4) {
    z = lerp(hw - rT, -(hw - rT), (p - 2) / 2);
    y = t;
  } else if (p < 5) {
    const a = HALF_PI + (p - 4) * HALF_PI;
    z = -(hw - rT) + rT * Math.cos(a);
    y = t - rT + rT * Math.sin(a);
  } else if (p < 6) {
    z = -hw;
    y = lerp(t - rT, b + rB, p - 5);
  } else if (p < 7) {
    const a = Math.PI + (p - 6) * HALF_PI;
    z = -(hw - rB) + rB * Math.cos(a);
    y = b + rB + rB * Math.sin(a);
  } else if (p < 9) {
    z = lerp(-(hw - rB), hw - rB, (p - 7) / 2);
    y = b;
  } else {
    const a = 1.5 * Math.PI + (p - 9) * HALF_PI;
    z = hw - rB + rB * Math.cos(a);
    y = b + rB + rB * Math.sin(a);
  }

  // crown (top surface curvature), outer well/fender remap, cabin tub, tumblehome
  const topW = smoothstep(t - rT - 0.001, t, y);
  const zn = hw > 0 ? z / hw : 0;
  let yy = y;
  if (sec.remap) {
    const az = Math.abs(z);
    // wide soft blend for the fender on top, tight blend for the wheel-well wall below
    const w =
      y >= sec.mid
        ? smoothstep(sec.wellZ - 0.13, sec.wellZ + 0.03, az)
        : smoothstep(sec.wellZ - 0.015, sec.wellZ + 0.015, az);
    if (w > 0) {
      const remapped = sec.bO + ((y - b) / Math.max(1e-4, t - b)) * (sec.tO - sec.bO);
      yy = lerp(y, remapped, w);
    }
  }
  if (sp.cabinZ !== undefined && sp.cabinFloor !== undefined && y >= sec.mid) {
    const wc = smoothstep(sp.cabinZ - 0.025, sp.cabinZ + 0.005, Math.abs(z));
    yy = lerp(sp.cabinFloor, yy, wc);
  }
  yy += sp.crown * topW * (1 - zn * zn);
  return [z * sp.taper(y, b, t), yy];
}

// Ring parameters for the closed body tube.
const SIDE = 12;
const CORNER = 8;
const TOP = 24;
const BOTTOM = 16;
const ringParams = (sides: number, corner: number, top: number, bottom: number, closed: boolean) => {
  const p: number[] = [];
  const seg = (a: number, b: number, n: number) => {
    for (let i = 0; i < n; i++) p.push(a + ((b - a) * i) / n);
  };
  seg(0, 1, sides);
  seg(1, 2, corner);
  seg(2, 4, top);
  seg(4, 5, corner);
  seg(5, 6, sides);
  if (closed) {
    seg(6, 7, corner);
    seg(7, 9, bottom);
    seg(9, 10, corner);
    p.push(10); // seam duplicate so UVs don't wrap
  } else p.push(6);
  return p;
};
const BODY_P = ringParams(SIDE, CORNER, TOP, BOTTOM, true);
const UPPER_P = ringParams(16, 12, 32, 0, false);

interface LoftOpts {
  ps: number[];
  closed: boolean;
  /** UV mapping: u = (x - x0) / (x1 - x0), v = p / pMax */
  uv: [number, number, number];
}

/** Sweep sections along x-stations into an indexed, smooth-shaded BufferGeometry. */
function loft(stations: number[], section: (x: number) => SectionParams | null, o: LoftOpts): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  const rings: number[] = [];
  const n = o.ps.length;
  const [ux0, ux1, pMax] = o.uv;

  for (const x of stations) {
    const sp = section(x);
    if (!sp) continue;
    const sec = prepSection(sp);
    rings.push(pos.length / 3);
    const u = (x - ux0) / (ux1 - ux0);
    for (const p of o.ps) {
      const [z, y] = sectionPoint(sec, p >= 10 ? 0 : p);
      pos.push(x, y, z);
      uvs.push(u, p / pMax);
    }
  }

  for (let r = 0; r < rings.length - 1; r++) {
    const s0 = rings[r];
    const s1 = rings[r + 1];
    for (let j = 0; j < n - 1; j++) {
      const a = s0 + j;
      const b = s1 + j;
      const c = s1 + j + 1;
      const d = s0 + j + 1;
      idx.push(a, b, d, b, c, d);
    }
  }

  // end caps (separate vertices for crisp normals)
  const cap = (start: number, front: boolean) => {
    const m = n - 1; // skip the seam duplicate
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let j = 0; j < m; j++) {
      cx += pos[(start + j) * 3];
      cy += pos[(start + j) * 3 + 1];
      cz += pos[(start + j) * 3 + 2];
    }
    const base = pos.length / 3;
    const u = uvs[start * 2];
    pos.push(cx / m, cy / m, cz / m);
    uvs.push(u, 0.8);
    for (let j = 0; j < m; j++) {
      pos.push(pos[(start + j) * 3], pos[(start + j) * 3 + 1], pos[(start + j) * 3 + 2]);
      uvs.push(u, 0.8);
    }
    for (let j = 0; j < m; j++) {
      const j1 = (j + 1) % m;
      if (front) idx.push(base, base + 1 + j1, base + 1 + j);
      else idx.push(base, base + 1 + j, base + 1 + j1);
    }
  };
  if (o.closed && rings.length > 1) {
    cap(rings[0], false);
    cap(rings[rings.length - 1], true);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
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

/** Arc-length metrics of the greenhouse section at x, used to lay out windows. */
export interface GhMetrics {
  /** half-width of the flat roof band */
  hwmrt: number;
  /** arc length of the roof corner */
  arc: number;
  /** height of the vertical side band */
  bandH: number;
  /** q (surface distance from roof centreline) at the window sill */
  qSill: number;
  /** q at the bottom edge of the greenhouse section (p = 0) */
  qMax: number;
  /** half-width (in q) of the windscreen / glass roof */
  qWs: number;
  /** q of the side-window top edge (one pillar width below the windscreen edge) */
  qTop: number;
}

export interface CarLayout {
  doors: 2 | 4;
  /** front edge of the front door */
  xDoorF: number;
  /** door split (B-pillar centre for 4 doors, door rear edge for 2 doors) */
  xB: number;
  /** rear edge of the rear door (4 doors) */
  xDoorR: number;
  /** B-pillar half-width */
  bHalf: number;
  /** greenhouse texture x-range */
  ghX0: number;
  ghX1: number;
  bodyX0: number;
  bodyX1: number;
}

export type DecalEnd = "front" | "rear";

export interface CarBuild {
  body: THREE.BufferGeometry;
  /** painted greenhouse shell (windows are cut by texture alpha) */
  green: THREE.BufferGeometry;
  /** inner trim shell (headliner / pillar trim seen from the cabin) */
  greenInner: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  /** wheel centres in car-local space; z sign tells the side */
  wheels: THREE.Vector3[];
  archR: number;
  /** |z| where the wheel wells begin */
  wellZ: number;
  bodyHalfWidthAt: Fn;
  topAt: Fn;
  bottomAt: Fn;
  fenderAt: Fn;
  beltY: number;
  /** body-top height where the greenhouse sits */
  sillAt: Fn;
  /** helper that projects onto the body surface along a direction */
  stick: (origin: THREE.Vector3, dir: THREE.Vector3, offset?: number) => Placement | null;
  noseTopY: number;
  noseMidY: number;
  chinY: number;
  tailMidY: number;
  deckY: number;
  rearChinY: number;
  /** y of the body skin hit from above at (x, z) */
  surfaceY: (x: number, z: number) => number | null;
  archBottom: Fn;
  bodySection: (x: number) => Section;
  ghSection: (x: number) => Section;
  ghMetrics: (x: number) => GhMetrics;
  /** point + outward normal on the greenhouse / body skin at (x, p) */
  ghPoint: (x: number, p: number, offset?: number) => { p: THREE.Vector3; n: THREE.Vector3 };
  bodyPoint: (x: number, p: number, offset?: number) => { p: THREE.Vector3; n: THREE.Vector3 };
  /** Wrap-around decal on the nose or tail; map(a, b) -> [h, y] where h is arc length round the end. */
  decal: (end: DecalEnd, map: (a: number, b: number) => [number, number], na?: number, nb?: number, offset?: number) => THREE.BufferGeometry;
  layout: CarLayout;
  /** glass section x-range */
  ghXs: [number, number];
}

/** Build stations: cosine-clustered at the ends, dense around the wheel arches. */
function makeStations(xR: number, xF: number, arches: { x: number; r: number }[]) {
  const s: number[] = [];
  const N = 160;
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
  // hood rises convexly from the nose to the cowl; trunk lid crowns slightly
  const topChain = smoothChain([
    { x: x3, y: noseTopY },
    { x: lerp(x3, xA, 0.45), y: lerp(noseTopY, hoodY, 0.72) },
    { x: xA, y: hoodY },
    { x: lerp(xA, xC, 0.5), y: lerp(hoodY, beltRear, 0.5) + 0.006 },
    { x: xC, y: beltRear },
    { x: lerp(xC, x6, 0.5), y: lerp(beltRear, deckY, 0.5) + 0.012 },
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
    // plan view: the body narrows toward the nose and tail instead of being a rectangle
    const fT = Math.pow(smoothstep(xFw - 0.35, xF, x), 1.5);
    const rT = Math.pow(smoothstep(xRw + 0.35, xR, x), 1.5);
    let hw = (W / 2) * (1 - s.planTaper * fT - s.planTaper * 0.7 * rT);
    // rear "hips" over the rear wheels (sports cars)
    hw += s.hips * Math.exp(-(((x - xRw) / 0.75) ** 2));
    if (x > xF - rpF) hw -= rpF * ellipseOut((x - (xF - rpF)) / rpF);
    if (x < xR + rpR) hw -= rpR * ellipseOut((xR + rpR - x) / rpR);
    return hw;
  };

  // barrel-shaped sides: widest a little below the middle, tumbling in to the shoulder and tucking under
  const bodyTaper = (y: number, b: number, t: number) => {
    const f = clamp((y - b) / Math.max(1e-3, t - b));
    const fMax = 0.42;
    if (f > fMax) {
      const u = (f - fMax) / (1 - fMax);
      return 1 - s.sideBulge * 0.9 * u * u;
    }
    const u = (fMax - f) / fMax;
    return 1 - s.sideBulge * 0.75 * u * u;
  };

  // ---------- greenhouse profile ----------
  const arch = s.roofArch;
  const glassChain = smoothChain([
    { x: xC, y: beltRear - 0.02 },
    { x: lerp(xC, xRr, 0.5), y: lerp(beltRear, H - arch, 0.5) + 0.03 * s.rearCurve },
    { x: xRr, y: H - arch },
    { x: (xRf + xRr) / 2, y: H },
    { x: xRf, y: H - arch * 0.8 },
    { x: lerp(xA, xRf, 0.55), y: lerp(hoodY, H - arch, 0.55) + 0.03 },
    { x: xA, y: hoodY - 0.02 },
  ]);
  const gTop = toFunction(glassChain);
  const beltY = hoodY;
  const ghw = (W / 2) * s.glassWidth;
  const glassTaper = (y: number) => 1 - s.glassTaper * clamp((y - beltY) / (H - beltY));
  const gR = clamp(s.bodyRound * 0.55 + 0.05, 0.06, 0.2);

  const stations = makeStations(xR, xF, wheelsX.map((x) => ({ x, r: aR })));
  const wellZ = W / 2 - s.tireW - 0.07;
  // cabin tub runs from just behind the windscreen base to behind the rear seats / into the boot
  const cabinFront = xA - 0.04;
  const cabinRear = Math.max(xC + 0.12, xR + 0.25);
  const cabinFloor = cl + 0.1;
  const bodyParams = (x: number): SectionParams => {
    const b = bottomAt(x);
    const ab = archBottom(x);
    const inCabin = x > cabinRear && x < cabinFront;
    const hw = hwAt(x);
    return {
      cabinZ: inCabin ? Math.min(hw * 0.86, ghw - 0.03) : undefined,
      cabinFloor: inCabin ? cabinFloor : undefined,
      hw,
      b,
      t: topAt(x),
      rTop: s.bodyRound,
      rBot: 0.07,
      crown: 0.03,
      wellZ,
      bOuter: Math.max(b, ab),
      fender: fenderAt(x),
      taper: bodyTaper,
    };
  };
  const body = loft(stations, bodyParams, { ps: BODY_P, closed: true, uv: [xR, xF, 10] });

  const bodyMesh = new THREE.Mesh(body);
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const surfaceY = (x: number, z: number) => {
    ray.set(new THREE.Vector3(x, H + 1, z), down);
    const hit = ray.intersectObject(bodyMesh, false)[0];
    return hit ? hit.point.y : null;
  };

  // where the greenhouse meets the body skin (window sill reference)
  const gx0 = xC + 0.005;
  const gx1 = xA - 0.005;
  const sillPts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 48; i++) {
    const x = lerp(gx0, gx1, i / 48);
    sillPts.push({ x, y: surfaceY(x, ghw + 0.012) ?? topAt(x) });
  }
  const sillAt = toFunction(sillPts);

  const ghParams = (x: number, inset = 0): SectionParams => {
    const t = gTop(x) - inset;
    const b = Math.min(topAt(x) - 0.06, t - 0.02);
    return {
      hw: ghw - inset,
      b,
      t,
      rTop: Math.max(0.02, gR - inset),
      rBot: 0.01,
      crown: 0.03,
      taper: (y) => glassTaper(y),
    };
  };
  const gStations: number[] = [];
  const GN = 140;
  for (let i = 0; i <= GN; i++) gStations.push(lerp(gx0, gx1, (1 - Math.cos((Math.PI * i) / GN)) / 2));
  const ghUV: [number, number, number] = [gx0, gx1, 6];
  const green = loft(gStations, (x) => ghParams(x), { ps: UPPER_P, closed: false, uv: ghUV });
  const greenInner = loft(gStations, (x) => ghParams(x, 0.025), { ps: UPPER_P, closed: false, uv: ghUV });
  const glass = loft(gStations, (x) => ghParams(x, 0.007), { ps: UPPER_P, closed: false, uv: ghUV });

  const ghSection = (x: number) => prepSection(ghParams(x));
  const bodySection = (x: number) => prepSection(bodyParams(x));

  const ghMetrics = (x: number): GhMetrics => {
    const sec = ghSection(x);
    const { t, b, hw } = sec.sp;
    const hwmrt = hw - sec.rT;
    const arc = sec.rT * HALF_PI;
    const bandH = Math.max(0, t - sec.rT - (b + sec.rB));
    const qOfY = (y: number) => hwmrt + arc + (t - sec.rT - y);
    const qWs = hwmrt + arc * 0.3;
    return {
      hwmrt,
      arc,
      bandH,
      qSill: qOfY(sillAt(x) + 0.03),
      qMax: hwmrt + arc + bandH,
      qWs,
      qTop: Math.min(qWs + 0.09, hwmrt + arc + bandH * 0.4),
    };
  };

  const surfacePoint = (secAt: (x: number) => Section) => (x: number, p: number, offset = 0) => {
    const at = (xx: number, pp: number) => {
      const [z, y] = sectionPoint(secAt(xx), pp);
      return new THREE.Vector3(xx, y, z);
    };
    const c = at(x, p);
    const e = 0.004;
    const dx = at(x + e, p).sub(at(x - e, p));
    const dp = at(x, p + 0.01).sub(at(x, Math.max(0, p - 0.01)));
    const n = new THREE.Vector3().crossVectors(dx, dp).normalize();
    const sec = secAt(x);
    const out = new THREE.Vector3(0, c.y - sec.mid, c.z);
    if (n.dot(out) < 0) n.negate();
    return { p: c.addScaledVector(n, offset), n };
  };
  const ghPoint = surfacePoint(ghSection);
  const bodyPoint = surfacePoint(bodySection);

  // ---------- surface sticking helper ----------
  const up = new THREE.Vector3(0, 1, 0);
  const placementFrom = (point: THREE.Vector3, n: THREE.Vector3, offset: number): Placement => {
    const xAxis = new THREE.Vector3().crossVectors(up, n);
    if (xAxis.lengthSq() < 1e-6) xAxis.set(1, 0, 0);
    xAxis.normalize();
    const yAxis = new THREE.Vector3().crossVectors(n, xAxis).normalize();
    const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, n);
    return {
      position: point.clone().addScaledVector(n, offset),
      quaternion: new THREE.Quaternion().setFromRotationMatrix(m),
    };
  };
  const stick = (origin: THREE.Vector3, dir: THREE.Vector3, offset = 0.004): Placement | null => {
    ray.set(origin, dir.clone().normalize());
    const hit = ray.intersectObject(bodyMesh, false)[0];
    if (!hit || !hit.face) return null;
    return placementFrom(hit.point, hit.face.normal.clone().normalize(), offset);
  };

  // ---------- wrap-around decals (lights, grilles) ----------
  const subMesh = (keep: (x: number) => boolean) => {
    const index = body.getIndex()!;
    const pos = body.getAttribute("position");
    const out: number[] = [];
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);
      if (keep((pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3)) out.push(a, b, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", pos);
    g.setAttribute("normal", body.getAttribute("normal"));
    g.setIndex(out);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return new THREE.Mesh(g);
  };
  const ends: Record<DecalEnd, { mesh: THREE.Mesh; ax: number; sx: number }> = {
    front: { mesh: subMesh((x) => x > xF - 1.5), ax: xF - W * 0.5, sx: 1 },
    rear: { mesh: subMesh((x) => x < xR + 1.5), ax: xR + W * 0.5, sx: -1 },
  };
  const dProj = W * 0.5;
  const tri = new THREE.Triangle();
  const nA = new THREE.Vector3();
  const nB = new THREE.Vector3();
  const nC = new THREE.Vector3();
  const decal = (end: DecalEnd, map: (a: number, b: number) => [number, number], na = 48, nb = 12, offset = 0.003) => {
    const e = ends[end];
    const normalAttr = e.mesh.geometry.getAttribute("normal");
    const posAttr = e.mesh.geometry.getAttribute("position");
    const pos: number[] = [];
    const nor: number[] = [];
    const uv: number[] = [];
    type Hit = { p: THREE.Vector3; n: THREE.Vector3 };
    let last: Hit | null = null;
    for (let j = 0; j <= nb; j++) {
      for (let i = 0; i <= na; i++) {
        const a = i / na;
        const b = j / nb;
        const [h, y] = map(a, b);
        const th = h / dProj;
        const dir = new THREE.Vector3(e.sx * Math.cos(th), 0, Math.sin(th));
        const origin = new THREE.Vector3(e.ax, y, 0).addScaledVector(dir, 6);
        ray.set(origin, dir.clone().negate());
        const hit = ray.intersectObject(e.mesh, false)[0];
        let cur: Hit | null = last;
        if (hit && hit.face) {
          tri.set(
            new THREE.Vector3().fromBufferAttribute(posAttr, hit.face.a),
            new THREE.Vector3().fromBufferAttribute(posAttr, hit.face.b),
            new THREE.Vector3().fromBufferAttribute(posAttr, hit.face.c),
          );
          nA.fromBufferAttribute(normalAttr, hit.face.a);
          nB.fromBufferAttribute(normalAttr, hit.face.b);
          nC.fromBufferAttribute(normalAttr, hit.face.c);
          const n = new THREE.Vector3();
          THREE.Triangle.getInterpolation(hit.point, tri.a, tri.b, tri.c, nA, nB, nC, n);
          n.normalize();
          if (n.dot(dir) < 0) n.negate();
          cur = { p: hit.point.clone(), n };
        }
        if (!cur) cur = { p: origin.clone().addScaledVector(dir, -5.5), n: dir.clone() };
        last = cur;
        pos.push(cur.p.x + cur.n.x * offset, cur.p.y + cur.n.y * offset, cur.p.z + cur.n.z * offset);
        nor.push(cur.n.x, cur.n.y, cur.n.z);
        uv.push(a, b);
      }
    }
    const idx: number[] = [];
    const row = na + 1;
    // winding so that faces point along the surface normal (mirrored maps flip it)
    const vtx = (k: number) => new THREE.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
    const ci = Math.floor(nb / 2) * row + Math.floor(na / 2);
    const faceN = new THREE.Vector3().crossVectors(vtx(ci + 1).sub(vtx(ci)), vtx(ci + row).sub(vtx(ci)));
    const flip = faceN.dot(new THREE.Vector3(nor[ci * 3], nor[ci * 3 + 1], nor[ci * 3 + 2])) < 0;
    for (let j = 0; j < nb; j++)
      for (let i = 0; i < na; i++) {
        const a0 = j * row + i;
        const b0 = a0 + 1;
        const c0 = a0 + row + 1;
        const d0 = a0 + row;
        if (flip) idx.push(a0, d0, b0, b0, d0, c0);
        else idx.push(a0, b0, d0, b0, c0, d0);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  };

  // ---------- door layout ----------
  const doors = s.doors;
  // front door starts just behind the A-pillar base, but never over the front wheel arch
  const xDoorF = Math.min(xA - 0.03, xFw - aR - 0.06);
  const frontDoorLen = doors === 4 ? clamp(0.235 * L, 0.92, 1.18) : clamp(0.29 * L, 1.1, 1.38);
  const xB = doors === 4 ? Math.max(xDoorF - frontDoorLen, xRr + 0.25) : Math.max(xDoorF - frontDoorLen, xRw + aR + 0.12);
  const xDoorR = Math.max(xRw + aR * 0.45, xB - frontDoorLen * 0.95);

  const wz = W / 2 - s.tireW / 2 - 0.035;
  const wheels = [
    new THREE.Vector3(xFw, R, wz),
    new THREE.Vector3(xFw, R, -wz),
    new THREE.Vector3(xRw, R, wz),
    new THREE.Vector3(xRw, R, -wz),
  ];

  return {
    body,
    green,
    greenInner,
    glass,
    wheels,
    archR: aR,
    wellZ,
    bodyHalfWidthAt: hwAt,
    topAt,
    bottomAt,
    fenderAt,
    beltY,
    sillAt,
    stick,
    noseTopY,
    noseMidY,
    chinY,
    tailMidY: tailMid,
    deckY,
    rearChinY,
    surfaceY,
    archBottom,
    bodySection,
    ghSection,
    ghMetrics,
    ghPoint,
    bodyPoint,
    decal,
    layout: {
      doors,
      xDoorF,
      xB,
      xDoorR,
      bHalf: 0.045,
      ghX0: gx0,
      ghX1: gx1,
      bodyX0: xR,
      bodyX1: xF,
    },
    ghXs: [gx0, gx1],
  };
}

/** Tyre cross-section revolved around the axle (axis along z after rotation). */
export function tyreGeometry(R: number, w: number, rimR = R * 0.7) {
  const sw = R - rimR; // sidewall height
  const pts: THREE.Vector2[] = [];
  // inner bead -> sidewall bulge -> shoulder -> tread -> mirror
  const half = [
    [rimR + 0.004, -w / 2 + 0.012],
    [rimR + sw * 0.3, -w / 2 - 0.004],
    [rimR + sw * 0.62, -w / 2 - 0.008],
    [R - 0.03, -w / 2 + 0.002],
    [R - 0.01, -w / 2 + 0.02],
    [R, -w / 2 + 0.045],
  ];
  for (const [r, z] of half) pts.push(new THREE.Vector2(r, z));
  for (const [r, z] of [...half].reverse()) pts.push(new THREE.Vector2(r, -z));
  const g = new THREE.LatheGeometry(pts, 72);
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
