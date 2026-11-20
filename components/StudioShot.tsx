"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Car } from "@/lib/types";
import type { ViewMode, ViewPreset } from "./CarViewer";

const CarViewer = dynamic(() => import("./CarViewer"), { ssr: false });

export default function StudioShot({ car }: { car: Car }) {
  const [opts, setOpts] = useState<{ preset: ViewPreset; bare: boolean; mode: ViewMode; paint: number } | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setOpts({
      preset: (sp.get("view") as ViewPreset) ?? "hero",
      bare: sp.get("bare") === "1",
      mode: (sp.get("mode") as ViewMode) ?? "exterior",
      paint: Number(sp.get("paint") ?? 0),
    });
  }, []);
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
