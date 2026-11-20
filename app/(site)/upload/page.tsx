import type { Metadata } from "next";
import UploadStudio from "@/components/upload/UploadStudio";
import { getAllCars } from "@/lib/cars";

export const metadata: Metadata = {
  title: "Photo to 3D",
  description: "Upload a photo of any car. AutoView recognises it and reconstructs a 3D model you can orbit and download.",
};

export default function UploadPage() {
  const catalogue = getAllCars().map(({ id, brand, name, thumbnail }) => ({ id, brand, name, thumbnail }));
  return (
    <section className="mx-auto max-w-[1600px] px-4 pb-8 pt-28 sm:px-8 sm:pt-32">
      <div className="mb-12 grid gap-6 md:grid-cols-12">
        <p className="eyebrow md:col-span-3">
          <span className="text-accent">AI</span> — Photo to 3D
        </p>
        <div className="md:col-span-9">
          <h1 className="font-display text-[clamp(2.2rem,5.5vw,4.8rem)] font-extrabold leading-[0.9]">
            Scan a car.
            <br />
            <span className="text-transparent [-webkit-text-stroke:1.5px_var(--text)]">Get a 3D model.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
            Upload one photo. We identify the make and model, then an image-to-3D model reconstructs it as a textured mesh
            that opens right here in the studio.
          </p>
        </div>
      </div>
      <UploadStudio catalogue={catalogue} />
    </section>
  );
}
