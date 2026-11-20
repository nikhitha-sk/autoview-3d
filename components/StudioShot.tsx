"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import type { Car } from "@/lib/types";
import type { ViewMode, ViewPreset } from "./CarViewer";

const CarViewer = dynamic(() => import("./CarViewer"), { ssr: false });

export default function StudioShot({ car }: { car: Car }) {
  const search = useSyncExternalStore(
    () => () => {},
    () => window.location.search,
    () => null,
  );
  const opts = useMemo(() => {
    if (search === null) return null;
    const sp = new URLSearchParams(search);
    return {
      preset: (sp.get("view") as ViewPreset) ?? "hero",
      bare: sp.get("bare") === "1",
      mode: (sp.get("mode") as ViewMode) ?? "exterior",
      paint: Number(sp.get("paint") ?? 0),
    };
  }, [search]);
  useEffect(() => {
    if (!opts?.bare) return;
    // transparent page so screenshots keep the alpha channel
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, [opts]);
  if (!opts) return null;
  return (
    <CarViewer
      car={car}
      className="fixed inset-0"
      stage={opts.bare ? "bare" : "studio"}
      quality="high"
      mode={opts.mode}
      paint={car.paints[opts.paint]}
      view={{ preset: opts.preset, nonce: 0 }}
      intro={false}
    />
  );
}
