import Hero from "@/components/home/Hero";
import Showroom from "@/components/Showroom";
import { BrandMarquee, PhotoTo3DBand, SectionHeading, StatsStrip } from "@/components/home/Sections";
import { getAllCars, getCar } from "@/lib/cars";

export default function HomePage() {
  const cars = getAllCars();
  const featured = ["ferrari-458", "porsche-911", "mercedes-g63"].map((id) => getCar(id)!).filter(Boolean);

  return (
    <>
      <Hero featured={featured} />
      <BrandMarquee />
      <StatsStrip count={cars.length} />

      <section id="showroom" className="mx-auto max-w-[1600px] scroll-mt-20 px-4 pt-24 sm:px-8 sm:pt-32">
        <SectionHeading
          index="01"
          eyebrow="The showroom"
          title={
            <>
              Choose your machine.
            </>
          }
        >
          {cars.length} cars, from India&apos;s favourite hatchbacks and SUVs to Maranello&apos;s V8. Every one opens in a live
          3D studio — exterior and cabin.
        </SectionHeading>
        <div className="mt-12">
          <Showroom cars={cars} />
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 pt-24 sm:px-8 sm:pt-32">
        <SectionHeading index="02" eyebrow="Beyond the catalogue" title="Bring your own car." />
        <div className="mt-12">
          <PhotoTo3DBand />
        </div>
      </section>
    </>
  );
}
