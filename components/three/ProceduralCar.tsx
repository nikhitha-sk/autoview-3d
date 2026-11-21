"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { resolveShape, driverView, type ResolvedShape } from "@/lib/carShapes";
import { buildCar, clamp, cockpitTexture, lerp, tyreGeometry, type CarBuild, type Placement } from "@/lib/three/buildCar";
import {
  bodyTextures,
  greenhouseTexture,
  grilleTex,
  headlightTex,
  plateTex,
  taillightTex,
  type DecalTex,
} from "@/lib/three/carTextures";
import type { PaintFinish, ShapeOverrides } from "@/lib/types";
import { makeGlass, makePaint, setGlassMode, stepPaint } from "./materials";

export interface ProceduralCarProps {
  dimensions: { length: number; width: number; height: number; wheelbase: number };
  shape: ShapeOverrides;
  paint: { hex: string; finish: PaintFinish };
  interiorColor: string;
  seats: number;
  interior?: boolean;
  label?: string;
  accent?: string;
}

const CLAD = new Set(["boxy", "offroad", "suv", "compact-suv"]);

export default function ProceduralCar({
  dimensions,
  shape,
  paint,
  interiorColor,
  seats,
  interior = false,
  label = "AutoView",
  accent = "#ff5a1f",
}: ProceduralCarProps) {
  const s = useMemo(() => resolveShape(dimensions, shape), [dimensions, shape]);
  const build = useMemo(() => buildCar(s), [s]);
  const tex = useMemo(() => ({ body: bodyTextures(s, build), green: greenhouseTexture(s, build) }), [s, build]);

  // three paint layers share colour/finish animation: plain, body (shut lines), greenhouse (window cut-outs)
  const paintMat = useMemo(() => makePaint(paint.hex, paint.finish), []); // eslint-disable-line react-hooks/exhaustive-deps
  const bodyMat = useMemo(() => {
    const m = paintMat.clone();
    if (tex.body) {
      m.map = tex.body.map;
      m.bumpMap = tex.body.bumpMap;
      m.bumpScale = 1.4;
    }
    return m;
  }, [paintMat, tex]);
  const greenMat = useMemo(() => {
    const m = paintMat.clone();
    if (tex.green) {
      m.map = tex.green;
      m.alphaTest = 0.5;
    }
    return m;
  }, [paintMat, tex]);
  const glassMat = useMemo(() => makeGlass(), []);
  const target = useMemo(() => new THREE.Color(paint.hex), [paint.hex]);

  const mats = useMemo(
    () => ({
      black: new THREE.MeshStandardMaterial({ color: "#0b0b0c", roughness: 0.55, metalness: 0.2 }),
      satin: new THREE.MeshStandardMaterial({ color: "#151618", roughness: 0.75, metalness: 0.05 }),
      gloss: new THREE.MeshPhysicalMaterial({ color: "#050506", roughness: 0.12, metalness: 0.3, clearcoat: 1 }),
      liner: new THREE.MeshStandardMaterial({ color: "#060606", roughness: 0.95, side: THREE.DoubleSide }),
      tyre: new THREE.MeshStandardMaterial({ color: "#161618", roughness: 0.88, metalness: 0, side: THREE.DoubleSide }),
      rim: new THREE.MeshPhysicalMaterial({ color: s.rimColor, roughness: 0.25, metalness: 0.9, clearcoat: 0.6 }),
      barrel: new THREE.MeshStandardMaterial({ color: "#2a2b2f", roughness: 0.45, metalness: 0.8, side: THREE.DoubleSide }),
      disc: new THREE.MeshStandardMaterial({ color: "#7a7d84", roughness: 0.32, metalness: 0.9 }),
      caliper: new THREE.MeshPhysicalMaterial({ color: s.caliper, roughness: 0.3, clearcoat: 1 }),
      chrome: new THREE.MeshStandardMaterial({ color: "#e4e7eb", roughness: 0.06, metalness: 1 }),
      tail: new THREE.MeshStandardMaterial({ color: "#ff1f2d", emissive: "#ff1428", emissiveIntensity: 2.6, toneMapped: false }),
      amber: new THREE.MeshStandardMaterial({ color: "#ffa020", emissive: "#ff8a00", emissiveIntensity: 1.6 }),
      trim: new THREE.MeshStandardMaterial({ color: interiorColor, roughness: 0.75, side: THREE.DoubleSide }),
      trimDark: new THREE.MeshStandardMaterial({ color: "#121214", roughness: 0.6, side: THREE.DoubleSide }),
      headliner: new THREE.MeshStandardMaterial({
        color: "#3a3a3c",
        roughness: 0.9,
        side: THREE.DoubleSide,
        map: tex.green ?? null,
        alphaTest: 0.5,
      }),
      leather: new THREE.MeshPhysicalMaterial({ color: interiorColor, roughness: 0.55, sheen: 0.6, sheenRoughness: 0.5 }),
    }),
    [s.rimColor, s.caliper, interiorColor, tex.green],
  );

  useEffect(() => setGlassMode(glassMat, interior), [interior, glassMat]);

  useFrame((_, dt) => {
    const k = Math.min(dt, 0.1);
    for (const m of [paintMat, bodyMat, greenMat]) stepPaint(m, target, paint.finish, k);
  });

  useEffect(
    () => () => {
      build.body.dispose();
      build.green.dispose();
      build.greenInner.dispose();
      build.glass.dispose();
      tex.body?.map.dispose();
      tex.body?.bumpMap.dispose();
      tex.green?.dispose();
    },
    [build, tex],
  );

  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      <mesh geometry={build.body} material={bodyMat} castShadow />
      <mesh geometry={build.green} material={greenMat} />
      <mesh geometry={build.greenInner} material={mats.headliner} />
      <mesh geometry={build.glass} material={glassMat} renderOrder={2} />

      <ArchLiners s={s} build={build} mat={mats.liner} />
      {CLAD.has(shape.archetype) && <Cladding s={s} build={build} mat={mats.satin} />}
      {build.wheels.map((w, i) => (
        <Wheel key={i} position={w} side={w.z > 0 ? 1 : -1} s={s} mats={mats} />
      ))}
      <Decals s={s} build={build} />
      <Mirrors s={s} build={build} paint={paintMat} mats={mats} />
      <Handles s={s} build={build} paint={paintMat} mats={mats} />
      <Trims s={s} build={build} mats={mats} />
      {s.exhausts > 0 && <Exhausts s={s} build={build} mats={mats} />}
      {s.spareWheel && <SpareWheel s={s} build={build} mats={mats} />}
      {s.archetype === "boxy" && <FenderPods s={s} build={build} mats={mats} />}
      <Cabin s={s} build={build} mats={mats} seats={seats} label={label} accent={accent} />
    </group>
  );
}

type Mats = Record<string, THREE.Material>;

function ArchLiners({ s, build, mat }: { s: ResolvedShape; build: CarBuild; mat: THREE.Material }) {
  const len = s.W / 2 - build.wellZ;
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(build.archR - 0.004, build.archR - 0.004, len, 40, 1, true, Math.PI / 2, Math.PI);
    g.rotateX(Math.PI / 2);
    return g;
  }, [build, len]);
  return (
    <>
      {[s.xFw, s.xRw].flatMap((x) =>
        [1, -1].map((side) => (
          <mesh key={`${x}${side}`} geometry={geo} material={mat} position={[x, s.wheelR, side * (build.wellZ + len / 2 - 0.004)]} />
        )),
      )}
    </>
  );
}

/** Black plastic wheel-arch eyebrows and sill mouldings for SUVs / off-roaders. */
function Cladding({ s, build, mat }: { s: ResolvedShape; build: CarBuild; mat: THREE.Material }) {
  const flare = useMemo(() => {
    const shape = new THREE.Shape();
    const r0 = build.archR + 0.004;
    const r1 = build.archR + (s.archetype === "offroad" || s.archetype === "boxy" ? 0.085 : 0.055);
    shape.absarc(0, 0, r1, 0, Math.PI, false);
    shape.absarc(0, 0, r0, Math.PI, 0, true);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 3, curveSegments: 40 });
    return g;
  }, [build, s.archetype]);
  const skirtLen = s.xFw - s.xRw - build.archR * 2 - 0.12;
  return (
    <>
      {[s.xFw, s.xRw].flatMap((x) =>
        [1, -1].map((side) => (
          <mesh
            key={`${x}${side}`}
            geometry={flare}
            material={mat}
            position={[x, s.wheelR, side * (build.bodyHalfWidthAt(x) - 0.012)]}
            scale={[1, 1, side]}
          />
        )),
      )}
      {[1, -1].map((side) => (
        <RoundedBox
          key={side}
          args={[skirtLen, 0.11, 0.05]}
          radius={0.02}
          position={[(s.xFw + s.xRw) / 2, s.clearance + 0.075, side * (s.W / 2 - 0.03)]}
          material={mat}
        />
      ))}
    </>
  );
}

/** Alloy face: a disc with spoke windows cut out, extruded with a bevel. */
function rimFaceGeometry(rim: number, n: number, style: string) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rim, 0, Math.PI * 2, false);
  const rOut = rim * (style === "aero" ? 0.84 : 0.9);
  const rIn = rim * (style === "aero" ? 0.5 : style === "multi" ? 0.36 : 0.32);
  const spokeW = style === "multi" ? rim * 0.075 : style === "aero" ? rim * 0.3 : style === "offroad" ? rim * 0.2 : rim * 0.16;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const hole = new THREE.Path();
    const K = 10;
    const edge = (r: number, a: number, dir: number) => a + dir * (spokeW / 2 / r);
    // outer arc
    for (let k = 0; k <= K; k++) {
      const a = lerp(edge(rOut, a0, 1), edge(rOut, a1, -1), k / K);
      const x = Math.cos(a) * rOut;
      const y = Math.sin(a) * rOut;
      if (k === 0) hole.moveTo(x, y);
      else hole.lineTo(x, y);
    }
    // trailing spoke edge inward
    for (let k = 1; k <= K; k++) {
      const r = lerp(rOut, rIn, k / K);
      const a = edge(r, a1, -1);
      hole.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    // inner arc back
    for (let k = 1; k <= K; k++) {
      const a = lerp(edge(rIn, a1, -1), edge(rIn, a0, 1), k / K);
      hole.lineTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
    }
    for (let k = 1; k < K; k++) {
      const r = lerp(rIn, rOut, k / K);
      const a = edge(r, a0, 1);
      hole.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    hole.closePath();
    if (edge(rIn, a1, -1) > edge(rIn, a0, 1)) shape.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.005,
    bevelSegments: 2,
    curveSegments: 64,
  });
  return g;
}

function treadGeometry(R: number, w: number) {
  const parts: THREE.BufferGeometry[] = [];
  const n = 34;
  for (let i = 0; i < n; i++) {
    for (const row of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.075, 0.022, w * 0.42);
      const a = ((i + (row > 0 ? 0.5 : 0)) / n) * Math.PI * 2;
      g.translate(0, R + 0.004, row * w * 0.22);
      g.rotateZ(a);
      parts.push(g);
    }
  }
  return mergeGeometries(parts)!;
}

function Wheel({ position, side, s, mats }: { position: THREE.Vector3; side: number; s: ResolvedShape; mats: Mats }) {
  const R = s.wheelR;
  const w = s.tireW;
  const offroad = s.wheel === "offroad";
  const rim = R * (offroad ? 0.6 : s.archetype === "sports" || s.archetype === "supercar" || s.archetype === "coupe" ? 0.74 : 0.68);
  const geos = useMemo(() => {
    const tyre = tyreGeometry(R, w, rim);
    const barrel = new THREE.CylinderGeometry(rim, rim, w * 0.9, 48, 1, true);
    barrel.rotateX(Math.PI / 2);
    const lip = new THREE.TorusGeometry(rim - 0.006, 0.011, 10, 64);
    const face = rimFaceGeometry(rim - 0.012, s.spokes, s.wheel);
    const hub = new THREE.CylinderGeometry(rim * 0.2, rim * 0.23, 0.035, 32);
    hub.rotateX(Math.PI / 2);
    const nut = new THREE.CylinderGeometry(0.011, 0.011, 0.02, 6);
    nut.rotateX(Math.PI / 2);
    const disc = new THREE.CylinderGeometry(rim * 0.82, rim * 0.82, 0.026, 48);
    disc.rotateX(Math.PI / 2);
    const caliper = new THREE.BoxGeometry(0.17, 0.075, 0.05);
    const tread = offroad ? treadGeometry(R, w) : null;
    return { tyre, barrel, lip, face, hub, nut, disc, caliper, tread };
  }, [R, w, rim, s.spokes, s.wheel, offroad]);

  const outer = w / 2 - 0.03;
  return (
    <group position={position} scale={[1, 1, side]}>
      <mesh geometry={geos.tyre} material={mats.tyre} />
      {geos.tread && <mesh geometry={geos.tread} material={mats.tyre} />}
      <mesh geometry={geos.barrel} material={mats.barrel} />
      <mesh geometry={geos.lip} material={mats.rim} position={[0, 0, outer]} />
      <mesh geometry={geos.face} material={mats.rim} position={[0, 0, outer - 0.03]} />
      <mesh geometry={geos.hub} material={mats.black} position={[0, 0, outer]} />
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return <mesh key={i} geometry={geos.nut} material={mats.chrome} position={[Math.cos(a) * rim * 0.13, Math.sin(a) * rim * 0.13, outer + 0.012]} />;
      })}
      <mesh geometry={geos.disc} material={mats.disc} position={[0, 0, outer - 0.1]} />
      <mesh
        geometry={geos.caliper}
        material={mats.caliper}
        position={[Math.cos(2.4) * rim * 0.7, Math.sin(2.4) * rim * 0.7, outer - 0.075]}
        rotation={[0, 0, 2.4 - Math.PI / 2]}
      />
    </group>
  );
}

// ---------------------------------------------------------------- decals

interface DecalPart {
  geo: THREE.BufferGeometry;
  tex: DecalTex | null;
  kind: "head" | "tail" | "grille" | "plate";
}

/** Lights, grilles and plates projected onto the nose / tail so they follow the body's curvature. */
function Decals({ s, build }: { s: ResolvedShape; build: CarBuild }) {
  const parts = useMemo(() => {
    const out: DecalPart[] = [];
    const W = s.W;
    const { noseTopY: nT, noseMidY: nM, chinY, deckY, tailMidY, rearChinY } = build;
    const rect = (h0: number, h1: number, y0: number, y1: number) => (a: number, b: number): [number, number] => [lerp(h0, h1, a), lerp(y0, y1, b)];
    const add = (kind: DecalPart["kind"], tex: DecalTex | null, end: "front" | "rear", map: (a: number, b: number) => [number, number], na = 40, nb = 10, off = 0.003) =>
      out.push({ kind, tex, geo: build.decal(end, map, na, nb, off) });

    // ---- front lights
    const head = headlightTex(s.headlight);
    const frontH = nT - chinY;
    for (const sd of [1, -1]) {
      switch (s.headlight) {
        case "round": {
          const r = clamp(frontH * 0.24, 0.075, 0.11);
          const hc = W * (s.archetype === "sports" ? 0.33 : 0.36);
          // sports cars carry their lamps up on the wings; upright SUVs in the grille face
          const yc = s.archetype === "sports" ? nT + 0.04 : nT - r - 0.03;
          add("head", head, "front", rect(sd * (hc - r), sd * (hc + r), yc - r, yc + r), 24, 24);
          break;
        }
        case "split": {
          add("head", head, "front", rect(0, sd * W * 0.45, nT - 0.05, nT - 0.015), 40, 4);
          const lamp = headlightTex("lamp");
          const yl = lerp(chinY, nM, 0.62);
          add("head", lamp, "front", rect(sd * W * 0.25, sd * W * 0.43, yl - 0.045, yl + 0.045), 20, 6);
          break;
        }
        case "sharp":
          add("head", head, "front", rect(sd * W * 0.21, sd * W * 0.48, nT - 0.14, nT - 0.012), 40, 12);
          break;
        default:
          add("head", head, "front", rect(sd * W * 0.22, sd * W * 0.48, nT - 0.095, nT - 0.012), 40, 10);
      }
    }

    // ---- grille + lower intake + plate
    const gy = (f: number) => lerp(chinY, nT, f);
    if (s.grille !== "none") {
      const g = grilleTex(s.grille);
      if (s.grille === "kidney") add("grille", g, "front", rect(-W * 0.14, W * 0.14, gy(0.38), nT - 0.03), 24, 12);
      else if (s.grille === "slots") add("grille", g, "front", rect(-W * 0.22, W * 0.22, gy(0.5), nT - 0.06), 30, 10);
      else if (s.grille === "bars") add("grille", g, "front", rect(-W * 0.24, W * 0.24, gy(0.42), nT - 0.05), 30, 10);
      else if (s.grille === "hex") add("grille", g, "front", rect(-W * 0.24, W * 0.24, gy(0.3), gy(0.72)), 30, 10);
      else add("grille", g, "front", rect(-W * 0.24, W * 0.24, gy(0.46), nT - 0.05), 30, 10);
    }
    const intakeH = s.archetype === "supercar" ? 0.16 : s.grille === "none" ? 0.12 : 0.09;
    const iy0 = chinY + 0.035;
    add("grille", grilleTex("intake"), "front", rect(-W * 0.3, W * 0.3, iy0, iy0 + intakeH), 30, 6);
    if (s.archetype === "supercar" || s.archetype === "sports") {
      for (const sd of [1, -1]) add("grille", grilleTex("intake"), "front", rect(sd * W * 0.33, sd * W * 0.46, iy0, iy0 + intakeH * 1.1), 14, 6);
    }
    const plateY = iy0 + intakeH * 0.5;
    // seen from the front, +z (h > 0) is on the viewer's left, so run the plate texture the other way
    add("plate", plateTex("AV 3D 2026"), "front", rect(0.25, -0.25, plateY - 0.058, plateY + 0.058), 16, 4, 0.006);

    // ---- rear lights
    const tail = taillightTex(s.taillight);
    if (s.taillight === "bar") {
      add("tail", tail, "rear", rect(-W * 0.48, W * 0.48, deckY - 0.1, deckY - 0.028), 80, 6);
    } else if (s.taillight === "vertical") {
      const top = deckY - 0.04;
      for (const sd of [1, -1]) add("tail", tail, "rear", rect(sd * W * 0.34, sd * W * 0.5, top - 0.34, top), 16, 20);
    } else {
      for (const sd of [1, -1]) add("tail", tail, "rear", rect(sd * W * 0.2, sd * W * 0.52, deckY - 0.15, deckY - 0.025), 40, 10);
    }
    const ry = lerp(rearChinY, tailMidY, 0.5);
    add("plate", plateTex("AV 3D 2026"), "rear", rect(-0.25, 0.25, ry - 0.058, ry + 0.058), 16, 4, 0.006);
    if (s.archetype === "sports" || s.archetype === "supercar" || s.archetype === "coupe") {
      add("grille", grilleTex("diffuser"), "rear", rect(-W * 0.36, W * 0.36, rearChinY - 0.02, rearChinY + 0.08), 40, 6);
    }
    return out;
  }, [s, build]);

  const materials = useMemo(
    () =>
      parts.map(
        (p) =>
          new THREE.MeshPhysicalMaterial({
            map: p.tex?.map ?? null,
            emissiveMap: p.tex?.emissive ?? null,
            emissive: p.tex?.emissive ? new THREE.Color("#ffffff") : new THREE.Color("#000000"),
            emissiveIntensity: p.kind === "tail" ? 2.2 : 2.6,
            roughness: p.kind === "plate" ? 0.4 : p.kind === "grille" ? 0.32 : 0.1,
            metalness: p.kind === "grille" ? 0.35 : 0.15,
            clearcoat: p.kind === "head" || p.kind === "tail" ? 1 : 0.3,
            clearcoatRoughness: 0.04,
            alphaTest: 0.5,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -2,
          }),
      ),
    [parts],
  );

  useEffect(
    () => () => {
      parts.forEach((p) => {
        p.geo.dispose();
        p.tex?.map.dispose();
        p.tex?.emissive?.dispose();
      });
      materials.forEach((m) => m.dispose());
    },
    [parts, materials],
  );

  return (
    <>
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.geo} material={materials[i]} renderOrder={1} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- small exterior parts

function Mirrors({ s, build, paint, mats }: { s: ResolvedShape; build: CarBuild; paint: THREE.Material; mats: Mats }) {
  const x = s.xA - 0.12;
  const y = build.sillAt(x) + 0.075;
  const hw = build.bodyHalfWidthAt(x) * (1 - s.sideBulge * 0.9) - 0.02;
  // teardrop housing: rounded box, tapered toward the front
  const cap = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 32, 16);
    const pos = g.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      // squash toward a box (superellipse-ish), flatten the back face, taper the nose
      const k = 0.55;
      const sx = Math.sign(x) * Math.pow(Math.abs(x), k);
      const sy = Math.sign(y) * Math.pow(Math.abs(y), k);
      const sz = Math.sign(z) * Math.pow(Math.abs(z), k);
      const back = sx < 0 ? 0.45 : 1;
      pos.setXYZ(i, sx * 0.07 * back, sy * 0.068 * (1 - 0.15 * Math.max(0, sx)), sz * 0.125);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <>
      {[1, -1].map((side) => (
        <group key={side} position={[x, y, side * hw]}>
          {/* arm */}
          <mesh material={mats.black} position={[0.01, -0.02, side * 0.05]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.07, 0.025, 0.1]} />
          </mesh>
          {/* housing, flattened at the back where the glass is */}
          <mesh geometry={cap} material={paint} position={[0.0, 0.02, side * 0.15]} />
          <mesh material={mats.chrome} position={[-0.033, 0.02, side * 0.15]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[0.2, 0.1]} />
          </mesh>
          <mesh material={mats.amber} position={[0.03, 0.0, side * 0.24]}>
            <boxGeometry args={[0.02, 0.01, 0.05]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Handles({ s, build, paint, mats }: { s: ResolvedShape; build: CarBuild; paint: THREE.Material; mats: Mats }) {
  const spots = useMemo(() => {
    const { xB, xDoorR, doors } = build.layout;
    const xs = doors === 4 ? [xB + 0.16, xDoorR + 0.16] : [xB + 0.2];
    const out: Placement[] = [];
    for (const x of xs) {
      const y = build.sillAt(x) - 0.09;
      for (const side of [1, -1]) {
        const p = build.stick(new THREE.Vector3(x, y, side * 3), new THREE.Vector3(0, 0, -side), 0.003);
        if (p) out.push(p);
      }
    }
    return out;
  }, [build]);
  const mat = s.handles === "flush" ? paint : s.chromeTrim ? mats.chrome : paint;
  return (
    <>
      {spots.map((p, i) => (
        <group key={i} position={p.position} quaternion={p.quaternion}>
          <mesh material={mats.black} position={[0, 0, -0.001]}>
            <boxGeometry args={[0.17, 0.04, 0.004]} />
          </mesh>
          <RoundedBox args={[0.15, 0.026, s.handles === "flush" ? 0.008 : 0.022]} radius={0.004} material={mat} />
        </group>
      ))}
    </>
  );
}

/** Chrome belt line, roof rails, wipers and shark-fin antenna. */
function Trims({ s, build, mats }: { s: ResolvedShape; build: CarBuild; mats: Mats }) {
  const geos = useMemo(() => {
    const out: { geo: THREE.BufferGeometry; mat: string }[] = [];
    const [gx0, gx1] = build.ghXs;
    // p on the greenhouse side band at the window sill
    const pSill = (x: number) => {
      const m = build.ghMetrics(x);
      return clamp(1 - (m.qSill - m.hwmrt - m.arc) / Math.max(1e-3, m.bandH), 0, 1);
    };
    const runs = (fn: (x: number) => { p: number } | null, x0: number, x1: number, off: number, r: number, mat: string) => {
      for (const mirror of [false, true]) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 40; i++) {
          const x = lerp(x0, x1, i / 40);
          const f = fn(x);
          if (!f) continue;
          const pp = mirror ? 6 - f.p : f.p;
          pts.push(build.ghPoint(x, pp, off).p);
        }
        if (pts.length > 3) out.push({ geo: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, r, 8), mat });
      }
    };
    if (s.chromeTrim) {
      // chrome sill strip under the side windows, from C-pillar to A-pillar
      const xs0 = s.rearPillar === "slim" ? s.xRr + 0.06 : lerp(s.xRr, s.xC, 0.45);
      let xs1 = gx1;
      for (let x = gx0; x < gx1; x += 0.01) {
        const m = build.ghMetrics(x);
        if (m.qSill - m.qTop < 0.02 && x > s.xRf) {
          xs1 = x;
          break;
        }
      }
      runs((x) => ({ p: pSill(x) - 0.03 }), xs0, xs1 - 0.03, 0.004, 0.0065, "chrome");
    }
    if (s.roofRails) {
      const rx0 = s.xRr + 0.12;
      const rx1 = s.xRf - 0.15;
      const railMat = s.chromeTrim ? "chrome" : "black";
      runs(() => ({ p: 2.14 }), rx0 + 0.04, rx1 - 0.04, 0.042, 0.017, railMat);
      // feet at each end and in the middle
      for (const x of [rx0 + 0.05, (rx0 + rx1) / 2, rx1 - 0.05])
        for (const p of [2.14, 6 - 2.14]) {
          const base = build.ghPoint(x, p, 0.0);
          const g = new THREE.CylinderGeometry(0.018, 0.026, 0.05, 12);
          g.translate(0, 0.022, 0);
          g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), base.n));
          g.translate(base.p.x, base.p.y, base.p.z);
          out.push({ geo: g, mat: railMat });
        }
    }
    // wipers resting at the base of the windscreen
    const wx = (() => {
      for (let x = gx1; x > gx0; x -= 0.005) {
        if (build.ghSection(x).sp.t - build.sillAt(x) > 0.07) return x;
      }
      return gx1 - 0.1;
    })();
    for (const z0 of [0.1, -0.42]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 8; i++) {
        const q = z0 + (i / 8) * 0.48 * (s.W / 1.85);
        const m = build.ghMetrics(wx);
        const p = clamp(3 - q / Math.max(0.1, m.hwmrt), 2, 4);
        pts.push(build.ghPoint(wx, p, 0.012).p);
      }
      out.push({ geo: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.006, 6), mat: "black" });
    }
    return out;
  }, [s, build]);

  const fin = useMemo(() => {
    if (s.archetype === "boxy" || s.archetype === "offroad" || s.glassRoof) return null;
    return build.ghPoint(s.xRr + 0.14, 3, 0);
  }, [s, build]);

  useEffect(() => () => geos.forEach((g) => g.geo.dispose()), [geos]);

  return (
    <>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g.geo} material={mats[g.mat]} />
      ))}
      {fin && (
        <mesh material={mats.gloss} position={fin.p} scale={[0.1, 0.05, 0.03]}>
          <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      )}
    </>
  );
}

/** Indicator pods perched on the front wings (G-Class signature). */
function FenderPods({ s, build, mats }: { s: ResolvedShape; build: CarBuild; mats: Mats }) {
  const x = s.xF - 0.16;
  const z = build.bodyHalfWidthAt(x) - 0.1;
  const y = build.surfaceY(x, z) ?? build.noseTopY;
  return (
    <>
      {[1, -1].map((side) => (
        <group key={side} position={[x, y, side * z]}>
          <RoundedBox args={[0.12, 0.05, 0.07]} radius={0.015} position={[0, 0.02, 0]} material={mats.chrome} />
          <RoundedBox args={[0.1, 0.035, 0.075]} radius={0.012} position={[0.012, 0.03, 0]} material={mats.amber} />
        </group>
      ))}
    </>
  );
}

function Exhausts({ s, build, mats }: { s: ResolvedShape; build: CarBuild; mats: Mats }) {
  const tips = useMemo(() => {
    const n = s.exhausts;
    const y = build.rearChinY + 0.03;
    const out: Placement[] = [];
    const zs = n === 4 ? [-0.62, -0.5, 0.5, 0.62] : n === 2 ? (s.archetype === "sports" ? [-0.08, 0.08] : [-0.55, 0.55]) : [0.5];
    for (const zf of zs) {
      const p = build.stick(new THREE.Vector3(s.xR - 1, y, zf * s.W * 0.5), new THREE.Vector3(1, 0, 0), -0.02);
      if (p) out.push(p);
    }
    return out;
  }, [s, build]);
  return (
    <>
      {tips.map((p, i) => (
        <group key={i} position={p.position} quaternion={p.quaternion}>
          <mesh material={mats.chrome} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.09, 24, 1, true]} />
          </mesh>
          <mesh material={mats.black} position={[0, 0, 0.02]}>
            <circleGeometry args={[0.04, 24]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function SpareWheel({ s, build, mats }: { s: ResolvedShape; build: CarBuild; mats: Mats }) {
  const p = useMemo(
    () => build.stick(new THREE.Vector3(s.xR - 1, s.H * 0.45, 0), new THREE.Vector3(1, 0, 0), 0.0),
    [s, build],
  );
  const tyre = useMemo(() => tyreGeometry(s.wheelR * 0.95, s.tireW * 0.9, s.wheelR * 0.62), [s]);
  if (!p) return null;
  return (
    <group position={p.position}>
      <group position={[-s.tireW * 0.45, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh geometry={tyre} material={mats.tyre} />
        <mesh material={mats.gloss} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -s.tireW * 0.4]}>
          <cylinderGeometry args={[s.wheelR * 0.78, s.wheelR * 0.78, 0.05, 48]} />
        </mesh>
        <mesh material={mats.chrome} position={[0, 0, -s.tireW * 0.46]}>
          <torusGeometry args={[s.wheelR * 0.5, 0.01, 8, 48]} />
        </mesh>
      </group>
    </group>
  );
}

/** Procedural cockpit: dashboard with live-looking displays, seats, wheel, trim. */
function Cabin({
  s,
  build,
  mats,
  seats,
  label,
  accent,
}: {
  s: ResolvedShape;
  build: CarBuild;
  mats: Mats;
  seats: number;
  label: string;
  accent: string;
}) {
  const view = useMemo(() => driverView(s), [s]);
  const cluster = useMemo(() => cockpitTexture("cluster", accent, label), [accent, label]);
  const center = useMemo(() => cockpitTexture("center", accent, label), [accent, label]);

  const [ex, ey, ez] = view.eye;
  const floorY = s.clearance + 0.1;
  const innerHw = build.bodyHalfWidthAt(ex) * 0.86;
  const hip = Math.max(floorY + 0.12, ey - 0.78);
  const dashX = Math.min(s.xA - 0.02, ex + 1.15);
  const dashBackX = Math.min(ex + 0.8, dashX - 0.2);
  const dashTop = build.beltY + 0.02;
  const dashLen = Math.max(0.2, dashX - dashBackX);
  const cabinLen = Math.max(0.6, s.xA - (s.xC + 0.25));
  // rear bench only where it fits under the greenhouse (2+2 coupes have very little room)
  const rear = useMemo(() => {
    const x = Math.max(ex - 0.95, s.xC + 0.5, s.doors === 2 ? s.xRr - 0.55 : -Infinity);
    const back = Math.min(0.6, build.ghSection(x - 0.25).sp.t - hip - 0.16);
    const width = Math.min(innerHw * 1.8, s.W * s.glassWidth * 0.78);
    return back > 0.25 ? { x, back, width } : null;
  }, [ex, s, build, hip, innerHw]);

  // shrink the seat backs in low cars so headrests stay under the roof
  const seatScale = clamp((build.ghSection(ex - 0.25).sp.t - 0.07 - hip) / 0.92, 0.55, 1);
  const seat = (z: number, x: number, key: string) => (
    <group key={key} position={[x, hip, z]}>
      <RoundedBox args={[0.5, 0.12, 0.48]} radius={0.05} position={[0.08, 0, 0]} material={mats.leather} />
      <group position={[-0.17, 0.05, 0]} rotation={[0, 0, 0.22]} scale={[1, seatScale, 1]}>
        <RoundedBox args={[0.12, 0.68, 0.48]} radius={0.05} position={[0, 0.34, 0]} material={mats.leather} />
        <RoundedBox args={[0.1, 0.17, 0.26]} radius={0.04} position={[0.01, 0.8, 0]} material={mats.leather} />
        {[1, -1].map((sd) => (
          <RoundedBox key={sd} args={[0.13, 0.5, 0.06]} radius={0.025} position={[0.04, 0.3, sd * 0.24]} material={mats.trimDark} />
        ))}
      </group>
    </group>
  );

  return (
    <group>
      {/* floor & tub */}
      <mesh material={mats.trimDark} position={[(s.xA + s.xC) / 2, floorY, 0]}>
        <boxGeometry args={[cabinLen + 0.3, 0.02, innerHw * 2]} />
      </mesh>
      {[1, -1].map((sd) => (
        <mesh key={sd} material={mats.trim} position={[(s.xA + s.xC) / 2 + 0.05, (floorY + build.beltY - 0.03) / 2, sd * innerHw]}>
          <boxGeometry args={[cabinLen + 0.2, build.beltY - 0.03 - floorY, 0.03]} />
        </mesh>
      ))}
      {/* dashboard */}
      <RoundedBox
        args={[dashLen, 0.24, innerHw * 2 - 0.02]}
        radius={0.06}
        position={[dashBackX + dashLen / 2, dashTop - 0.12, 0]}
        material={mats.trimDark}
      />
      <mesh material={mats.trim} position={[dashBackX + 0.02, dashTop - 0.2, 0]}>
        <boxGeometry args={[0.06, 0.06, innerHw * 2 - 0.06]} />
      </mesh>
      {/* instrument cluster facing driver */}
      <mesh position={[dashBackX + 0.03, dashTop + 0.06, ez]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.36, 0.14]} />
        <meshBasicMaterial map={cluster ?? undefined} toneMapped={false} />
      </mesh>
      <mesh material={mats.gloss} position={[dashBackX + 0.04, dashTop + 0.06, ez]}>
        <boxGeometry args={[0.012, 0.16, 0.38]} />
      </mesh>
      {/* centre touchscreen */}
      <group position={[dashBackX - 0.02, dashTop + 0.05, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh>
          <planeGeometry args={[0.32, 0.17]} />
          <meshBasicMaterial map={center ?? undefined} toneMapped={false} />
        </mesh>
        <mesh material={mats.gloss} position={[0, 0, -0.008]}>
          <boxGeometry args={[0.34, 0.19, 0.012]} />
        </mesh>
      </group>
      {/* steering wheel */}
      <group position={[ex + 0.52, ey - 0.3, ez]} rotation={[0, -Math.PI / 2, 0]}>
        <group rotation={[-0.32, 0, 0]}>
          <mesh material={mats.leather}>
            <torusGeometry args={[0.18, 0.02, 12, 48]} />
          </mesh>
          {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => (
            <mesh key={a} material={mats.trimDark} rotation={[0, 0, a - Math.PI / 2]} position={[0, 0, 0]}>
              <boxGeometry args={[0.03, 0.34, 0.015]} />
            </mesh>
          ))}
          <mesh material={mats.trimDark} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.055, 0.06, 0.05, 24]} />
          </mesh>
          <mesh material={mats.tail} position={[0, 0.18, 0.012]}>
            <boxGeometry args={[0.02, 0.02, 0.01]} />
          </mesh>
          <mesh material={mats.trimDark} position={[0, 0, -0.16]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.03, 0.3, 12]} />
          </mesh>
        </group>
      </group>
      {/* centre console */}
      <RoundedBox
        args={[Math.max(0.3, dashBackX - ex + 0.2), 0.16, 0.2]}
        radius={0.04}
        position={[(dashBackX + ex) / 2 - 0.05, hip + 0.05, 0]}
        material={mats.trimDark}
      />
      {/* seats */}
      {seat(ez, ex - 0.12, "d")}
      {seat(-ez, ex - 0.12, "p")}
      {seats > 2 && rear && (
        <group position={[rear.x, hip + 0.02, 0]}>
          <RoundedBox args={[0.48, 0.12, rear.width]} radius={0.05} material={mats.leather} />
          <group position={[-0.25, 0.05, 0]} rotation={[0, 0, 0.2]}>
            <RoundedBox args={[0.12, rear.back, rear.width]} radius={0.05} position={[0, rear.back / 2, 0]} material={mats.leather} />
          </group>
        </group>
      )}
    </group>
  );
}
