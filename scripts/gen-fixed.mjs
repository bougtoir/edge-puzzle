// Print verified fixed-puzzle candidates for hardcoding into puzzles.ts
import { generatePuzzle } from "../src/game/generator.ts";
import { analyzePuzzle } from "../src/game/puzzle.ts";

for (const diff of ["easy", "hard"]) {
  const p = generatePuzzle(diff, { seed: diff === "easy" ? 7 : 42 });
  const m = analyzePuzzle(p);
  console.log(diff, JSON.stringify({
    central: p.fixedEdges.map(e => e.length),
    movable: p.movableEdges.map(e => e.length),
    metrics: {
      solutions: m.solutionCount,
      legalLocalPairs: m.legalLocalPairs,
      misleading: m.misleadingPlacements,
      nodes: m.searchNodes,
    },
    solutionGroups: m.solutions[0].groups,
  }));
}
