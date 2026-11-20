import { notFound } from "next/navigation";
import { getAllCars, getCar } from "@/lib/cars";
import StudioShot from "@/components/StudioShot";

export function generateStaticParams() {
  return getAllCars().map((c) => ({ id: c.id }));
}

export const metadata = { robots: { index: false } };

/** Chrome-less render target used by scripts/render-thumbnails.mjs. */
export const instant = false;

export default async function StudioPage({ params }: PageProps<"/studio/[id]">) {
  const { id } = await params;
  const car = getCar(id);
  if (!car) notFound();
  return <StudioShot car={car} />;
}
