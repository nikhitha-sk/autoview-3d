import { ImageResponse } from "next/og";
import { getAllCars, getCar } from "@/lib/cars";
import { ogCard, ogSize } from "@/lib/og/card";

export const alt = "Car in 3D on AutoView";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllCars().map((c) => ({ id: c.id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const car = getCar(id) ?? getAllCars()[0];
  return new ImageResponse(
    await ogCard({
      eyebrow: `${car.brand} · ${car.bodyType}`,
      title: car.name,
      subtitle: `${car.power} · ${car.priceRange} · explore in 3D`,
      image: car.thumbnail,
    }),
    size,
  );
}
