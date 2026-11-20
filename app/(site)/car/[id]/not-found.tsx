import Link from "next/link";

export default function CarNotFound() {
  return (
    <section className="mx-auto grid min-h-[80svh] max-w-[1600px] place-items-center px-4 pt-24 text-center sm:px-8">
      <div>
        <p className="eyebrow">Error 404 · Vehicle not found</p>
        <h1 className="font-display mt-4 text-[clamp(2.4rem,6vw,5rem)] font-extrabold leading-[0.9]">Off the map.</h1>
        <p className="mx-auto mt-4 max-w-md text-muted">That car isn&apos;t in our showroom yet — but you can generate it from a photo.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/#showroom" className="rounded-full bg-text px-5 py-3 text-sm font-semibold text-bg hover:bg-accent hover:text-accent-ink">
            Back to showroom
          </Link>
          <Link href="/upload" className="rounded-full border border-line-strong px-5 py-3 text-sm font-semibold hover:border-text">
            Photo to 3D
          </Link>
        </div>
      </div>
    </section>
  );
}
