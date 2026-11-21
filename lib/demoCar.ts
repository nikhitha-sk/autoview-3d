import type { Archetype, BodyType, Car, PaintFinish } from "./types";

const DIMS: Record<Archetype, Car["dimensions"]> = {
  sports: { length: 4500, width: 1850, height: 1300, wheelbase: 2450 },
  supercar: { length: 4520, width: 1930, height: 1170, wheelbase: 2620 },
  coupe: { length: 4790, width: 1890, height: 1390, wheelbase: 2860 },
  boxy: { length: 4870, width: 1980, height: 1970, wheelbase: 2890 },
  "luxury-suv": { length: 5050, width: 2050, height: 1870, wheelbase: 3000 },
  crossover: { length: 4800, width: 1920, height: 1620, wheelbase: 2890 },
  offroad: { length: 4430, width: 1870, height: 1920, wheelbase: 2850 },
  suv: { length: 4800, width: 1855, height: 1835, wheelbase: 2745 },
  "compact-suv": { length: 4330, width: 1790, height: 1635, wheelbase: 2610 },
  hatch: { length: 3860, width: 1735, height: 1520, wheelbase: 2450 },
  sedan: { length: 4550, width: 1750, height: 1490, wheelbase: 2600 },
  mpv: { length: 4400, width: 1740, height: 1690, wheelbase: 2740 },
};

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  sports: "Sports coupé",
  supercar: "Supercar",
  coupe: "Grand tourer",
  boxy: "Boxy off-roader",
  "luxury-suv": "Luxury SUV",
  crossover: "Crossover / EV",
  offroad: "Compact 4x4",
  suv: "Full-size SUV",
  "compact-suv": "Compact SUV",
  hatch: "Hatchback",
  sedan: "Sedan",
  mpv: "MPV / people carrier",
};

export function archetypeForBody(body?: BodyType | null): Archetype | null {
  switch (body) {
    case "Coupe":
      return "coupe";
    case "Sedan":
      return "sedan";
    case "MPV":
      return "mpv";
    case "Supercar":
      return "supercar";
    case "SUV":
    case "Pickup":
      return "suv";
    case "Crossover":
      return "crossover";
    case "Hatchback":
      return "hatch";
    default:
      return null;
  }
}

/** A stand-in catalogue entry so a demo result renders in the normal viewer. */
export function demoCar(archetype: Archetype, color: string, finish: PaintFinish = "metallic"): Car {
  return {
    id: `generated-${archetype}`,
    name: "Your car",
    brand: "Generated",
    year: String(new Date().getFullYear()),
    tagline: "Reconstructed from your photo.",
    description: "",
    priceRange: "—",
    priceFrom: 0,
    priceTo: 0,
    bodyType: "SUV",
    engine: "—",
    fuel: "Petrol",
    power: "—",
    torque: "—",
    transmission: "—",
    drivetrain: "—",
    mileage: "—",
    acceleration: "—",
    topSpeed: "—",
    seats: 5,
    origin: "—",
    dimensions: DIMS[archetype],
    paints: [{ name: "From your photo", hex: color, finish }],
    interiorColor: "#1c1c1e",
    thumbnail: "",
    shape: { archetype },
    tags: [],
  };
}
