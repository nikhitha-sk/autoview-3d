import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Box } from "lucide-react";
import type { Car } from "@/lib/types";

export default function CarCard({ car, index, priority = false }: { car: Car; index: number; priority?: boolean }) {
  const swatches = car.paints.slice(0, 5);
  return (
    <Link
      href={`/car/${car.id}`}
      className="group relative flex flex-col overflow-hidden rounded-[22px] border border-line bg-surface transition-[border-color,transform] duration-500 ease-out-expo hover:-translate-y-1 hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      {/* Stage */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <div
          className="absolute inset-0 opacity-70 transition-opacity duration-700 group-hover:opacity-100"
          style={{
            background: `radial-gradient(60% 55% at 50% 62%, ${car.paints[0].hex}33, transparent 70%)`,
          }}
        />
        <div className="absolute inset-x-6 bottom-[16%] h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
        <Image
          src={car.thumbnail}
          alt={`${car.brand} ${car.name} rendered in 3D`}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-contain px-4 pt-6 transition-transform duration-700 ease-out-expo group-hover:scale-[1.05]"
        />
        <div className="absolute left-5 top-4 flex items-center gap-3">
          <span className="font-mono text-[11px] text-faint">{String(index + 1).padStart(2, "0")}</span>
          <span className="h-px w-6 bg-line-strong" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{car.bodyType}</span>
        </div>
        {car.model3d && (
          <span className="absolute right-4 top-3.5 inline-flex items-center gap-1 rounded-full border border-line bg-bg/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted backdrop-blur">
            <Box className="h-3 w-3 text-accent" /> Scanned model
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-1 flex-col border-t border-line p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{car.brand}</p>
            <h3 className="font-display mt-1 text-[22px] font-bold leading-tight">{car.name}</h3>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line transition-all duration-500 ease-out-expo group-hover:rotate-45 group-hover:border-accent group-hover:bg-accent group-hover:text-accent-ink">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow !text-[10px]">Ex-showroom</p>
            <p className="mt-1 font-mono text-[15px]">{car.priceRange}</p>
          </div>
          <div className="flex -space-x-1.5" aria-label={`${car.paints.length} paint options`}>
            {swatches.map((p) => (
              <span
                key={p.name}
                title={p.name}
                className="h-4 w-4 rounded-full border border-bg shadow-[inset_0_1px_2px_rgba(255,255,255,0.35)]"
                style={{ background: p.hex }}
              />
            ))}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 border-t border-line pt-4 text-[12px]">
          <div>
            <dt className="text-faint">Power</dt>
            <dd className="mt-0.5 font-mono">{car.power.replace("Not disclosed", "—")}</dd>
          </div>
          <div>
            <dt className="text-faint">Fuel</dt>
            <dd className="mt-0.5 font-mono">{car.fuel}</dd>
          </div>
          <div>
            <dt className="text-faint">Seats</dt>
            <dd className="mt-0.5 font-mono">{car.seats}</dd>
          </div>
        </dl>
      </div>
      <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-accent transition-transform duration-700 ease-out-expo group-hover:scale-x-100" />
    </Link>
  );
}
