import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto grid min-h-[80svh] max-w-[1600px] place-items-center px-4 pt-24 text-center sm:px-8">
      <div>
        <p className="eyebrow">Error 404</p>
        <h1 className="font-display mt-4 text-[clamp(2.4rem,6vw,5rem)] font-extrabold leading-[0.9]">Wrong turn.</h1>
        <p className="mx-auto mt-4 max-w-md text-muted">This road doesn&apos;t lead anywhere. Let&apos;s get you back to the showroom.</p>
        <Link href="/" className="mt-8 inline-flex rounded-full bg-text px-5 py-3 text-sm font-semibold text-bg hover:bg-accent hover:text-accent-ink">
          Back to showroom
        </Link>
      </div>
    </section>
  );
}
