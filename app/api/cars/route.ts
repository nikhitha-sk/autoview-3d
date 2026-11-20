import { type NextRequest, NextResponse } from "next/server";
import { filterCars, getAllCars } from "@/lib/cars";

/** GET /api/cars?q=&brand=&type=&fuel=&price= — the car catalogue as JSON. */
export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const cars = filterCars(getAllCars(), {
    q: sp.get("q") ?? undefined,
    brand: sp.get("brand") ?? undefined,
    type: sp.get("type") ?? undefined,
    fuel: sp.get("fuel") ?? undefined,
    price: sp.get("price") ?? undefined,
  });
  return NextResponse.json(
    { count: cars.length, cars },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
