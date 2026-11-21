"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls, CameraControlsImpl, PerformanceMonitor, useProgress } from "@react-three/drei";
import * as THREE from "three";
import ProceduralCar from "./three/ProceduralCar";
import InteriorViewer from "./InteriorViewer";
import GltfCar from "./three/GltfCar";
import Studio, { narrowFactor, type Quality, type StudioTheme } from "./three/Studio";
import { resolveShape, driverView } from "@/lib/carShapes";
import type { Car, Paint } from "@/lib/types";

const { ACTION } = CameraControlsImpl;

export type ViewPreset = "hero" | "front" | "side" | "rear" | "top";
export type ViewMode = "exterior" | "interior";

export interface CarViewerProps {
  car?: Car;
  /** Load a .glb directly (e.g. an AI-generated model). Overrides car.model3d. */
  modelUrl?: string;
  normalize?: boolean;
  paint?: Paint;
  mode?: ViewMode;
  autoRotate?: boolean;
  view?: { preset: ViewPreset; nonce: number };
  theme?: StudioTheme;
  quality?: Quality | "auto";
  accent?: string;
  stage?: "studio" | "bare";
  interactive?: boolean;
  intro?: boolean;
  className?: string;
  /** Shift the framing (world units, camera space) e.g. to leave room for a headline. */
  focalOffset?: [number, number, number];
  showLoader?: boolean;
  /** Multiplies the default camera distance for every preset. */
  distanceScale?: number;
  /** Mouse-wheel dolly. Disable where the page must keep scrolling (hero). */
  wheelZoom?: boolean;
  /** Tone-mapping exposure (1 = default); the home hero dims it so the turntable car isn't washed out. */
  exposure?: number;
  onInteract?: () => void;
}

/** World-space interior camera (car front faces +Z, procedural cars are RHD). */
export function interiorFor(car?: Car): { position: THREE.Vector3; target: THREE.Vector3 } | null {
  if (!car) return null;
  if (car.interiorCamera) {
    return {
      position: new THREE.Vector3(...car.interiorCamera.position),
      target: new THREE.Vector3(...car.interiorCamera.target),
    };
  }
  // catalogue models are scaled to real size and centred like the procedural cars, so the same driver eye point applies
  const v = driverView(resolveShape(car.dimensions, car.shape));
  const toWorld = ([x, y, z]: [number, number, number]) => new THREE.Vector3(-z, y, x);
  return { position: toWorld(v.eye), target: toWorld(v.target) };
}

export default function CarViewer({
  car,
  modelUrl,
  normalize,
  paint,
  mode = "exterior",
  autoRotate = false,
  view = { preset: "hero", nonce: 0 },
  theme = "dark",
  quality = "auto",
  accent = "#ff5a1f",
  stage = "studio",
  interactive = true,
  intro = true,
  className,
  focalOffset,
  showLoader = true,
  wheelZoom = true,
  distanceScale = 1,
  exposure = 1,
  onInteract,
}: CarViewerProps) {
  // This component only ever renders on the client (loaded with ssr: false).
  const coarse = useMemo(() => window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768, []);
  const [declined, setDeclined] = useState(false);
  const q: Quality = declined ? "low" : quality !== "auto" ? quality : coarse ? "low" : "high";
  const dpr = declined ? 1 : coarse ? 1.25 : Math.min(window.devicePixelRatio, 1.75);

  const L = car ? car.dimensions.length / 1000 : 4.4;
  const H = car ? car.dimensions.height / 1000 : 1.4;
  const url = modelUrl ?? car?.model3d;
  const paintValue = paint ?? car?.paints[0];
  const interiorCam = useMemo(() => interiorFor(car), [car]);
  const pano = mode === "interior" ? car?.interior360 : undefined;
  const bare = stage === "bare";

  return (
    <div className={className} style={{ touchAction: interactive ? "none" : "auto" }}>
      <div className="relative h-full w-full">
      <Canvas
        dpr={dpr}
        camera={{ fov: 32, near: 0.03, far: 120, position: [L * 2.2, H * 1.6 + 1.2, L * 2.6] }}
        gl={{ antialias: true, alpha: bare, preserveDrawingBuffer: bare }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = exposure;
        }}
        style={{ pointerEvents: interactive ? "auto" : "none" }}
      >
        <PerformanceMonitor onDecline={() => setDeclined(true)} />
        <Suspense fallback={null}>
          {pano ? (
            <InteriorViewer url={pano} />
          ) : (
            <>
              <Studio theme={theme} quality={q} radius={Math.max(L * 0.68, 2.4)} accent={accent} bare={bare} />
              {url ? (
                <GltfCar
                  url={url}
                  normalize={normalize}
                  rotationY={modelUrl ? 0 : car?.modelRotationY}
                  fitLength={!modelUrl && car ? car.dimensions.length / 1000 : undefined}
                  paintMatch={modelUrl ? undefined : car?.paintMaterial}
                  rotationX={modelUrl ? 0 : car?.modelRotationX}
                  paint={paintValue}
                  interior={mode === "interior"}
                />
              ) : car ? (
                <ProceduralCar
                  dimensions={car.dimensions}
                  shape={car.shape}
                  paint={paintValue ?? { hex: "#888", finish: "metallic" }}
                  interiorColor={car.interiorColor}
                  seats={car.seats}
                  interior={mode === "interior"}
                  label={`${car.brand} ${car.name}`}
                  accent={accent}
                />
              ) : null}
            </>
          )}
        </Suspense>
        <Rig
          L={L}
          H={H}
          mode={pano ? "pano" : mode}
          interior={interiorCam}
          view={view}
          autoRotate={autoRotate}
          interactive={interactive}
          intro={intro}
          focalOffset={focalOffset}
          wheelZoom={wheelZoom}
          distanceScale={distanceScale}
          onInteract={onInteract}
        />
      </Canvas>
      {showLoader && <LoaderOverlay />}
      </div>
    </div>
  );
}

function easeFov(camera: THREE.PerspectiveCamera, target: number, dt: number) {
  if (Math.abs(camera.fov - target) < 0.05) return;
  camera.fov = THREE.MathUtils.lerp(camera.fov, target, 1 - Math.exp(-dt * 5));
  camera.updateProjectionMatrix();
}

function LoaderOverlay() {
  const { active, progress } = useProgress();
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (active) return;
    const t = setTimeout(() => setSettled(true), 450);
    return () => clearTimeout(t);
  }, [active]);
  if (settled && !active) return null;
  const pct = Math.round(active ? progress : 100);
  return (
    <div
      className={`pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-500 ${
        active ? "opacity-100" : "opacity-0"
      }`}
      aria-live="polite"
    >
      <div className="flex w-56 flex-col items-center gap-3">
        <span className="eyebrow">Loading model · {pct}%</span>
        <div className="h-px w-full overflow-hidden bg-line">
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function Rig({
  L,
  H,
  mode,
  interior,
  view,
  autoRotate,
  interactive,
  intro,
  focalOffset,
  wheelZoom,
  distanceScale,
  onInteract,
}: {
  L: number;
  H: number;
  mode: ViewMode | "pano";
  interior: { position: THREE.Vector3; target: THREE.Vector3 } | null;
  view: { preset: ViewPreset; nonce: number };
  autoRotate: boolean;
  interactive: boolean;
  intro: boolean;
  focalOffset?: [number, number, number];
  wheelZoom: boolean;
  distanceScale: number;
  onInteract?: () => void;
}) {
  const ref = useRef<CameraControlsImpl>(null);
  const busy = useRef(false);
  const first = useRef(true);
  const { size } = useThree();
  const aspect = size.width / Math.max(1, size.height);

  const presets = useMemo(() => {
    const D = Math.max(L, 3.6) * 1.55 * distanceScale * narrowFactor(aspect);
    const ty = H * 0.42;
    const p: Record<ViewPreset, [number, number, number, number, number, number]> = {
      hero: [D * 0.66, H * 0.5 + 0.55, D * 0.76, 0, ty, 0],
      front: [0.001, H * 0.55 + 0.25, D * 0.98, 0, ty, 0],
      side: [D * 1.02, H * 0.45 + 0.2, 0.001, 0, ty, 0],
      rear: [-D * 0.62, H * 0.6 + 0.6, -D * 0.78, 0, ty, 0],
      top: [0.001, D * 1.35, 0.002, 0, 0, 0],
    };
    return p;
  }, [L, H, aspect, distanceScale]);

  // controls configuration per mode
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const fp = mode === "interior" || mode === "pano";
    c.smoothTime = 0.45;
    c.draggingSmoothTime = 0.12;
    if (fp) {
      c.minDistance = 0.01;
      c.maxDistance = 0.2;
      c.minPolarAngle = 0.25;
      c.maxPolarAngle = Math.PI - 0.35;
      c.azimuthRotateSpeed = -0.35;
      c.polarRotateSpeed = -0.35;
      c.mouseButtons.wheel = ACTION.NONE;
      c.mouseButtons.right = ACTION.NONE;
      c.mouseButtons.middle = ACTION.NONE;
      c.touches.two = ACTION.NONE;
      c.touches.three = ACTION.NONE;
    } else {
      c.minDistance = Math.max(L, 3.6) * 0.75;
      c.maxDistance = Math.max(L, 3.6) * 3.2 * Math.max(1, distanceScale);
      c.minPolarAngle = 0;
      c.maxPolarAngle = Math.PI / 2 - 0.035;
      c.azimuthRotateSpeed = 1;
      c.polarRotateSpeed = 1;
      c.mouseButtons.wheel = wheelZoom ? ACTION.DOLLY : ACTION.NONE;
      c.mouseButtons.right = ACTION.NONE;
      c.mouseButtons.middle = ACTION.DOLLY;
      c.touches.two = ACTION.TOUCH_DOLLY;
      c.touches.three = ACTION.NONE;
    }
  }, [mode, L, wheelZoom, distanceScale]);

  // camera moves
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const animate = !(first.current && !intro);
    first.current = false;
    if (mode === "pano") {
      c.setLookAt(0, 1.2, 0, 0, 1.2, 0.1, false);
      return;
    }
    if (mode === "interior" && interior) {
      const dir = interior.target.clone().sub(interior.position).normalize().multiplyScalar(0.05);
      const t = interior.position.clone().add(dir);
      c.setLookAt(interior.position.x, interior.position.y, interior.position.z, t.x, t.y, t.z, true);
      return;
    }
    const p = presets[view.preset] ?? presets.hero;
    c.setLookAt(...p, animate);
  }, [mode, interior, view.preset, view.nonce, presets, intro]);

  // the sideways shift makes room for desktop side panels; on portrait screens keep the car centred
  const [ox, fy, fz] = focalOffset ?? [0, 0, 0];
  const fx = aspect < 1 ? 0 : ox;
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const fp = mode !== "exterior";
    c.setFocalOffset(fp ? 0 : fx, fp ? 0 : fy, fp ? 0 : fz, true);
  }, [fx, fy, fz, mode]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const start = () => {
      busy.current = true;
      onInteract?.();
    };
    const end = () => {
      busy.current = false;
    };
    c.addEventListener("controlstart", start);
    c.addEventListener("controlend", end);
    return () => {
      c.removeEventListener("controlstart", start);
      c.removeEventListener("controlend", end);
    };
  }, [onInteract]);

  useFrame((state, dt) => {
    // telephoto outside (product-photo look), wide inside the cabin
    easeFov(state.camera as THREE.PerspectiveCamera, mode === "exterior" ? 32 : 70, dt);
    const c = ref.current;
    if (!c || !autoRotate || mode !== "exterior" || busy.current) return;
    c.rotate(Math.min(dt, 0.05) * 0.16, 0, false);
  });

  return <CameraControls ref={ref} makeDefault enabled={interactive} />;
}
