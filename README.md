# Edge Puzzle

A browser puzzle game PoC: **reconstruct a geometric figure from a multiset of edge lengths**.

A fixed central triangle ABC sits in the middle. Six extra edges are given;
each of the three central edges (AB, BC, CA) takes two of them to build an
outer triangle (ABX, BCY, CAZ) on its outside. Locally-legal placements that
still lead to a dead end are allowed — finding the single globally-consistent
assignment is the puzzle.

## Setup / run

```bash
npm install
npm run dev      # dev server
npm test         # vitest: geometry / solver / generator / state
npm run build    # production build -> dist/
```

## Rules

- Central triangle edges AB, BC, CA are fixed on screen.
- You get 6 movable edges. Place exactly 2 on each central edge.
- A pair (a, b) on edge c is **legal** iff |a−b| < c < a+b (strict triangle
  inequality). The second edge completing a pair is checked immediately:
  illegal pairs are rejected with a red flash; legal-but-wrong pairs are
  **kept** — backtracking is the game.
- Click/tap a pool edge, then click a slot zone (dashed wedge outside a
  central edge). Click a placed chip to return it to the pool.
- Undo reverts the last placement (unlocking a completed side if needed);
  Reset restarts the puzzle.
- Complete when all 3 outer triangles are built and all 6 edges are used.

## Modes

- **Practice** — untimed, Easy or Hard.
- **Time Attack** — timer starts on Start; `XX.XX s` shown on completion;
  best time per difficulty stored in `localStorage`.
- **Show lengths** ON/OFF — numeric labels vs. pure visual/spatial play.
- **Puzzle source** — Fixed (hand-verified Easy/Hard) or Random (generator).

## Puzzle model

Data-driven; no coordinates in the model — only edges with lengths:

```
Puzzle { fixedEdges: [{id, v:[l1,l2], length}],
         movableEdges: [{id, length}],
         pairSize, apexLabels, metadata }
```

## Generation & uniqueness

`src/game/generator.ts` builds a candidate (central triangle + an intended
asymmetric pair per edge: a long edge ≈0.85–1.15·c and a short one
≈0.08–0.30·c — asymmetry is what makes wrong combinations *fail*, since
near-symmetric pairs are legal on almost every edge), shuffles the 6 movable
edges, then runs `src/geometry/solver.ts`: exhaustive backtracking over all
labeled assignments (≤ 6!/(2!·2!·2!) = 90 partitions). An instance is used
only if `solutionCount === 1`.

Difficulty metrics per puzzle (also shown with `?debug=1`):
`solutionCount`, `legalLocalPairs`, `misleadingPlacements` (legal
(pair,edge) combos belonging to no solution — Easy ≤ 11, Hard ≥ 13),
`searchNodes`.

## Geometry

For edge p1p2 (length c) with movable lengths a (from p1), b (from p2):

```
x = (a² − b² + c²) / (2c),  y = √(a² − x²)
```

gives both mirror candidates in the edge's local frame; the candidate on the
opposite side of the central centroid is kept (new vertex always outside).
A small epsilon guards floating-point comparisons.

## Directory structure

```
src/geometry/triangle.ts   inequality, vertex reconstruction, outward pick
src/geometry/solver.ts     exhaustive unique-solution validator + metrics
src/game/puzzle.ts         data model, legality predicate, analyze
src/game/generator.ts      random unique-solution generator
src/game/puzzles.ts        verified fixed Easy/Hard instances
src/game/state.ts          reducer: place/unplace/undo/reset/complete
src/ui/layout.ts           edge lengths -> SVG world coordinates
src/ui/Board.tsx           SVG board (slots, outer triangles, chips)
src/ui/Pool.tsx            movable-edge pool
src/App.tsx                screens, modes, timer, stats, debug panel
src/test/game.test.ts      vitest suite
```

## Debug

Append `?debug=1` to the URL: edge ids, the solution mapping, solution
count, legal-pair count, misleading count and search nodes are displayed.

## 3D extension

See [ARCHITECTURE.md](ARCHITECTURE.md).
