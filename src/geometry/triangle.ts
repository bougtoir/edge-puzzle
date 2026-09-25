/**
 * Core 2D triangle geometry.
 * Pure math, no UI dependencies. Coordinates are derived exactly from
 * edge lengths (law of cosines), never approximated by hand-tuned drawing.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export const EPS = 1e-9;

/** Strict triangle inequality: |a-b| < c < a+b (and symmetric). */
export function triangleInequality(a: number, b: number, c: number, eps = EPS): boolean {
  return a + b > c + eps && a + c > b + eps && b + c > a + eps;
}

/** Slack of the triangle inequality: min amount each side is inside its bound.
 *  Positive => non-degenerate; near zero => almost degenerate. */
export function triangleSlack(a: number, b: number, c: number): number {
  return Math.min(a + b - c, a + c - b, b + c - a);
}

/**
 * Third vertex of a triangle with sides (a, b, c) where edge c runs from
 * p1 to p2, a is the distance from p1, b from p2.
 * Local frame: p1=(0,0), p2=(c,0).
 *   x = (a^2 - b^2 + c^2) / (2c)
 *   y = sqrt(a^2 - x^2)
 * Returns both mirror candidates (above/below the edge), or null if the
 * triple is not a valid (non-degenerate) triangle.
 */
export function thirdVertexCandidates(
  p1: Vec2,
  p2: Vec2,
  a: number,
  b: number,
): [Vec2, Vec2] | null {
  const c = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (c < EPS) return null;
  if (!triangleInequality(a, b, c)) return null;
  const x = (a * a - b * b + c * c) / (2 * c);
  const y2 = a * a - x * x;
  const y = Math.sqrt(Math.max(0, y2));
  // rotate local frame to world: u = unit(p2-p1), n = perp(u)
  const ux = (p2.x - p1.x) / c;
  const uy = (p2.y - p1.y) / c;
  const nx = -uy;
  const ny = ux;
  return [
    { x: p1.x + ux * x + nx * y, y: p1.y + uy * x + ny * y },
    { x: p1.x + ux * x - nx * y, y: p1.y + uy * x - ny * y },
  ];
}

/**
 * Choose the candidate lying on the opposite side of edge (p1->p2) from
 * `inside` (a point inside the existing body, e.g. triangle centroid).
 */
export function outwardVertex(
  candidates: [Vec2, Vec2],
  p1: Vec2,
  p2: Vec2,
  inside: Vec2,
): Vec2 {
  const cross = (p: Vec2) =>
    (p2.x - p1.x) * (p.y - p1.y) - (p2.y - p1.y) * (p.x - p1.x);
  const insideSide = Math.sign(cross(inside)) || 1;
  return Math.sign(cross(candidates[0])) === -insideSide ? candidates[0] : candidates[1];
}

export function centroid(points: Vec2[]): Vec2 {
  const n = points.length;
  return {
    x: points.reduce((s, p) => s + p.x, 0) / n,
    y: points.reduce((s, p) => s + p.y, 0) / n,
  };
}

/**
 * Embed a triangle defined by three edge lengths into 2D.
 * Returns coordinates for vertices [0,1,2] opposite edges [e01, e12, e20]
 * supplied as lengths {e01, e12, e20}, or null if degenerate.
 */
export function embedTriangle(e01: number, e12: number, e20: number): [Vec2, Vec2, Vec2] | null {
  if (!triangleInequality(e01, e12, e20)) return null;
  const A: Vec2 = { x: 0, y: 0 };
  const B: Vec2 = { x: e01, y: 0 };
  const cand = thirdVertexCandidates(A, B, e20, e12);
  if (!cand) return null;
  return [A, B, cand[0]];
}
