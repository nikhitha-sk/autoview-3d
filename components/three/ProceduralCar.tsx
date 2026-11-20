"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { resolveShape, driverView, type ResolvedShape } from "@/lib/carShapes";
import { buildCar, cockpitTexture, tyreGeometry, type CarBuild, type Placement } from "@/lib/three/buildCar";
import type { PaintFinish, ShapeOverrides } from "@/lib/types";
import { makeGlass, makePaint, stepPaint } from "./materials";

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

const SUV_LIKE = new Set(["boxy", "luxury-suv", "offroad", "suv", "compact-suv", "crossover"]);

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

  const paintMat = useMemo(() => makePaint(paint.hex, paint.finish), []); // eslint-disable-line react-hooks/exhaustive-deps
  const glassMat = useMemo(() => makeGlass(), []);
  const target = useMemo(() => new THREE.Color(paint.hex), [paint.hex]);

  const mats = useMemo(
    () => ({
      black: new THREE.MeshStandardMaterial({ color: "#0b0b0c", roughness: 0.55, metalness: 0.2 }),
      gloss: new THREE.MeshPhysicalMaterial({ color: "#050506", roughness: 0.15, metalness: 0.4, clearcoat: 1 }),
      liner: new THREE.MeshStandardMaterial({ color: "#060606", roughness: 0.95, side: THREE.DoubleSide }),
      tyre: new THREE.MeshStandardMaterial({ color: "#131315", roughness: 0.82, metalness: 0, side: THREE.DoubleSide }),
      rim: new THREE.MeshStandardMaterial({ color: s.rimColor, roughness: 0.22, metalness: 0.95 }),
      barrel: new THREE.MeshStandardMaterial({ color: "#1a1b1e", roughness: 0.5, metalness: 0.7, side: THREE.DoubleSide }),
      disc: new THREE.MeshStandardMaterial({ color: "#6d7077", roughness: 0.35, metalness: 0.9 }),
      caliper: new THREE.MeshPhysicalMaterial({ color: s.caliper, roughness: 0.3, clearcoat: 1 }),
      chrome: new THREE.MeshStandardMaterial({ color: "#d6d9de", roughness: 0.08, metalness: 1 }),
      head: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#e8f1ff", emissiveIntensity: 3.2, toneMapped: false }),
      headLens: new THREE.MeshPhysicalMaterial({ color: "#11151b", roughness: 0.05, metalness: 0.5, clearcoat: 1 }),
      tail: new THREE.MeshStandardMaterial({ color: "#ff1f2d", emissive: "#ff1428", emissiveIntensity: 2.6, toneMapped: false }),
      trim: new THREE.MeshStandardMaterial({ color: interiorColor, roughness: 0.75, side: THREE.DoubleSide }),
      trimDark: new THREE.MeshStandardMaterial({ color: "#121214", roughness: 0.6, side: THREE.DoubleSide }),
      leather: new THREE.MeshPhysicalMaterial({ color: interiorColor, roughness: 0.55, sheen: 0.6, sheenRoughness: 0.5 }),
    }),
    [s.rimColor, s.caliper, interiorColor],
  );

  useEffect(() => {
    glassMat.opacity = interior ? 0.1 : 0.86;
    glassMat.needsUpdate = true;
  }, [interior, glassMat]);

  useFrame((_, dt) => stepPaint(paintMat, target, paint.finish, Math.min(dt, 0.1)));

  useEffect(
    () => () => {
      build.body.dispose();
      build.glass.dispose();
      build.roof.dispose();
    },
    [build],
  );

  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      <mesh geometry={build.body} material={paintMat} castShadow />
      <mesh geometry={build.glass} material={glassMat} renderOrder={2} />
      <mesh geometry={build.roof} material={s.roofBlack ? mats.gloss : paintMat} />

      <ArchLiners s={s} build={build} mat={mats.liner} />
      {SUV_LIKE.has(shape.archetype) && <Cladding s={s} build={build} mat={mats.black} />}
      {build.wheels.map((w, i) => (
        <Wheel key={i} position={w} side={w.z > 0 ? 1 : -1} s={s} mats={mats} />
      ))}
      <Lights s={s} build={build} mats={mats} />
      <Grille s={s} build={build} mats={mats} paint={paintMat} />
      <Mirrors s={s} build={build} paint={paintMat} black={mats.black} />
      {s.exhausts > 0 && <Exhausts s={s} build={build} mats={mats} />}
      {s.spareWheel && <SpareWheel s={s} build={build} mats={mats} />}
      <Cabin s={s} build={build} mats={mats} seats={seats} label={label} accent={accent} />
    </group>
  );
}

type Mats = Record<string, THREE.Material>;

function Placed({ p, children }: { p: Placement | null; children: React.ReactNode }) {
  if (!p) return null;
  return (
    <group position={p.position} quaternion={p.quaternion}>
      {children}
    </group>
  );
}

function ArchLiners({ s, build, mat }: { s: ResolvedShape; build: CarBuild; mat: THREE.Material }) {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(build.archR - 0.004, build.archR - 0.004, s.W * 0.985, 40, 1, true, Math.PI / 2, Math.PI);
    g.rotateX(Math.PI / 2);
    return g;
  }, [s, build]);
  return (
    <>
      {[s.xFw, s.xRw].map((x) => (
        <mesh key={x} geometry={geo} material={mat} position={[x, s.wheelR, 0]} />
      ))}
    </>
  );
}

function Cladding({ s, build, mat }: { s: ResolvedShape; build: CarBuild; mat: THREE.Material }) {
  const flare = useMemo(() => new THREE.TorusGeometry(build.archR + 0.03, 0.045, 10, 48, Math.PI), [build]);
  const skirtLen = s.xFw - s.xRw - build.archR * 2 - 0.1;
  return (
    <>
      {[s.xFw, s.xRw].flatMap((x) =>
        [1, -1].map((side) => (
          <mesh
            key={`${x}${side}`}
            geometry={flare}
            material={mat}
            position={[x, s.wheelR, side * (build.bodyHalfWidthAt(x) * 0.975)]}
            scale={[1, 1, 0.55]}
          />
        )),
      )}
      {[1, -1].map((side) => (
        <RoundedBox
          key={side}
          args={[skirtLen, 0.09, 0.06]}
          radius={0.02}
          position={[(s.xFw + s.xRw) / 2, s.clearance + 0.06, side * (s.W / 2) * 0.955]}
          material={mat}
        />
      ))}
    </>
  );
}

function Wheel({ position, side, s, mats }: { position: THREE.Vector3; side: number; s: ResolvedShape; mats: Mats }) {
  const R = s.wheelR;
  const w = s.tireW;
  const rim = R * 0.66;
  const geos = useMemo(() => {
    const tyre = tyreGeometry(R, w);
    const barrel = new THREE.CylinderGeometry(rim, rim, w * 0.92, 40, 1, true);
    barrel.rotateX(Math.PI / 2);
    const lip = new THREE.TorusGeometry(rim - 0.008, 0.014, 8, 48);
    const hub = new THREE.CylinderGeometry(rim * 0.22, rim * 0.24, 0.05, 24);
    hub.rotateX(Math.PI / 2);
    const disc = new THREE.CylinderGeometry(rim * 0.82, rim * 0.82, 0.028, 40);
    disc.rotateX(Math.PI / 2);
    const spokeLen = rim * 0.78;
    const spoke = new THREE.BoxGeometry(0.035, spokeLen, 0.03);
    spoke.translate(0, rim * 0.2 + spokeLen / 2, 0);
    const caliper = new THREE.BoxGeometry(0.16, 0.07, 0.05);
    return { tyre, barrel, lip, hub, disc, spoke, caliper };
  }, [R, w, rim]);

  const n = s.spokes;
  const outer = w / 2 - 0.025;
  return (
    <group position={position} scale={[1, 1, side]}>
      <mesh geometry={geos.tyre} material={mats.tyre} />
      <mesh geometry={geos.barrel} material={mats.barrel} />
      <mesh geometry={geos.lip} material={mats.rim} position={[0, 0, outer]} />
      <mesh geometry={geos.hub} material={mats.rim} position={[0, 0, outer - 0.01]} />
      {Array.from({ length: n }, (_, i) => (
        <group key={i} rotation={[0, 0, (i / n) * Math.PI * 2]} position={[0, 0, outer - 0.012]}>
          <mesh geometry={geos.spoke} material={mats.rim} rotation={[n > 8 ? 0 : 0.12, 0, 0]} />
        </group>
      ))}
      <mesh geometry={geos.disc} material={mats.disc} position={[0, 0, outer - 0.09]} />
      <mesh
        geometry={geos.caliper}
        material={mats.caliper}
        position={[Math.cos(2.2) * rim * 0.72, Math.sin(2.2) * rim * 0.72, outer - 0.07]}
        rotation={[0, 0, 2.2 - Math.PI / 2]}
      />
    </group>
  );
}

function Lights({ s, build, mats }: { s: ResolvedShape; build: CarBuild; mats: Mats }) {
  const parts = useMemo(() => {
    const out: { p: Placement | null; kind: string; size: [number, number]; rot?: number }[] = [];
    const front = new THREE.Vector3(-1, -0.15, 0);
    const back = new THREE.Vector3(1, 0, 0);
    const yH = THREE.MathUtils.lerp(build.noseMidY, build.noseTopY, 0.25);
    const fx = s.xF + 1;
    const rx = s.xR - 1;

    for (const side of [1, -1]) {
      const z = side * s.W * 0.33;
      switch (s.headlight) {
        case "round": {
          const p = build.stick(new THREE.Vector3(fx, yH + 0.02, z), new THREE.Vector3(-1, -0.35, 0));
          out.push({ p, kind: "round", size: [0.085, 0] });
          break;
        }
        case "split": {
          for (let i = 0; i < 4; i++) {
            const zz = side * (s.W * 0.18 + i * 0.07);
            out.push({ p: build.stick(new THREE.Vector3(fx, build.noseTopY - 0.03, zz), front), kind: "bar", size: [0.075, 0.022] });
          }
          out.push({
            p: build.stick(new THREE.Vector3(fx, THREE.MathUtils.lerp(build.chinY, build.noseMidY, 0.75), side * s.W * 0.33), front),
            kind: "lamp",
            size: [0.2, 0.09],
          });
          break;
        }
        case "sharp": {
          for (let i = 0; i < 3; i++) {
            const zz = side * (s.W * 0.26 + i * 0.09);
            out.push({
              p: build.stick(new THREE.Vector3(fx, yH + i * 0.012, zz), front),
              kind: "bar",
              size: [0.1, 0.03],
              rot: side * 0.12,
            });
          }
          break;
        }
        default: {
          for (let i = 0; i < 4; i++) {
            const zz = side * (s.W * 0.2 + i * 0.075);
            out.push({ p: build.stick(new THREE.Vector3(fx, yH, zz), front), kind: "bar", size: [0.08, 0.024] });
          }
        }
      }
    }

    const yT = build.deckY - Math.min(0.09, (build.deckY - build.tailMidY) * 0.6) - 0.02;
    if (s.taillight === "bar") {
      const n = 13;
      for (let i = 0; i < n; i++) {
        const z = ((i / (n - 1)) * 2 - 1) * s.W * 0.42;
        out.push({ p: build.stick(new THREE.Vector3(rx, yT, z), back), kind: "tail", size: [0.075, 0.032] });
      }
    } else if (s.taillight === "pair") {
      for (const side of [1, -1])
        for (let i = 0; i < 3; i++) {
          const z = side * (s.W * 0.3 + i * 0.07);
          out.push({ p: build.stick(new THREE.Vector3(rx, yT, z), back), kind: "tail", size: [0.075, 0.05] });
        }
    } else {
      for (const side of [1, -1])
        for (let i = 0; i < 3; i++) {
          out.push({
            p: build.stick(new THREE.Vector3(rx, yT - i * 0.075, side * s.W * 0.42), back),
            kind: "tail",
            size: [0.07, 0.07],
          });
        }
    }
    return out;
  }, [s, build]);

  return (
    <>
      {parts.map((part, i) => (
        <Placed key={i} p={part.p}>
          {part.kind === "round" ? (
            <group>
              <mesh material={mats.headLens} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[part.size[0] + 0.02, part.size[0] + 0.02, 0.02, 32]} />
              </mesh>
              <mesh material={mats.head} position={[0, 0, 0.011]}>
                <torusGeometry args={[part.size[0] - 0.012, 0.009, 8, 40]} />
              </mesh>
              <mesh material={mats.head} position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[part.size[0] * 0.35, part.size[0] * 0.35, 0.01, 24]} />
              </mesh>
            </group>
          ) : part.kind === "lamp" ? (
            <RoundedBox args={[part.size[0], part.size[1], 0.03]} radius={0.012} material={mats.headLens}>
              <mesh material={mats.head} position={[0, 0, 0.016]}>
                <circleGeometry args={[0.025, 20]} />
              </mesh>
            </RoundedBox>
          ) : (
            <mesh material={part.kind === "tail" ? mats.tail : mats.head} rotation={[0, 0, part.rot ?? 0]}>
              <boxGeometry args={[part.size[0], part.size[1], 0.02]} />
            </mesh>
          )}
        </Placed>
      ))}
    </>
  );
}

function Grille({ s, build, mats, paint }: { s: ResolvedShape; build: CarBuild; mats: Mats; paint: THREE.Material }) {
  const p = useMemo(() => {
    const y = THREE.MathUtils.lerp(build.chinY, build.noseMidY, 0.55);
    return build.stick(new THREE.Vector3(s.xF + 1, y, 0), new THREE.Vector3(-1, 0, 0), 0.002);
  }, [s, build]);
  const intake = useMemo(() => {
    const y = THREE.MathUtils.lerp(build.chinY, build.noseMidY, 0.12) + 0.02;
    return build.stick(new THREE.Vector3(s.xF + 1, y, 0), new THREE.Vector3(-1, 0.1, 0), 0.002);
  }, [s, build]);
  const faceH = Math.max(0.06, build.noseMidY - build.chinY);

  return (
    <>
      <Placed p={intake}>
        <RoundedBox args={[s.W * 0.55, Math.min(0.08, faceH * 0.3), 0.02]} radius={0.008} material={mats.black} />
      </Placed>
      {s.grille !== "none" && (
        <Placed p={p}>
          {s.grille === "kidney" ? (
            [1, -1].map((side) => (
              <RoundedBox
                key={side}
                args={[0.2, Math.min(0.3, faceH * 0.8), 0.025]}
                radius={0.03}
                position={[side * 0.125, 0, 0]}
                material={mats.gloss}
              />
            ))
          ) : s.grille === "slots" ? (
            <group>
              <RoundedBox args={[s.W * 0.46, Math.min(0.32, faceH * 0.75), 0.02]} radius={0.015} material={mats.gloss} />
              {Array.from({ length: 9 }, (_, i) => (
                <mesh key={i} material={paint} position={[(i - 4) * s.W * 0.05, 0, 0.012]}>
                  <boxGeometry args={[0.022, Math.min(0.3, faceH * 0.7), 0.012]} />
                </mesh>
              ))}
            </group>
          ) : s.grille === "hex" ? (
            <mesh material={mats.gloss} rotation={[Math.PI / 2, Math.PI / 6, 0]} scale={[s.W * 0.3, 1, Math.min(0.11, faceH * 0.4)]}>
              <cylinderGeometry args={[1, 1, 0.02, 6]} />
            </mesh>
          ) : (
            <RoundedBox args={[s.W * 0.5, Math.min(0.2, faceH * 0.6), 0.022]} radius={0.03} material={mats.gloss}>
              {Array.from({ length: 4 }, (_, i) => (
                <mesh key={i} material={mats.chrome} position={[0, (i - 1.5) * Math.min(0.045, faceH * 0.14), 0.013]}>
                  <boxGeometry args={[s.W * 0.47, 0.006, 0.004]} />
                </mesh>
              ))}
            </RoundedBox>
          )}
        </Placed>
      )}
    </>
  );
}

function Mirrors({ s, build, paint, black }: { s: ResolvedShape; build: CarBuild; paint: THREE.Material; black: THREE.Material }) {
  const x = s.xA - 0.16;
  const y = build.beltY + 0.1;
  const hw = build.bodyHalfWidthAt(x) * 0.93;
  return (
    <>
      {[1, -1].map((side) => (
        <group key={side} position={[x, y, side * hw]}>
          <mesh material={black} position={[0, -0.03, side * 0.04]}>
            <boxGeometry args={[0.06, 0.03, 0.1]} />
          </mesh>
          <RoundedBox args={[0.11, 0.1, 0.19]} radius={0.04} position={[-0.02, 0, side * 0.15]} material={paint} />
        </group>
      ))}
    </>
  );
}

function Exhausts({ s, build, mats }: { s: ResolvedShape; build: CarBuild; mats: Mats }) {
  const tips = useMemo(() => {
    const n = s.exhausts;
    const y = s.clearance + 0.1;
    const out: Placement[] = [];
    const zs = n === 4 ? [-0.62, -0.5, 0.5, 0.62] : n === 2 ? [-0.25, 0.25] : [0.5];
    for (const zf of zs) {
      const p = build.stick(new THREE.Vector3(s.xR - 1, y, zf * s.W * 0.5 * 1.25), new THREE.Vector3(1, 0, 0), -0.02);
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
  const tyre = useMemo(() => tyreGeometry(s.wheelR * 0.95, s.tireW * 0.9), [s]);
  if (!p) return null;
  return (
    <group position={p.position}>
      <group position={[-s.tireW * 0.45, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh geometry={tyre} material={mats.tyre} />
        <mesh material={mats.gloss} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -s.tireW * 0.4]}>
          <cylinderGeometry args={[s.wheelR * 0.66, s.wheelR * 0.66, 0.04, 40]} />
        </mesh>
        <mesh material={mats.chrome} position={[0, 0, -s.tireW * 0.44]}>
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
  const dashX = Math.min(s.xA - 0.02, ex + 0.95);
  const dashBackX = ex + 0.55;
  const dashTop = build.beltY + 0.02;
  const dashLen = Math.max(0.2, dashX - dashBackX);
  const cabinLen = Math.max(0.6, s.xA - (s.xC + 0.25));

  const seat = (z: number, x: number, key: string) => (
    <group key={key} position={[x, hip, z]}>
      <RoundedBox args={[0.5, 0.12, 0.48]} radius={0.05} position={[0.08, 0, 0]} material={mats.leather} />
      <group position={[-0.17, 0.05, 0]} rotation={[0, 0, 0.22]}>
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
        <mesh key={sd} material={mats.trim} position={[(s.xA + s.xC) / 2 + 0.05, (floorY + dashTop) / 2 + 0.02, sd * innerHw]}>
          <boxGeometry args={[cabinLen + 0.2, dashTop - floorY + 0.04, 0.03]} />
        </mesh>
      ))}
      {/* headliner */}
      <mesh material={mats.trim} position={[(s.xRf + s.xRr) / 2, s.H - 0.07, 0]}>
        <boxGeometry args={[Math.max(0.3, s.xRf - s.xRr - 0.1), 0.015, innerHw * 1.7]} />
      </mesh>
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
      <group position={[ex + 0.46, ey - 0.3, ez]} rotation={[0, -Math.PI / 2, 0]}>
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
          <mesh material={mats.trimDark} position={[0, 0, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.03, 0.34, 12]} />
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
      {seats > 2 && (
        <group position={[ex - 0.95, hip + 0.02, 0]}>
          <RoundedBox args={[0.48, 0.12, innerHw * 1.8]} radius={0.05} material={mats.leather} />
          <group position={[-0.25, 0.05, 0]} rotation={[0, 0, 0.2]}>
            <RoundedBox args={[0.12, 0.6, innerHw * 1.8]} radius={0.05} position={[0, 0.3, 0]} material={mats.leather} />
          </group>
        </group>
      )}
    </group>
  );
}
