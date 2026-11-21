"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import CarCard from "./CarCard";
import { bodyTypes, brands, filterCars, fuelFilters, priceBands, realFirst, type CarQuery } from "@/lib/cars";
import type { Car } from "@/lib/types";

type Sort = "featured" | "price-asc" | "price-desc" | "name";

const SORTS: { id: Sort; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "name", label: "Name A–Z" },
];

const KEYS = ["q", "brand", "type", "fuel", "price"] as const;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition ${
        active ? "border-text bg-text text-bg" : "border-line text-muted hover:border-line-strong hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

export default function Showroom({ cars }: { cars: Car[] }) {
  const [query, setQuery] = useState<CarQuery>({});
  const [sort, setSort] = useState<Sort>("featured");

  // hydrate filters from the URL once (shareable filtered links)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q: CarQuery = {};
    for (const k of KEYS) {
      const v = sp.get(k);
      if (v) q[k] = v;
    }
    if (Object.keys(q).length) setQuery(q); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  // keep the URL in sync without triggering navigation
  useEffect(() => {
    const url = new URL(window.location.href);
    for (const k of KEYS) {
      const v = query[k];
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    }
    window.history.replaceState(null, "", url);
  }, [query]);

  const set = (k: keyof CarQuery, v?: string) => setQuery((q) => ({ ...q, [k]: q[k] === v ? undefined : v }));

  const results = useMemo(() => {
    const list = filterCars(cars, query);
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.priceFrom - b.priceFrom);
    if (sort === "price-desc") sorted.sort((a, b) => b.priceTo - a.priceTo);
    if (sort === "name") sorted.sort((a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`));
    // whatever the sort or filter, realistic (real-model) cars stay on top
    return realFirst(sorted);
  }, [cars, query, sort]);

  const activeCount = KEYS.filter((k) => query[k]).length;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-5 rounded-[22px] border border-line bg-surface/60 p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search cars</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              type="search"
              value={query.q ?? ""}
              onChange={(e) => setQuery((q) => ({ ...q, q: e.target.value || undefined }))}
              placeholder="Search by name, brand or tag — try “EV” or “V8”"
              className="h-12 w-full rounded-full border border-line bg-bg pl-11 pr-4 text-sm outline-none transition placeholder:text-faint focus:border-accent"
            />
          </label>
          <div className="flex gap-3">
            <label className="relative">
              <span className="sr-only">Brand</span>
              <select
                value={query.brand ?? ""}
                onChange={(e) => setQuery((q) => ({ ...q, brand: e.target.value || undefined }))}
                className="h-12 appearance-none rounded-full border border-line bg-bg pl-4 pr-10 text-sm outline-none transition focus:border-accent"
              >
                <option value="">All brands</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <SlidersHorizontal className="pointer-events-none absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            </label>
            <label className="relative">
              <span className="sr-only">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-12 appearance-none rounded-full border border-line bg-bg pl-4 pr-9 text-sm outline-none transition focus:border-accent"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-faint">▼</span>
            </label>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[auto_auto_1fr] lg:items-center lg:gap-8">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="eyebrow mr-1 shrink-0">Body</span>
            {bodyTypes.map((t) => (
              <Chip key={t} active={query.type === t} onClick={() => set("type", t)}>
                {t}
              </Chip>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="eyebrow mr-1 shrink-0">Fuel</span>
            {fuelFilters.map((f) => (
              <Chip key={f} active={query.fuel === f} onClick={() => set("fuel", f)}>
                {f}
              </Chip>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="eyebrow mr-1 shrink-0">Price</span>
            {priceBands.map((b) => (
              <Chip key={b.id} active={query.price === b.id} onClick={() => set("price", b.id)}>
                {b.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="font-mono text-[12px] text-muted" aria-live="polite">
          {results.length} of {cars.length} models
        </p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => setQuery({})}
            className="inline-flex items-center gap-1.5 font-mono text-[12px] text-muted hover:text-accent"
          >
            <X className="h-3.5 w-3.5" /> Clear {activeCount} filter{activeCount > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {results.length ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((car) => (
            <CarCard key={car.id} car={car} index={cars.indexOf(car)} priority={cars.indexOf(car) < 3} />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid place-items-center rounded-[22px] border border-dashed border-line-strong px-6 py-20 text-center">
          <p className="font-display text-xl font-bold">No cars match</p>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Try fewer filters — or upload a photo and we&apos;ll build the car you&apos;re looking for in 3D.
          </p>
          <button
            type="button"
            onClick={() => setQuery({})}
            className="mt-6 rounded-full border border-line-strong px-5 py-2.5 text-sm font-semibold hover:border-text"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
