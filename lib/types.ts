export type BodyType = "Coupe" | "Supercar" | "SUV" | "Sedan" | "Hatchback" | "Crossover";

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
  | "hatch";

export type GrilleStyle = "none" | "wide" | "kidney" | "slots" | "hex";
export type HeadlightStyle = "strip" | "round" | "split" | "sharp";
export type TaillightStyle = "bar" | "pair" | "vertical";

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
  interiorCamera?: InteriorCamera;
  interior360?: string;
  thumbnail: string;
  shape: ShapeOverrides;
  tags: string[];
}
