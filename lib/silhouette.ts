import { resolveShape } from "./carShapes";
import type { Car } from "./types";

/**
 * Side-elevation outline for the blueprint drawing, derived from the same
 * parametric shape the 3D generator uses. Units: metres; SVG y grows downward,
 * the car faces right (rear at x = 0).
 */
export function silhouette(car: Car) {
  const s = resolveShape(car.dimensions, car.shape);
  const { L, H, xF, xR, xFw, xRw, xA, xRf, xRr, xC } = s;
  const R = s.wheelR;
  const cl = s.clearance;
  const aR = R + 0.035;
  const noseTop = s.noseY * H;
  const noseRun = Math.max(0.05, s.noseRun * L);
  const noseMid = Math.max(cl + 0.12, noseTop - Math.max(noseRun, 0.06) * 0.9);
  const hood = s.hoodY * H;
  const belt = s.beltRearY * H;
  const deck = s.deckY * H;
  const tailMid = Math.min(s.tailMidY * H, deck - 0.04);
  const tailRun = Math.max(0.03, Math.min(0.02 * L, (xC - xR) * 0.5));

  const X = (x: number) => +(x - xR).toFixed(3);
  const Y = (y: number) => +(H - y).toFixed(3);

  const body = [
    `M ${X(xR + 0.12)} ${Y(cl)}`,
    `L ${X(xRw - aR)} ${Y(cl)}`,
    `L ${X(xRw - aR)} ${Y(R)}`,
    `A ${aR} ${aR} 0 0 1 ${X(xRw + aR)} ${Y(R)}`,
    `L ${X(xRw + aR)} ${Y(cl)}`,
    `L ${X(xFw - aR)} ${Y(cl)}`,
    `L ${X(xFw - aR)} ${Y(R)}`,
    `A ${aR} ${aR} 0 0 1 ${X(xFw + aR)} ${Y(R)}`,
    `L ${X(xFw + aR)} ${Y(cl)}`,
    `L ${X(xF - 0.14)} ${Y(cl)}`,
    `Q ${X(xF)} ${Y(cl)} ${X(xF)} ${Y(noseMid)}`,
    `Q ${X(xF)} ${Y(noseTop)} ${X(xF - noseRun)} ${Y(noseTop)}`,
    `L ${X(xA)} ${Y(hood)}`,
    `Q ${X(xRf + (xA - xRf) * 0.1)} ${Y(H)} ${X(xRf)} ${Y(H)}`,
    `L ${X(xRr)} ${Y(H)}`,
    `Q ${X(xRr - (xRr - xC) * 0.15)} ${Y(H)} ${X(xC)} ${Y(belt)}`,
    `L ${X(xR + tailRun)} ${Y(deck)}`,
    `Q ${X(xR)} ${Y(deck)} ${X(xR)} ${Y(tailMid)}`,
    `L ${X(xR)} ${Y(cl + 0.12)}`,
    `Q ${X(xR)} ${Y(cl)} ${X(xR + 0.12)} ${Y(cl)}`,
    "Z",
  ].join(" ");

  const glass = [
    `M ${X(xA + 0.05)} ${Y(hood + 0.04)}`,
    `L ${X(xRf - 0.02)} ${Y(H - 0.05)}`,
    `L ${X(xRr + 0.02)} ${Y(H - 0.05)}`,
    `L ${X(xC - 0.06)} ${Y(belt + 0.04)}`,
    "Z",
  ].join(" ");

  return {
    L,
    H,
    body,
    glass,
    wheels: [
      { cx: X(xRw), cy: Y(R), r: R },
      { cx: X(xFw), cy: Y(R), r: R },
    ],
    wheelbase: { x1: X(xRw), x2: X(xFw) },
  };
}
