import type { Archetype, GrilleStyle, HeadlightStyle, ShapeOverrides, TaillightStyle } from "./types";

/**
 * Parametric description of a car silhouette.
 * Heights are fractions of overall height, x-positions are fractions of length
 * measured from the FRONT bumper (0) to the REAR bumper (1).
 */
interface Preset {
  frontShare: number; // share of total overhang that sits in front of the front axle
  wheelR: number; // metres
  tireW: number; // metres
  clearance: number; // metres
  noseY: number;
  hoodY: number;
  beltRearY: number;
  deckY: number;
  tailMidY: number;
  aX: number; // windscreen base
  roofFrontX: number;
  roofRearX: number;
  cX: number; // rear glass base
  noseRun: number;
  noseRound: number; // metres
  tailRound: number; // metres
  roofRound: number; // metres
  glassTaper: number;
  glassWidth: number; // fraction of body width
  grille: GrilleStyle;
  headlight: HeadlightStyle;
  taillight: TaillightStyle;
  spokes: number;
  rimColor: string;
  caliper: string;
}

const base: Preset = {
  frontShare: 0.45,
  wheelR: 0.34,
  tireW: 0.25,
  clearance: 0.14,
  noseY: 0.46,
  hoodY: 0.6,
  beltRearY: 0.65,
  deckY: 0.68,
  tailMidY: 0.52,
  aX: 0.33,
  roofFrontX: 0.48,
  roofRearX: 0.75,
  cX: 0.86,
  noseRun: 0.04,
  noseRound: 0.22,
  tailRound: 0.16,
  roofRound: 0.22,
  glassTaper: 0.2,
  glassWidth: 0.86,
  grille: "wide",
  headlight: "strip",
  taillight: "bar",
  spokes: 5,
  rimColor: "#c9ccd1",
  caliper: "#1a1a1a",
};

export const PRESETS: Record<Archetype, Preset> = {
  sports: {
    ...base,
    frontShare: 0.47,
    wheelR: 0.345,
    tireW: 0.27,
    clearance: 0.11,
    noseY: 0.42,
    hoodY: 0.6,
    beltRearY: 0.68,
    deckY: 0.62,
    tailMidY: 0.5,
    aX: 0.35,
    roofFrontX: 0.5,
    roofRearX: 0.62,
    cX: 0.88,
    noseRound: 0.26,
    tailRound: 0.3,
    roofRound: 0.35,
    glassTaper: 0.28,
    glassWidth: 0.8,
    grille: "none",
    headlight: "round",
    taillight: "bar",
    spokes: 10,
  },
  supercar: {
    ...base,
    frontShare: 0.5,
    wheelR: 0.35,
    tireW: 0.3,
    clearance: 0.1,
    noseY: 0.3,
    hoodY: 0.56,
    beltRearY: 0.74,
    deckY: 0.73,
    tailMidY: 0.55,
    aX: 0.29,
    roofFrontX: 0.45,
    roofRearX: 0.57,
    cX: 0.8,
    noseRun: 0.07,
    noseRound: 0.14,
    tailRound: 0.07,
    roofRound: 0.3,
    glassTaper: 0.32,
    glassWidth: 0.74,
    grille: "hex",
    headlight: "sharp",
    taillight: "pair",
    spokes: 5,
    rimColor: "#2a2c30",
  },
  coupe: {
    ...base,
    frontShare: 0.43,
    wheelR: 0.345,
    tireW: 0.27,
    clearance: 0.12,
    noseY: 0.44,
    hoodY: 0.61,
    beltRearY: 0.67,
    deckY: 0.7,
    tailMidY: 0.55,
    aX: 0.4,
    roofFrontX: 0.55,
    roofRearX: 0.69,
    cX: 0.82,
    noseRound: 0.2,
    tailRound: 0.12,
    roofRound: 0.3,
    glassTaper: 0.24,
    glassWidth: 0.82,
    grille: "kidney",
    headlight: "sharp",
    taillight: "pair",
    spokes: 7,
    rimColor: "#24262a",
  },
  boxy: {
    ...base,
    frontShare: 0.47,
    wheelR: 0.41,
    tireW: 0.29,
    clearance: 0.24,
    noseY: 0.5,
    hoodY: 0.56,
    beltRearY: 0.58,
    deckY: 0.58,
    tailMidY: 0.45,
    aX: 0.32,
    roofFrontX: 0.38,
    roofRearX: 0.985,
    cX: 0.99,
    noseRun: 0.012,
    noseRound: 0.06,
    tailRound: 0.04,
    roofRound: 0.06,
    glassTaper: 0.05,
    glassWidth: 0.9,
    grille: "slots",
    headlight: "round",
    taillight: "vertical",
    spokes: 6,
    rimColor: "#1c1d20",
  },
  "luxury-suv": {
    ...base,
    frontShare: 0.46,
    wheelR: 0.405,
    tireW: 0.28,
    clearance: 0.21,
    noseY: 0.53,
    hoodY: 0.59,
    beltRearY: 0.62,
    deckY: 0.62,
    tailMidY: 0.48,
    aX: 0.3,
    roofFrontX: 0.42,
    roofRearX: 0.965,
    cX: 0.988,
    noseRun: 0.02,
    noseRound: 0.16,
    tailRound: 0.12,
    roofRound: 0.12,
    glassTaper: 0.1,
    glassWidth: 0.88,
    grille: "wide",
    headlight: "strip",
    taillight: "vertical",
    spokes: 10,
  },
  crossover: {
    ...base,
    frontShare: 0.46,
    wheelR: 0.37,
    tireW: 0.26,
    clearance: 0.17,
    noseY: 0.46,
    hoodY: 0.57,
    beltRearY: 0.62,
    deckY: 0.6,
    tailMidY: 0.5,
    aX: 0.3,
    roofFrontX: 0.47,
    roofRearX: 0.8,
    cX: 0.955,
    noseRun: 0.03,
    noseRound: 0.34,
    tailRound: 0.2,
    roofRound: 0.4,
    glassTaper: 0.2,
    glassWidth: 0.84,
    grille: "none",
    headlight: "strip",
    taillight: "bar",
    spokes: 5,
    rimColor: "#3a3d42",
  },
  offroad: {
    ...base,
    frontShare: 0.44,
    wheelR: 0.4,
    tireW: 0.29,
    clearance: 0.25,
    noseY: 0.55,
    hoodY: 0.58,
    beltRearY: 0.6,
    deckY: 0.6,
    tailMidY: 0.45,
    aX: 0.29,
    roofFrontX: 0.35,
    roofRearX: 0.985,
    cX: 0.99,
    noseRun: 0.01,
    noseRound: 0.05,
    tailRound: 0.03,
    roofRound: 0.05,
    glassTaper: 0.04,
    glassWidth: 0.9,
    grille: "slots",
    headlight: "round",
    taillight: "vertical",
    spokes: 6,
    rimColor: "#2b2d31",
  },
  suv: {
    ...base,
    frontShare: 0.5,
    wheelR: 0.39,
    tireW: 0.27,
    clearance: 0.22,
    noseY: 0.55,
    hoodY: 0.61,
    beltRearY: 0.66,
    deckY: 0.66,
    tailMidY: 0.48,
    aX: 0.3,
    roofFrontX: 0.43,
    roofRearX: 0.95,
    cX: 0.985,
    noseRun: 0.02,
    noseRound: 0.12,
    tailRound: 0.08,
    roofRound: 0.12,
    glassTaper: 0.12,
    glassWidth: 0.88,
    grille: "wide",
    headlight: "sharp",
    taillight: "pair",
    spokes: 6,
  },
  "compact-suv": {
    ...base,
    frontShare: 0.47,
    wheelR: 0.35,
    tireW: 0.23,
    clearance: 0.19,
    noseY: 0.53,
    hoodY: 0.6,
    beltRearY: 0.65,
    deckY: 0.65,
    tailMidY: 0.5,
    aX: 0.28,
    roofFrontX: 0.43,
    roofRearX: 0.92,
    cX: 0.975,
    noseRun: 0.025,
    noseRound: 0.18,
    tailRound: 0.12,
    roofRound: 0.16,
    glassTaper: 0.14,
    glassWidth: 0.87,
    grille: "wide",
    headlight: "split",
    taillight: "bar",
    spokes: 5,
  },
  hatch: {
    ...base,
    frontShare: 0.5,
    wheelR: 0.31,
    tireW: 0.19,
    clearance: 0.16,
    noseY: 0.5,
    hoodY: 0.58,
    beltRearY: 0.64,
    deckY: 0.63,
    tailMidY: 0.5,
    aX: 0.26,
    roofFrontX: 0.44,
    roofRearX: 0.88,
    cX: 0.97,
    noseRun: 0.03,
    noseRound: 0.24,
    tailRound: 0.16,
    roofRound: 0.22,
    glassTaper: 0.16,
    glassWidth: 0.86,
    grille: "hex",
    headlight: "sharp",
    taillight: "pair",
    spokes: 8,
  },
};

export interface ResolvedShape extends Preset {
  L: number;
  W: number;
  H: number;
  wheelbase: number;
  /** x-coordinates in metres (car-local, +x = forward, 0 = centre). */
  xF: number;
  xR: number;
  xFw: number;
  xRw: number;
  xA: number;
  xRf: number;
  xRr: number;
  xC: number;
  roofBlack: boolean;
  spareWheel: boolean;
  exhausts: number;
  spoiler: boolean;
}

/** Combine archetype preset, real-world dimensions (mm) and overrides into absolute metres. */
export function resolveShape(
  dims: { length: number; width: number; height: number; wheelbase: number },
  o: ShapeOverrides,
): ResolvedShape {
  const p = { ...PRESETS[o.archetype] };
  if (o.grille) p.grille = o.grille;
  if (o.headlight) p.headlight = o.headlight;
  if (o.taillight) p.taillight = o.taillight;
  if (o.rimColor) p.rimColor = o.rimColor;
  if (o.caliper) p.caliper = o.caliper;
  if (o.spokes) p.spokes = o.spokes;

  const L = dims.length / 1000;
  const W = dims.width / 1000;
  const H = dims.height / 1000;
  const wheelbase = dims.wheelbase / 1000;
  const overhang = L - wheelbase;
  const xF = L / 2;
  const xR = -L / 2;
  const fx = (f: number) => xF - f * L;

  return {
    ...p,
    L,
    W,
    H,
    wheelbase,
    xF,
    xR,
    xFw: xF - overhang * p.frontShare,
    xRw: xF - overhang * p.frontShare - wheelbase,
    xA: fx(p.aX),
    xRf: fx(p.roofFrontX),
    xRr: fx(p.roofRearX),
    xC: fx(p.cX),
    roofBlack: o.roofBlack ?? false,
    spareWheel: o.spareWheel ?? false,
    exhausts: o.exhausts ?? 0,
    spoiler: o.spoiler ?? false,
  };
}

/** Driver eye point & look target in car-local coords (+x forward, +z = right side, RHD). */
export function driverView(s: ResolvedShape) {
  const beltY = s.H * s.hoodY;
  const eyeY = beltY + (s.H - beltY) * 0.42;
  const eyeX = Math.max(s.xA - 1.0 * Math.min(1, s.L / 4.4), s.xRr + 0.15);
  const driverZ = s.W * 0.2;
  return {
    eye: [eyeX, eyeY, driverZ] as [number, number, number],
    target: [eyeX + 1, eyeY - 0.12, driverZ] as [number, number, number],
  };
}
