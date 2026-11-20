"use client";

import { useEffect } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";

/**
 * 360° interior: an equirectangular photo mapped on the inside of a large sphere.
 * The camera sits at the centre (see CarViewer's "pano" mode) and looks around.
 * Mirroring the sphere on X un-flips the image when viewed from inside.
 */
export default function InteriorViewer({ url, eyeHeight = 1.2 }: { url: string; eyeHeight?: number }) {
  const tex = useLoader(THREE.TextureLoader, url);
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
  }, [tex]);
  return (
    <mesh position={[0, eyeHeight, 0]} scale={[-1, 1, 1]}>
      <sphereGeometry args={[10, 64, 40]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}
