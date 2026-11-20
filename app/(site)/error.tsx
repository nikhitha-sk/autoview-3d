"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="mx-auto grid min-h-[80svh] max-w-[1600px] place-items-center px-4 pt-24 text-center sm:px-8">
      <div>
        <p className="eyebrow">Warning light · something went wrong</p>
        <h1 className="font-display mt-4 text-[clamp(2.4rem,6vw,5rem)] font-extrabold leading-[0.9]">Engine stalled.</h1>
        <p className="mx-auto mt-4 max-w-md text-muted">
          The page hit an unexpected error. If you&apos;re on an older device, WebGL may be unavailable.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink hover:brightness-110"
          >
            Restart
          </button>
          <Link href="/" className="rounded-full border border-line-strong px-5 py-3 text-sm font-semibold hover:border-text">
            Go home
          </Link>
        </div>
      </div>
    </section>
  );
}
