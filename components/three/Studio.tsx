"use client";

import { useMemo } from "react";
import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";

export type StudioTheme = "dark" | "light";
export type Quality = "high" | "low";

export const STUDIO_BG: Record<StudioTheme, string> = {
  dark: "#08090b",
  light: "#e8e7e3",
};

/**
 * Showroom set: procedural light-box environment (no HDR download), a reflective
 * floor, contact shadows, and a turntable dial engraved into the floor.
 */
export default function Studio({
  theme = "dark",
  quality = "high",
  radius = 3.2,
  accent = "#ff5a1f",
  showDial = true,
  bare = false,
}: {
  theme?: StudioTheme;
  quality?: Quality;
  radius?: number;
  accent?: string;
  showDial?: boolean;
  /** Lighting + reflections only: transparent background, no floor (thumbnails). */
  bare?: boolean;
}) {
  const bg = STUDIO_BG[theme];
  const dark = theme === "dark";

  return (
    <>
      {!bare && <color attach="background" args={[bg]} />}
      {!bare && <fog attach="fog" args={[bg, 9, 30]} />}
      <hemisphereLight args={[dark ? "#9fb3c8" : "#ffffff", dark ? "#0b0b0b" : "#9a978f", dark ? 0.35 : 0.9]} />
      <spotLight position={[0, 9, 0]} angle={0.55} penumbra={1} intensity={dark ? 90 : 60} color="#ffffff" />
      <directionalLight position={[5, 8, 4]} intensity={dark ? 0.6 : 1.2} />

      <Environment resolution={256} frames={1} environmentIntensity={dark ? 1 : 1.15}>
        <color attach="background" args={[dark ? "#050506" : "#d9d8d4"]} />
        {/* ceiling light strips */}
        {[-6, -3, 0, 3, 6].map((z) => (
          <Lightformer key={z} form="rect" intensity={dark ? 1.6 : 2.2} position={[0, 7, z]} rotation-x={Math.PI / 2} scale={[14, 0.32, 1]} />
        ))}
        {/* big soft key */}
        <Lightformer form="rect" intensity={dark ? 3 : 3.5} position={[-9, 2.5, 1]} rotation-y={Math.PI / 2} scale={[18, 3.5, 1]} />
        <Lightformer form="rect" intensity={dark ? 1.4 : 2} position={[9, 2, -1]} rotation-y={-Math.PI / 2} scale={[18, 2.2, 1]} />
        {/* rim ring */}
        <Lightformer form="ring" color={accent} intensity={dark ? 3 : 1.5} position={[0, 3, -12]} scale={5} />
        <Lightformer form="rect" intensity={dark ? 0.8 : 1.4} position={[0, 1, 12]} scale={[20, 1.2, 1]} />
      </Environment>

      {bare ? null : quality === "high" ? (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
          <planeGeometry args={[80, 80]} />
          <MeshReflectorMaterial
            blur={[400, 120]}
            resolution={1024}
            mixBlur={1}
            mixStrength={dark ? 18 : 6}
            roughness={1}
            depthScale={1.1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.3}
            color={dark ? "#0c0d10" : "#d6d5d1"}
            metalness={dark ? 0.6 : 0.2}
            mirror={0}
          />
        </mesh>
      ) : (
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color={dark ? "#0c0d10" : "#d6d5d1"} roughness={0.9} />
        </mesh>
      )}

      {showDial && !bare && <Dial radius={radius} accent={accent} theme={theme} />}

      <ContactShadows
        position={[0, 0.004, 0]}
        opacity={dark ? 0.85 : 0.6}
        scale={radius * 3}
        blur={2.4}
        far={2.2}
        resolution={512}
        frames={6}
        color="#000000"
      />
    </>
  );
}

/** Engraved turntable: tick ring + soft accent arc. Pure geometry, no textures. */
function Dial({ radius, accent, theme }: { radius: number; accent: string; theme: StudioTheme }) {
  const ticks = useMemo(() => {
    const n = 120;
    const g = new THREE.BufferGeometry();
    const pos: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const len = i % 10 === 0 ? 0.22 : i % 5 === 0 ? 0.12 : 0.06;
      const c = Math.cos(a);
      const s = Math.sin(a);
      pos.push(c * radius, 0, s * radius, c * (radius + len), 0, s * (radius + len));
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, [radius]);

  const dark = theme === "dark";
  return (
    <group position={[0, 0.006, 0]}>
      <lineSegments geometry={ticks}>
        <lineBasicMaterial color={dark ? "#3a3f47" : "#9b9890"} transparent opacity={0.9} />
      </lineSegments>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[radius - 0.012, radius, 160]} />
        <meshBasicMaterial color={dark ? "#2a2e35" : "#b5b2aa"} transparent opacity={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} rotation-z={-Math.PI * 0.35}>
        <ringGeometry args={[radius + 0.26, radius + 0.285, 128, 1, 0, Math.PI * 0.5]} />
        <meshBasicMaterial color={accent} transparent opacity={dark ? 0.9 : 0.75} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[radius - 0.012, 128]} />
        <meshBasicMaterial color={dark ? "#ffffff" : "#000000"} transparent opacity={dark ? 0.018 : 0.03} depthWrite={false} />
      </mesh>
    </group>
  );
}
