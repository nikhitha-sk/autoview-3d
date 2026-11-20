import type { Car } from "./types";

/** Interior is available via a 360° photo, an explicit camera for real models, or the procedural cockpit. */
export function interiorAvailable(car: Car) {
  return Boolean(car.interior360 || car.interiorCamera || !car.model3d);
}
