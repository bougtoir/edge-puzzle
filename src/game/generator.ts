/**
 * Random puzzle generator.
 *
 * Both difficulties use *asymmetric* pairs (a long movable edge ~0.85–1.15×c
 * plus a short one ~0.08–0.30×c): near-symmetric pairs are legal on every
 * smaller central edge, which produces dozens of equivalent solutions —
 * asymmetry is what makes wrong combinations fail and a unique solution
 * possible at all.
 *
 * Difficulty is then separated by the solver-verified metric
 * `misleadingPlacements` (legal (pair,edge) combos that appear in no
 * solution): Easy ≤ 11, Hard ≥ 13. Every candidate is validated by the
 * full solver; only solutionCount == 1 instances are returned.
 */

import { triangleInequality, triangleSlack } from "../geometry/triangle";
import { analyzePuzzle } from "./puzzle";
import type { Difficulty, Puzzle } from "./puzzle";

export interface GenParams {
  minLen: number;
  maxLen: number;
  /** fraction ranges for the long / short member of each pair */
  longFrac: [number, number];
  shortFrac: [number, number];
  /** min slack fraction of the central triangle itself */
  centralSlackFrac: number;
  /** separated bands for the three central edge lengths */
  centralBands: [number, number][];
  minMisleading: number;
  maxMisleading: number;
}

export const EASY_PARAMS: GenParams = {
  minLen: 12,
  maxLen: 160,
  longFrac: [0.85, 1.15],
  shortFrac: [0.08, 0.3],
  centralSlackFrac: 0.08,
  centralBands: [
    [45, 75],
    [80, 105],
    [110, 140],
  ],
  minMisleading: 0,
  maxMisleading: 11,
};

export const HARD_PARAMS: GenParams = {
  minLen: 12,
  maxLen: 160,
  longFrac: [0.85, 1.15],
  shortFrac: [0.08, 0.3],
  centralSlackFrac: 0.08,
  centralBands: [
    [45, 75],
    [80, 105],
    [110, 140],
  ],
  minMisleading: 13,
  maxMisleading: 99,
};

// deterministic RNG so generated puzzles are reproducible in tests
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = (rng: () => number, lo: number, hi: number) => lo + rng() * (hi - lo);
const randInt = (rng: () => number, lo: number, hi: number) =>
  Math.round(rand(rng, lo, hi));

function shuffle<T>(rng: () => number, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function genCentral(rng: () => number, p: GenParams): number[] | null {
  const c = p.centralBands.map(([lo, hi]) => randInt(rng, lo, hi)).sort((x, y) => x - y);
  if (!triangleInequality(c[0], c[1], c[2])) return null;
  if (triangleSlack(c[0], c[1], c[2]) < p.centralSlackFrac * c[2]) return null;
  return c;
}

function genPair(rng: () => number, c: number, p: GenParams): [number, number] | null {
  for (let t = 0; t < 30; t++) {
    const a = Math.round(c * rand(rng, p.longFrac[0], p.longFrac[1]));
    const b = Math.round(c * rand(rng, p.shortFrac[0], p.shortFrac[1]));
    if (a < p.minLen || b < p.minLen || a > p.maxLen || b > p.maxLen) continue;
    if (!triangleInequality(a, b, c)) continue;
    return a >= b ? [a, b] : [b, a];
  }
  return null;
}

export interface GenerateOptions {
  seed?: number;
  params?: GenParams;
  maxAttempts?: number;
}

export function generatePuzzle(difficulty: Difficulty, opts: GenerateOptions = {}): Puzzle {
  const p = opts.params ?? (difficulty === "easy" ? EASY_PARAMS : HARD_PARAMS);
  const maxAttempts = opts.maxAttempts ?? 5000;
  const rng = mulberry32(opts.seed ?? Math.floor(Math.random() * 2 ** 32));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const sorted = genCentral(rng, p);
    if (!sorted) continue;

    // assign sorted central edges to labels AB/BC/CA in a random order
    const order = shuffle(rng, [0, 1, 2]);
    const edgeLens = [sorted[order[0]], sorted[order[1]], sorted[order[2]]];

    const movable: number[] = [];
    let ok = true;
    for (const c of edgeLens) {
      const pair = genPair(rng, c, p);
      if (!pair) {
        ok = false;
        break;
      }
      movable.push(pair[0], pair[1]);
    }
    if (!ok) continue;

    const puzzle: Puzzle = {
      id: `gen-${difficulty}-${attempt}`,
      difficulty,
      fixedEdges: [
        { id: "AB", v: ["A", "B"], length: edgeLens[0] },
        { id: "BC", v: ["B", "C"], length: edgeLens[1] },
        { id: "CA", v: ["C", "A"], length: edgeLens[2] },
      ],
      movableEdges: shuffle(rng, movable).map((l, i) => ({ id: `e${i}`, length: l })),
      pairSize: 2,
      apexLabels: ["X", "Y", "Z"],
      metadata: { source: "generated" },
    };

    const metrics = analyzePuzzle(puzzle);
    if (metrics.solutionCount !== 1) continue;
    if (
      metrics.misleadingPlacements < p.minMisleading ||
      metrics.misleadingPlacements > p.maxMisleading
    ) {
      continue;
    }
    puzzle.metadata.metrics = metrics;
    return puzzle;
  }
  throw new Error(
    `failed to generate a unique-solution ${difficulty} puzzle in ${maxAttempts} attempts`,
  );
}
