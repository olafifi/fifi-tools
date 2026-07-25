type Point = { x: number; y: number };

export type ZipperGeometry = {
  lowerPath: string;
  cavityPath: string;
  clipPath: string;
  pullLeft: number;
  pullTop: number;
  pullAngle: number;
};

const P0 = { x: 52, y: 510 };
const P1 = { x: 160, y: 356 };
const P2 = { x: 390, y: 198 };
const P3 = { x: 660, y: 240 };
const LOWER_C1 = { x: 230, y: 548 };
const LOWER_C2 = { x: 474, y: 548 };
const LOWER_END = { x: 705, y: 548 };

const mix = (a: number, b: number, value: number) => a + (b - a) * value;
const pointMix = (a: Point, b: Point, value: number): Point => ({
  x: mix(a.x, b.x, value),
  y: mix(a.y, b.y, value)
});
const pointText = (point: Point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;

function splitUpper(value: number) {
  const a = pointMix(P0, P1, value);
  const b = pointMix(P1, P2, value);
  const c = pointMix(P2, P3, value);
  const d = pointMix(a, b, value);
  const e = pointMix(b, c, value);
  const q = pointMix(d, e, value);
  return { a, d, q, tangent: { x: e.x - d.x, y: e.y - d.y } };
}

export function buildZipperGeometry(rawProgress: number): ZipperGeometry {
  const progress = Math.max(0, Math.min(1, rawProgress));
  const split = splitUpper(1 - progress);
  const end = pointMix(P3, LOWER_END, progress);
  const c1 = {
    x: split.q.x + (LOWER_C1.x - P0.x) * progress,
    y: split.q.y + (LOWER_C1.y - P0.y) * progress
  };
  const c2 = pointMix(P3, LOWER_C2, progress);
  const lowerPath = `M${pointText(P0)} C${pointText(split.a)} ${pointText(split.d)} ${pointText(split.q)} C${pointText(c1)} ${pointText(c2)} ${pointText(end)}`;
  const cavityPath = `M${pointText(P0)} C${pointText(P1)} ${pointText(P2)} ${pointText(P3)} L${pointText(end)} C${pointText(c2)} ${pointText(c1)} ${pointText(split.q)} C${pointText(split.d)} ${pointText(split.a)} ${pointText(P0)} Z`;
  const pullAngle = Math.atan2(split.tangent.y, split.tangent.x) * 180 / Math.PI + 10;

  return {
    lowerPath,
    cavityPath,
    clipPath: cavityPath,
    pullLeft: split.q.x - 24,
    pullTop: split.q.y - 22,
    pullAngle
  };
}
