import carsData from "@/data/cars.json";
import type { BodyType, Car, Fuel } from "./types";

/** Cars with a real 3D model come first; procedural ones follow (stable, so data order is kept within each group). */
export const hasRealModel = (c: Car) => Boolean(c.model3d);
export const realFirst = (list: Car[]) => [...list].sort((a, b) => Number(hasRealModel(b)) - Number(hasRealModel(a)));

export const cars = realFirst(carsData as unknown as Car[]);

export function getAllCars(): Car[] {
  return cars;
}

export function getCar(id: string): Car | undefined {
  return cars.find((c) => c.id === id);
}

export const brands = [...new Set(cars.map((c) => c.brand))].sort();
export const bodyTypes = [...new Set(cars.map((c) => c.bodyType))] as BodyType[];

export type FuelFilter = "Petrol" | "Diesel" | "Electric";
export const fuelFilters: FuelFilter[] = ["Petrol", "Diesel", "Electric"];

export function matchesFuel(fuel: Fuel, filter: FuelFilter) {
  return fuel.includes(filter);
}

export interface PriceBand {
  id: string;
  label: string;
  min: number;
  max: number;
}

/** Bands in ₹ lakh. */
export const priceBands: PriceBand[] = [
  { id: "under-25", label: "Under ₹25 L", min: 0, max: 25 },
  { id: "25-100", label: "₹25 L – 1 Cr", min: 25, max: 100 },
  { id: "1-3cr", label: "₹1 – 3 Cr", min: 100, max: 300 },
  { id: "3cr-plus", label: "₹3 Cr +", min: 300, max: Infinity },
];

export function inBand(car: Car, band: PriceBand) {
  return car.priceFrom < band.max && car.priceTo >= band.min;
}

export interface CarQuery {
  q?: string;
  brand?: string;
  type?: string;
  fuel?: string;
  price?: string;
}

/** Shared by the showroom UI and /api/cars so filtering logic lives in one place. */
export function filterCars(list: Car[], query: CarQuery): Car[] {
  return realFirst(filterCarsUnordered(list, query));
}

function filterCarsUnordered(list: Car[], query: CarQuery): Car[] {
  const q = query.q?.trim().toLowerCase();
  const band = priceBands.find((b) => b.id === query.price);
  return list.filter((c) => {
    if (q) {
      const hay = `${c.brand} ${c.name} ${c.bodyType} ${c.fuel} ${c.tags.join(" ")}`.toLowerCase();
      if (!q.split(/\s+/).every((t) => hay.includes(t))) return false;
    }
    if (query.brand && c.brand !== query.brand) return false;
    if (query.type && c.bodyType !== query.type) return false;
    if (query.fuel && !matchesFuel(c.fuel, query.fuel as FuelFilter)) return false;
    if (band && !inBand(c, band)) return false;
    return true;
  });
}

export function formatIndex(i: number) {
  return String(i + 1).padStart(2, "0");
}
