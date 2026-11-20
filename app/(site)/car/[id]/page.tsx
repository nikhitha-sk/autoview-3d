import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import CarExperience from "@/components/CarExperience";
import CarDetails from "@/components/CarDetails";
import CarCard from "@/components/CarCard";
import { SectionHeading } from "@/components/home/Sections";
import { getAllCars, getCar } from "@/lib/cars";

export function generateStaticParams() {
  return getAllCars().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/car/[id]">): Promise<Metadata> {
  const { id } = await params;
  const car = getCar(id);
  if (!car) return { title: "Car not found" };
  const title = `${car.brand} ${car.name} in 3D`;
  const description = `${car.tagline} Explore the ${car.brand} ${car.name} in 3D — ${car.power}, ${car.priceRange}. Rotate, repaint and sit inside.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function CarPage({ params }: PageProps<"/car/[id]">) {
  return (
    <Suspense fallback={<CarFallback />}>
      <CarContent params={params} />
    </Suspense>
  );
}

async function CarContent({ params }: { params: PageProps<"/car/[id]">["params"] }) {
  const { id } = await params;
  const car = getCar(id);
  if (!car) notFound();

  const all = getAllCars();
  const related = [
    ...all.filter((c) => c.id !== car.id && c.bodyType === car.bodyType),
    ...all.filter((c) => c.id !== car.id && c.bodyType !== car.bodyType),
  ].slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: `${car.brand} ${car.name}`,
    brand: { "@type": "Brand", name: car.brand },
    bodyType: car.bodyType,
    fuelType: car.fuel,
    seatingCapacity: car.seats,
    vehicleTransmission: car.transmission,
    image: car.thumbnail,
    description: car.description,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }} />
      <CarExperience car={car} />
      <CarDetails car={car} />
      <section className="mx-auto max-w-[1600px] px-4 pt-24 sm:px-8 sm:pt-32">
        <SectionHeading index="02" eyebrow="Keep exploring" title="More from the showroom." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {related.map((c) => (
            <CarCard key={c.id} car={c} index={all.indexOf(c)} />
          ))}
        </div>
      </section>
    </>
  );
}

function CarFallback() {
  return (
    <div className="grid h-[100svh] place-items-center">
      <span className="eyebrow pulse-dot">Preparing the studio</span>
    </div>
  );
}
