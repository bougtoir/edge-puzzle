import { describe, expect, it } from "vitest";
import {
  embedTriangle,
  outwardVertex,
  thirdVertexCandidates,
  triangleInequality,
  triangleSlack,
} from "../geometry/triangle";
import { solve } from "../geometry/solver";
import { analyzePuzzle } from "../game/puzzle";
import { generatePuzzle } from "../game/generator";
import { EASY_PUZZLE, HARD_PUZZLE } from "../game/puzzles";
import { initialState, reducer } from "../game/state";

describe("geometry", () => {
  it("triangle inequality", () => {
    expect(triangleInequality(3, 4, 5)).toBe(true);
    expect(triangleInequality(1, 1, 3)).toBe(false);
    expect(triangleInequality(1, 1, 2)).toBe(false); // degenerate
    expect(triangleInequality(5, 2, 3)).toBe(false);
  });

  it("reconstructs vertex coordinates exactly from lengths", () => {
    // 3-4-5 triangle: A=(0,0), B=(5,0), AX=4? use a=4,b=3,c=5 -> X=(3.2, 2.4)
    const cand = thirdVertexCandidates({ x: 0, y: 0 }, { x: 5, y: 0 }, 4, 3)!;
    expect(cand[0].x).toBeCloseTo(3.2);
    expect(Math.abs(cand[0].y)).toBeCloseTo(2.4);
    expect(Math.abs(cand[0].y)).toBeCloseTo(Math.abs(cand[1].y));
  });

  it("rejects illegal triangles", () => {
    expect(thirdVertexCandidates({ x: 0, y: 0 }, { x: 10, y: 0 }, 2, 3)).toBeNull();
    expect(embedTriangle(1, 1, 5)).toBeNull();
  });

  it("picks the outward (non-centroid) mirror candidate", () => {
    const A = { x: 0, y: 0 }, B = { x: 4, y: 0 }, C = { x: 1, y: 3 };
    const ctr = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
    const cand = thirdVertexCandidates(A, B, 3, 3)!;
    const out = outwardVertex(cand, A, B, ctr);
    expect(out.y).toBeLessThan(0); // centroid is above AB
  });
});

describe("solver", () => {
  const legal = (c: number, p: number[]) => triangleInequality(p[0], p[1], c);

  it("counts 0 solutions when no assignment works", () => {
    const m = solve({ central: [10, 10, 10], movable: [1, 1, 1, 1, 1, 1], pairSize: 2 }, legal);
    expect(m.solutionCount).toBe(0);
  });

  it("counts 1 solution", () => {
    // craft: pair (90,20) legal on 100 only-ish; verify via solver on the fixed easy puzzle
    const m = analyzePuzzle(EASY_PUZZLE);
    expect(m.solutionCount).toBe(1);
  });

  it("counts multiple solutions", () => {
    const m = solve(
      { central: [100, 100, 100], movable: [60, 60, 60, 60, 60, 60], pairSize: 2 },
      legal,
    );
    expect(m.solutionCount).toBeGreaterThan(1);
  });

  it("every solution uses each movable edge exactly once", () => {
    const m = analyzePuzzle(HARD_PUZZLE);
    for (const s of m.solutions) {
      const all = s.groups.flat().sort();
      expect(all).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });
});

describe("fixed puzzles", () => {
  it("easy has a unique solution and few misleading", () => {
    const m = analyzePuzzle(EASY_PUZZLE);
    expect(m.solutionCount).toBe(1);
    expect(m.misleadingPlacements).toBeLessThanOrEqual(11);
  });
  it("hard has a unique solution and multiple misleading placements", () => {
    const m = analyzePuzzle(HARD_PUZZLE);
    expect(m.solutionCount).toBe(1);
    expect(m.misleadingPlacements).toBeGreaterThanOrEqual(4);
  });
  it("central edges are non-degenerate", () => {
    for (const p of [EASY_PUZZLE, HARD_PUZZLE]) {
      const [a, b, c] = p.fixedEdges.map((e) => e.length);
      expect(triangleInequality(a, b, c)).toBe(true);
      expect(triangleSlack(a, b, c)).toBeGreaterThan(4);
    }
  });
});

describe("generator", () => {
  it("produces unique-solution puzzles with no degenerate central triangle", () => {
    for (const seed of [1, 2, 3]) {
      const p = generatePuzzle("hard", { seed, maxAttempts: 5000 });
      const m = analyzePuzzle(p);
      expect(m.solutionCount).toBe(1);
      const [a, b, c] = p.fixedEdges.map((e) => e.length);
      expect(triangleSlack(a, b, c)).toBeGreaterThan(0);
    }
  });
  it("generates easy puzzles within misleading bounds", () => {
    const p = generatePuzzle("easy", { seed: 4, maxAttempts: 5000 });
    expect(analyzePuzzle(p).solutionCount).toBe(1);
    expect(p.metadata.metrics!.misleadingPlacements).toBeLessThanOrEqual(11);
  });
});

describe("game state", () => {
  const ids = EASY_PUZZLE.movableEdges.map((e) => e.id);
  // find the true solution grouping once
  const sol = analyzePuzzle(EASY_PUZZLE).solutions[0].groups;

  it("places two edges and completes a side when legal", () => {
    let s = initialState(EASY_PUZZLE);
    s = reducer(s, { type: "place", movableId: ids[sol[0][0]], fixedEdgeIndex: 0 });
    expect(s.completed[0]).toBe(false);
    s = reducer(s, { type: "place", movableId: ids[sol[0][1]], fixedEdgeIndex: 0 });
    expect(s.completed[0]).toBe(true);
    expect(s.placements.length).toBe(2);
  });

  it("rejects an illegal pair and counts an invalid attempt", () => {
    let s = initialState(EASY_PUZZLE);
    // e3 (13) + e1 (15) on edge 0 (104): 13+15 < 104 -> illegal
    s = reducer(s, { type: "place", movableId: "e3", fixedEdgeIndex: 0 });
    s = reducer(s, { type: "place", movableId: "e1", fixedEdgeIndex: 0 });
    expect(s.completed[0]).toBe(false);
    expect(s.stats.invalidAttempts).toBe(1);
    expect(s.placements.length).toBe(1); // only e3 remains, e1 bounced back
  });

  it("undo returns the last placement", () => {
    let s = initialState(EASY_PUZZLE);
    s = reducer(s, { type: "place", movableId: ids[sol[0][0]], fixedEdgeIndex: 0 });
    s = reducer(s, { type: "undo" });
    expect(s.placements.length).toBe(0);
    expect(s.stats.undos).toBe(1);
  });

  it("undo unlocks a completed edge", () => {
    let s = initialState(EASY_PUZZLE);
    s = reducer(s, { type: "place", movableId: ids[sol[0][0]], fixedEdgeIndex: 0 });
    s = reducer(s, { type: "place", movableId: ids[sol[0][1]], fixedEdgeIndex: 0 });
    s = reducer(s, { type: "undo" });
    expect(s.completed[0]).toBe(false);
    expect(s.placements.length).toBe(1);
  });

  it("reset clears everything", () => {
    let s = initialState(EASY_PUZZLE);
    s = reducer(s, { type: "place", movableId: ids[sol[0][0]], fixedEdgeIndex: 0 });
    s = reducer(s, { type: "reset" });
    expect(s.placements.length).toBe(0);
    expect(s.stats.moves).toBe(0);
  });

  it("completes the puzzle via the true solution (geometric legality, not id match)", () => {
    let s = initialState(EASY_PUZZLE);
    for (let e = 0; e < 3; e++) {
      for (const j of sol[e]) {
        s = reducer(s, { type: "place", movableId: ids[j], fixedEdgeIndex: e });
      }
    }
    expect(s.done).toBe(true);
    expect(s.placements.length).toBe(6);
  });
});
