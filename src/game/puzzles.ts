/**
 * Fixed, solver-verified puzzles (metrics verified in tests).
 * Easy: misleading 10 — correct pairs stand out once you look at sums.
 * Hard: misleading 16 — several locally legal wrong turns.
 */

import type { Puzzle } from "./puzzle";

export const EASY_PUZZLE: Puzzle = {
  id: "fixed-easy-1",
  difficulty: "easy",
  fixedEdges: [
    { id: "AB", v: ["A", "B"], length: 104 },
    { id: "BC", v: ["B", "C"], length: 134 },
    { id: "CA", v: ["C", "A"], length: 50 },
  ],
  movableEdges: [
    { id: "e0", length: 29 },
    { id: "e1", length: 15 },
    { id: "e2", length: 154 },
    { id: "e3", length: 13 },
    { id: "e4", length: 54 },
    { id: "e5", length: 91 },
  ],
  pairSize: 2,
  apexLabels: ["X", "Y", "Z"],
  metadata: { source: "fixed" },
};

export const HARD_PUZZLE: Puzzle = {
  id: "fixed-hard-1",
  difficulty: "hard",
  fixedEdges: [
    { id: "AB", v: ["A", "B"], length: 71 },
    { id: "BC", v: ["B", "C"], length: 113 },
    { id: "CA", v: ["C", "A"], length: 100 },
  ],
  movableEdges: [
    { id: "e0", length: 13 },
    { id: "e1", length: 97 },
    { id: "e2", length: 15 },
    { id: "e3", length: 70 },
    { id: "e4", length: 18 },
    { id: "e5", length: 86 },
  ],
  pairSize: 2,
  apexLabels: ["X", "Y", "Z"],
  metadata: { source: "fixed" },
};
