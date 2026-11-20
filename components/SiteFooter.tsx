import Link from "next/link";
import { getAllCars } from "@/lib/cars";
import { site } from "@/lib/site";
import { LogoMark } from "./ui/Logo";

export default function SiteFooter() {
  const credited = getAllCars().filter((c) => c.modelCredit);
  return (
    <footer className="relative mt-32 border-t border-line">
      <div className="mx-auto max-w-[1600px] px-4 pt-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <LogoMark className="h-10 w-10 text-text" />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">{site.description}</p>
          </div>
          <div className="md:col-span-2">
            <p className="eyebrow mb-4">Explore</p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link className="text-muted hover:text-text" href="/#showroom">Showroom</Link>
              </li>
              <li>
                <Link className="text-muted hover:text-text" href="/upload">Photo to 3D</Link>
              </li>
              <li>
                <Link className="text-muted hover:text-text" href="/about">How it works</Link>
              </li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <p className="eyebrow mb-4">Project</p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a className="text-muted hover:text-text" href={site.repo} target="_blank" rel="noreferrer">
                  Source on GitHub
                </a>
              </li>
              <li>
                <a className="text-muted hover:text-text" href="/api/cars">Cars API (JSON)</a>
              </li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <p className="eyebrow mb-4">3D model credits</p>
            <ul className="space-y-2.5 text-sm text-muted">
              {credited.map((c) => (
                <li key={c.id}>
                  <a href={c.modelCredit!.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-text hover:underline">
                    {c.modelCredit!.title}
                  </a>{" "}
                  by {c.modelCredit!.author} · {c.modelCredit!.license}
                </li>
              ))}
              <li>All other cars are generated procedurally from their real-world dimensions.</li>
            </ul>
          </div>
        </div>

        <p className="mt-16 max-w-3xl text-xs leading-relaxed text-faint">
          Prices are indicative ex-showroom ranges in India and specifications are approximate; confirm with the
          manufacturer before buying. Brand and model names belong to their respective owners and are used for
          identification only. AutoView 3D is an independent project, not affiliated with any manufacturer.
        </p>
      </div>
      <div className="mt-10 overflow-hidden border-t border-line">
        <div className="mx-auto flex max-w-[1600px] items-end justify-between gap-6 px-4 pb-6 pt-8 sm:px-8">
          <span aria-hidden className="font-display text-[15vw] font-black leading-[0.8] text-text/[0.06] sm:text-[11vw]">
            AutoView
          </span>
          <span className="eyebrow shrink-0 pb-2">Built with Three.js · R3F</span>
        </div>
      </div>
    </footer>
  );
}
