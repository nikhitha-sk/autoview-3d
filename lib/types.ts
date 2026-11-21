export type BodyType = "Coupe" | "Supercar" | "SUV" | "Sedan" | "Hatchback" | "Crossover" | "MPV";

export type Fuel = "Petrol" | "Diesel" | "Electric" | "Petrol / Diesel" | "Hybrid";

export type PaintFinish = "gloss" | "metallic" | "pearl" | "matte";

export interface Paint {
  name: string;
  hex: string;
  finish: PaintFinish;
}

export type Archetype =
  | "sports"
  | "supercar"
  | "coupe"
  | "boxy"
  | "luxury-suv"
  | "crossover"
  | "offroad"
  | "suv"
  | "compact-suv"
  | "hatch"
  | "sedan"
  | "mpv";

export type GrilleStyle = "none" | "wide" | "kidney" | "slots" | "hex" | "bars";
export type HeadlightStyle = "strip" | "round" | "split" | "sharp";
export type TaillightStyle = "bar" | "pair" | "vertical";
export type WheelStyle = "spoke" | "multi" | "aero" | "offroad";

/** Optional per-car overrides for the procedural model generator. */
export interface ShapeOverrides {
  archetype: Archetype;
  grille?: GrilleStyle;
  headlight?: HeadlightStyle;
  taillight?: TaillightStyle;
  rimColor?: string;
  caliper?: string;
  spokes?: number;
  roofBlack?: boolean;
  spareWheel?: boolean;
  exhausts?: number;
  spoiler?: boolean;
  wheel?: WheelStyle;
  /** Panoramic glass roof joining windscreen and rear glass. */
  glassRoof?: boolean;
  /** Blacked-out pillars ("floating roof"). */
  pillarsBlack?: boolean;
  sunroof?: boolean;
  chromeTrim?: boolean;
  roofRails?: boolean;
  doors?: 2 | 4;
  /** Per-car numeric overrides of the archetype preset (e.g. roofRearX, hoodY). */
  tweak?: Record<string, number>;
}

export interface ModelCredit {
  title: string;
  author: string;
  url: string;
  license: string;
}

/** Camera placement for the interior view of a real .glb model (world space). */
export interface InteriorCamera {
  position: [number, number, number];
  target: [number, number, number];
}

export interface Car {
  id: string;
  name: string;
  brand: string;
  year: string;
  tagline: string;
  description: string;
  priceRange: string;
  /** Ex-showroom price bounds in ₹ lakh, used for filtering and sorting. */
  priceFrom: number;
  priceTo: number;
  bodyType: BodyType;
  engine: string;
  fuel: Fuel;
  power: string;
  torque: string;
  transmission: string;
  drivetrain: string;
  mileage: string;
  acceleration: string;
  topSpeed: string;
  seats: number;
  origin: string;
  dimensions: { length: number; width: number; height: number; wheelbase: number };
  paints: Paint[];
  interiorColor: string;
  model3d?: string;
  modelCredit?: ModelCredit;
  /** Yaw applied to a .glb so its nose faces +Z. */
  modelRotationY?: number;
  /** Pitch applied before fitting, for models exported Z-up (e.g. -1.5708). */
  modelRotationX?: number;
  /** Exposure used when rendering the showroom card image (default 1). */
  thumbExposure?: number;
  /** Regex (case-insensitive) naming the model's paint material(s), so the paint picker can recolour it. */
  paintMaterial?: string;
  interiorCamera?: InteriorCamera;
  interior360?: string;
  thumbnail: string;
  shape: ShapeOverrides;
  tags: string[];
}
