/**
 * Combinatorial solver / validator.
 * Geometry-free with respect to placement: it works on a DistanceSpec —
 * central edges (fixed lengths) each requiring `pairSize` movable edges —
 * so the same shape extends to n-gons and 3D constraints later.
 */

export interface DistanceSpec {
  /** fixed edge lengths, one per slot-group */
  central: number[];
  /** movable edge lengths; must be used exactly once */
  movable: number[];
  /** how many movable edges each central edge takes (2 for triangles) */
  pairSize: number;
}

/** legality predicate: (fixedEdgeLength, assignedMovableLengths) -> legal */
export type LegalFn = (central: number, parts: number[]) => boolean;

export interface Solution {
  /** groups[i] = indices into movable[] assigned to central[i] */
  groups: number[][];
}

export interface SolveMetrics {
  solutionCount: number;
  solutions: Solution[];
  /** number of unordered movable-edge subsets of size pairSize that are
   *  legal on at least one central edge */
  legalLocalPairs: number;
  /** (subset, centralEdge) combos that are locally legal but appear in no
   *  valid global solution — the misleading placements */
  misleadingPlacements: number;
  /** nodes visited during backtracking search */
  searchNodes: number;
}

export function solve(spec: DistanceSpec, legal: LegalFn): SolveMetrics {
  const { central, movable, pairSize } = spec;
  const n = movable.length;
  const used = new Array<boolean>(n).fill(false);
  const solutions: Solution[] = [];
  let searchNodes = 0;

  // Precompute legality of every unordered movable subset per central edge.
  const subsetLegal: Map<string, boolean>[] = central.map((c) => {
    const map = new Map<string, boolean>();
    const rec = (start: number, acc: number[]) => {
      if (acc.length === pairSize) {
        map.set(
          acc.join(","),
          legal(
            c,
            acc.map((i) => movable[i]),
          ),
        );
        return;
      }
      for (let i = start; i < n; i++) {
        acc.push(i);
        rec(i + 1, acc);
        acc.pop();
      }
    };
    rec(0, []);
    return map;
  });

  // Count (subset, edge) legal combos once per unique subset.
  const counted = new Set<string>();
  let legalLocalPairs = 0;
  for (const m of subsetLegal) {
    for (const [key, ok] of m) {
      if (ok && !counted.has(key)) {
        counted.add(key);
        legalLocalPairs++;
      }
    }
  }

  const current: number[][] = [];

  // Enumerate legal subsets of unused indices for a given central edge.
  function collectSubsets(edgeIdx: number, start: number, acc: number[], out: number[][]) {
    if (acc.length === pairSize) {
      const sorted = [...acc].sort((x, y) => x - y);
      if (subsetLegal[edgeIdx].get(sorted.join(","))) out.push(sorted);
      return;
    }
    for (let i = start; i < n; i++) {
      if (used[i]) continue;
      acc.push(i);
      collectSubsets(edgeIdx, i + 1, acc, out);
      acc.pop();
    }
  }

  function placeNext(edgeIdx: number) {
    if (edgeIdx === central.length) {
      solutions.push({ groups: current.map((g) => [...g]) });
      return;
    }
    const edgeGroups: number[][] = [];
    collectSubsets(edgeIdx, 0, [], edgeGroups);
    for (const group of edgeGroups) {
      searchNodes++;
      for (const i of group) used[i] = true;
      current.push(group);
      placeNext(edgeIdx + 1);
      current.pop();
      for (const i of group) used[i] = false;
    }
  }

  placeNext(0);

  // misleading = (subset, edge) legal combos absent from every valid solution.
  const solutionKeys = new Set<string>();
  for (const s of solutions) {
    for (let e = 0; e < s.groups.length; e++) {
      solutionKeys.add(e + ":" + s.groups[e].join(","));
    }
  }
  let misleading = 0;
  for (let e = 0; e < central.length; e++) {
    for (const [key, ok] of subsetLegal[e]) {
      if (ok && !solutionKeys.has(e + ":" + key)) misleading++;
    }
  }

  return {
    solutionCount: solutions.length,
    solutions,
    legalLocalPairs,
    misleadingPlacements: misleading,
    searchNodes,
  };
}
