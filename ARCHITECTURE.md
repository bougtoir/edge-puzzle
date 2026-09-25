# Architecture

## Layers

```
geometry/   pure math on length data          (triangle.ts, solver.ts)
game/       puzzle model, generator, reducer  (puzzle.ts, generator.ts, state.ts, puzzles.ts)
ui/         SVG rendering & interaction       (layout.ts, Board.tsx, Pool.tsx, App.tsx)
```

Hard boundaries:

- **geometry** knows lengths and local frames only. `solve()` takes a
  `DistanceSpec` (central lengths + movable lengths + pairSize) plus a
  legality predicate — it is already n-gon ready.
- **game** owns the data model (`Puzzle`): edges are `{id, length}` with
  vertex *labels*, never coordinates. Completion is decided by geometry +
  combinatorics (all groups legal, all edges used once), not by comparing
  against the stored solution ids.
- **ui** is the only place lengths become coordinates (`layout.ts`), via
  `embedTriangle` / `thirdVertexCandidates` / `outwardVertex`.

## Why asymmetric pairs

Near-symmetric movable pairs (a ≈ b ≈ 0.6c) satisfy |a−b| < c < a+b on
almost every edge, so random symmetric generation nearly always yields
many solutions. Making one edge long (~0.85–1.15·c) and one short
(~0.08–0.30·c) lets wrong combinations fail through the |a−b| side, which
is what produces unique solutions with controlled misleading counts.

## Extending to n-gons / rigid graphs (2D)

- `DistanceSpec.central` becomes the n boundary edges of the polygon;
  add diagonal constraints by increasing the required coverage per edge
  or by adding secondary fixed edges once two outer vertices share a
  prescribed distance (simple rigid-graph rule).
- The solver signature is unchanged: `central: number[]`,
  `movable: number[]`, `pairSize`; only `LegalFn` grows.

## 3D extension plan

From the triangle rule

```
existing edge AB  +  new edges AX, BX  ->  new vertex X
```

to the tetrahedron rule

```
existing face ABC +  new edges AD, BD, CD  ->  new vertex D -> tetrahedron ABCD
```

New modules alongside `triangle.ts`:

- `geometry/tetrahedron.ts` — given triangle ABC and lengths AD, BD, CD,
  solve the trilateration: intersect three spheres, yielding ≤ 2 real
  candidates (mirror across the plane ABC); pick the one outside the
  existing solid (signed volume / normal test).
- `geometry/cayleyMenger.ts` — Cayley–Menger determinant for tetrahedron
  volume: legality = volume > ε (analogue of triangle slack); also gives
  face-orientation consistency.
- `geometry/solver3d.ts` — same backtracking shape; `pairSize` becomes 3
  and `LegalFn` becomes "tetrahedron volume above threshold AND face
  orientations consistent".

New problems that do not exist in 2D:

- **face orientation (表裏)**: a face is only buildable on its outward side
  — the analogue of our outward-normal check, but now on planes.
- **outside test**: point outside a convex hull vs. arbitrary polyhedron.
- **self-intersection / collision**: new tetrahedra must not intersect
  existing geometry — a global constraint absent from 2D edge-fan puzzles.
- **global rigidity**: distance graphs in 3D admit flexible realisations
  (e.g. non-bipyramidal ambiguities); unique-solution checking must verify
  the *graph is rigid*, not merely satisfiable (Laman-type counting in 3D
  is only a necessary condition).

Rendering: keep SVG for 2D; a 3D version adds a projection layer
(orthographic + drag-to-rotate is enough for PoC; Three.js only if needed).

## Known PoC limitations

- Click-to-place only (drag & drop is a drop-in UI change; state and
  geometry are unaffected).
- Easy/Hard differ in misleading-count bands, not in mechanism.
- Generator is brute-force; fine at 6 edges, needs a smarter construction
  for larger graphs.
