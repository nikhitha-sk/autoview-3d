"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { PaintFinish } from "@/lib/types";
import { makeGlass, makePaint, stepPaint } from "./materials";

useGLTF.setDecoderPath("/draco/");

const PAINT_RE = /^(body|paint|car_?paint|body_?colou?r)$/i;
const GLASS_RE = /glass|window/i;

export interface GltfCarProps {
  url: string;
  paint?: { hex: string; finish: PaintFinish };
  interior?: boolean;
  /** Re-centre and scale unknown models (e.g. AI-generated) to a ~4.5 m car on the ground. */
  normalize?: boolean;
}

export default function GltfCar({ url, paint, interior = false, normalize = false }: GltfCarProps) {
  const { scene } = useGLTF(url, "/draco/");
  const paintMat = useMemo(() => (paint ? makePaint(paint.hex, paint.finish) : null), []); // eslint-disable-line react-hooks/exhaustive-deps
  const glassMat = useMemo(() => makeGlass(), []);
  const target = useMemo(() => new THREE.Color(paint?.hex ?? "#ffffff"), [paint?.hex]);

  const model = useMemo(() => {
    const root = scene.clone(true);
    let repainted = false;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const matName = (Array.isArray(mesh.material) ? mesh.material[0]?.name : mesh.material?.name) ?? "";
      if (paintMat && (PAINT_RE.test(mesh.name) || PAINT_RE.test(matName))) {
        mesh.material = paintMat;
        repainted = true;
      } else if (GLASS_RE.test(mesh.name) || GLASS_RE.test(matName)) {
        mesh.material = glassMat;
        mesh.renderOrder = 2;
      }
    });
    if (normalize) {
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.z, 1e-6);
      const k = 4.4 / longest;
      root.scale.setScalar(k);
      const box2 = new THREE.Box3().setFromObject(root);
      const c = box2.getCenter(new THREE.Vector3());
      root.position.set(-c.x, -box2.min.y, -c.z);
      // orient the long axis front-to-back
      if (size.x > size.z) {
        const g = new THREE.Group();
        g.add(root);
        g.rotation.y = Math.PI / 2;
        return { root: g, repainted };
      }
    }
    return { root, repainted };
  }, [scene, paintMat, glassMat, normalize]);

  useEffect(() => {
    glassMat.opacity = interior ? 0.08 : 0.82;
  }, [interior, glassMat]);

  useFrame((_, dt) => {
    if (paintMat && paint) stepPaint(paintMat, target, paint.finish, Math.min(dt, 0.1));
  });

  return <primitive object={model.root} />;
}
