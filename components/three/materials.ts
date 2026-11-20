import * as THREE from "three";
import type { PaintFinish } from "@/lib/types";

export const FINISHES: Record<
  PaintFinish,
  { metalness: number; roughness: number; clearcoat: number; clearcoatRoughness: number; iridescence: number }
> = {
  gloss: { metalness: 0.05, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0 },
  metallic: { metalness: 0.62, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0 },
  pearl: { metalness: 0.3, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.4 },
  matte: { metalness: 0.3, roughness: 0.62, clearcoat: 0, clearcoatRoughness: 0.6, iridescence: 0 },
};

export function makePaint(hex: string, finish: PaintFinish) {
  const f = FINISHES[finish];
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex),
    ...f,
    iridescenceIOR: 1.6,
    envMapIntensity: 1.2,
    side: THREE.DoubleSide,
  });
}

/** Smoothly animate a paint material toward a new colour/finish (call every frame). */
export function stepPaint(m: THREE.MeshPhysicalMaterial, target: THREE.Color, finish: PaintFinish, dt: number) {
  const k = 1 - Math.exp(-dt * 7);
  const f = FINISHES[finish];
  m.color.lerp(target, k);
  m.metalness = THREE.MathUtils.lerp(m.metalness, f.metalness, k);
  m.roughness = THREE.MathUtils.lerp(m.roughness, f.roughness, k);
  m.clearcoat = THREE.MathUtils.lerp(m.clearcoat, f.clearcoat, k);
  m.clearcoatRoughness = THREE.MathUtils.lerp(m.clearcoatRoughness, f.clearcoatRoughness, k);
  m.iridescence = THREE.MathUtils.lerp(m.iridescence, f.iridescence, k);
}

/** Glass is nearly opaque outside and almost clear from the driver's seat. */
export function setGlassMode(m: THREE.MeshPhysicalMaterial, interior: boolean, exterior = 0.93) {
  m.opacity = interior ? 0.1 : exterior;
  m.needsUpdate = true;
}

export function makeGlass() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#05070a"),
    metalness: 0.2,
    roughness: 0.03,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    transparent: true,
    opacity: 0.93,
    envMapIntensity: 1.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}
