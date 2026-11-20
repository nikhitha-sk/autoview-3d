import type { MetadataRoute } from "next";
import { getAllCars } from "@/lib/cars";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/upload`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    ...getAllCars().map((c) => ({ url: `${base}/car/${c.id}`, changeFrequency: "monthly" as const, priority: 0.9 })),
  ];
}
