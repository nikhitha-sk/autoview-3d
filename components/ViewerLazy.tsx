"use client";

import dynamic from "next/dynamic";
import type { CarViewerProps } from "./CarViewer";

/** Client-only, lazily loaded viewer: three.js is fetched only when a viewer is on screen. */
const ViewerLazy = dynamic<CarViewerProps>(() => import("./CarViewer"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <span className="eyebrow pulse-dot">Initialising 3D studio</span>
    </div>
  ),
});

export default ViewerLazy;
