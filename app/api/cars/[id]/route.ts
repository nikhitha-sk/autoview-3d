import { NextResponse } from "next/server";
import { getAllCars, getCar } from "@/lib/cars";

export function generateStaticParams() {
  return getAllCars().map((c) => ({ id: c.id }));
}

/** GET /api/cars/:id — one car. */
export async function GET(_req: Request, ctx: RouteContext<"/api/cars/[id]">) {
  const { id } = await ctx.params;
  const car = getCar(id);
  if (!car) return NextResponse.json({ error: "Car not found" }, { status: 404 });
  return NextResponse.json(car);
}
