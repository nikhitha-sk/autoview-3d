"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { CameraControls, CameraControlsImpl, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import ProceduralCar from "./three/ProceduralCar";
import GltfCar from "./three/GltfCar";
import Studio, { type Quality, type StudioTheme } from "./three/Studio";
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
  if (car.model3d) return null;
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
  onInteract,
}: CarViewerProps) {
  const [q, setQ] = useState<Quality>("high");
  const [dpr, setDpr] = useState<number>(1.5);

  useEffect(() => {
    if (quality !== "auto") {
      setQ(quality);
      return;
    }
    const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
    setQ(coarse ? "low" : "high");
    setDpr(coarse ? 1.25 : Math.min(window.devicePixelRatio, 1.75));
  }, [quality]);

  const L = car ? car.dimensions.length / 1000 : 4.4;
  const H = car ? car.dimensions.height / 1000 : 1.4;
  const url = modelUrl ?? car?.model3d;
  const paintValue = paint ?? car?.paints[0];
  const interiorCam = useMemo(() => interiorFor(car), [car]);
  const pano = mode === "interior" ? car?.interior360 : undefined;
  const bare = stage === "bare";

  return (
    <div className={className} style={{ touchAction: interactive ? "none" : "auto" }}>
      <Canvas
        dpr={dpr}
        camera={{ fov: 32, near: 0.03, far: 120, position: [L * 2.2, H * 1.6 + 1.2, L * 2.6] }}
        gl={{ antialias: true, alpha: bare, preserveDrawingBuffer: bare }}
        style={{ pointerEvents: interactive ? "auto" : "none" }}
      >
        <PerformanceMonitor
          onDecline={() => {
            setDpr(1);
            setQ("low");
          }}
        />
        <Suspense fallback={null}>
          {pano ? (
            <InteriorSphere url={pano} />
          ) : (
            <>
              <Studio theme={theme} quality={q} radius={Math.max(L * 0.68, 2.4)} accent={accent} bare={bare} />
              {url ? (
                <GltfCar url={url} normalize={normalize} paint={paintValue} interior={mode === "interior"} />
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
          onInteract={onInteract}
        />
      </Canvas>
    </div>
  );
}

function InteriorSphere({ url }: { url: string }) {
  const tex = useLoader(THREE.TextureLoader, url);
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
  }, [tex]);
  return (
    <mesh position={[0, 1.2, 0]} scale={[-1, 1, 1]}>
      <sphereGeometry args={[10, 64, 40]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} toneMapped={false} />
    </mesh>
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
  onInteract?: () => void;
}) {
  const ref = useRef<CameraControlsImpl>(null);
  const busy = useRef(false);
  const first = useRef(true);
  const { size } = useThree();
  const aspect = size.width / Math.max(1, size.height);

  const presets = useMemo(() => {
    const D = Math.max(L, 3.6) * 1.32 * (aspect < 0.8 ? 1.75 : aspect < 1.3 ? 1.3 : 1);
    const ty = H * 0.42;
    const p: Record<ViewPreset, [number, number, number, number, number, number]> = {
      hero: [D * 0.66, H * 0.5 + 0.55, D * 0.76, 0, ty, 0],
      front: [0.001, H * 0.55 + 0.25, D * 0.98, 0, ty, 0],
      side: [D * 1.02, H * 0.45 + 0.2, 0.001, 0, ty, 0],
      rear: [-D * 0.62, H * 0.6 + 0.6, -D * 0.78, 0, ty, 0],
      top: [0.001, D * 1.35, 0.002, 0, 0, 0],
    };
    return p;
  }, [L, H, aspect]);

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
      c.maxDistance = Math.max(L, 3.6) * 3.2;
      c.minPolarAngle = 0;
      c.maxPolarAngle = Math.PI / 2 - 0.035;
      c.azimuthRotateSpeed = 1;
      c.polarRotateSpeed = 1;
      c.mouseButtons.wheel = ACTION.DOLLY;
      c.mouseButtons.right = ACTION.NONE;
      c.mouseButtons.middle = ACTION.DOLLY;
      c.touches.two = ACTION.TOUCH_DOLLY;
      c.touches.three = ACTION.NONE;
    }
  }, [mode, L]);

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

  useFrame((_, dt) => {
    const c = ref.current;
    if (!c || !autoRotate || mode !== "exterior" || busy.current) return;
    c.rotate(Math.min(dt, 0.05) * 0.16, 0, false);
  });

  return <CameraControls ref={ref} makeDefault enabled={interactive} />;
}
