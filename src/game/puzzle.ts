/**
 * Data-driven puzzle model.
 * Everything is edges with lengths; no 2D coordinates live in the model,
 * so the same structures extend to n-gons, rigid graphs and 3D
 * distance-constraint graphs (vertex i, vertex j, distance d_ij).
 */

import { solve } from "../geometry/solver";
import type { DistanceSpec, LegalFn, SolveMetrics } from "../geometry/solver";
import { triangleInequality } from "../geometry/triangle";

export type Difficulty = "easy" | "hard";

export interface FixedEdge {
  /** e.g. "AB" — central triangle edge */
  id: string;
  /** vertex labels, for display + future graph generalisation */
  v: [string, string];
  length: number;
}

export interface MovableEdge {
  id: string;
  length: number;
}

export interface Puzzle {
  id: string;
  difficulty: Difficulty;
  /** central triangle (always 3 edges in this PoC) */
  fixedEdges: FixedEdge[];
  /** pool of placeable edges */
  movableEdges: MovableEdge[];
  /** movable edges per fixed edge (2 for triangles) */
  pairSize: number;
  /** labels for the outer apexes produced per fixed edge (X, Y, Z) */
  apexLabels: string[];
  metadata: {
    source: "fixed" | "generated";
    metrics?: SolveMetrics;
  };
}

export function toSpec(p: Puzzle): DistanceSpec {
  return {
    central: p.fixedEdges.map((e) => e.length),
    movable: p.movableEdges.map((e) => e.length),
    pairSize: p.pairSize,
  };
}

export const triangleLegal: LegalFn = (central, parts) =>
  parts.length === 2 && triangleInequality(parts[0], parts[1], central);

/** Validate the puzzle: count solutions & compute difficulty metrics. */
export function analyzePuzzle(p: Puzzle): SolveMetrics {
  return solve(toSpec(p), triangleLegal);
}
