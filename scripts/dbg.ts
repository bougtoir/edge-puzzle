import { mulberry32 } from "../src/game/generator";
import { triangleInequality, triangleSlack } from "../src/geometry/triangle";
import { solve } from "../src/geometry/solver";

// asymmetric pairs: a in [0.55..0.9]c, b in [0.2..0.45]c
function scan(name: string, iters: number, bands: number[][], uA: number[], uB: number[]) {
  const rng = mulberry32(11);
  const ri = (l: number, h: number) => Math.round(l + rng() * (h - l));
  const rf = (l: number, h: number) => l + rng() * (h - l);
  let uniq = 0, total = 0, best = 99;
  let bestG: any = null;
  const mis: Record<number, number> = {};
  for (let t = 0; t < iters; t++) {
    const c = [ri(bands[0][0], bands[0][1]), ri(bands[1][0], bands[1][1]), ri(bands[2][0], bands[2][1])].sort((a, b) => a - b);
    if (!triangleInequality(c[0], c[1], c[2])) continue;
    if (triangleSlack(c[0], c[1], c[2]) < 0.08 * c[2]) continue;
    const mv: number[] = [];
    let bad = false;
    for (const cc of c) {
      const a = Math.round(cc * rf(uA[0], uA[1]));
      const b = Math.round(cc * rf(uB[0], uB[1]));
      if (!triangleInequality(a, b, cc)) { bad = true; break; }
      mv.push(a, b);
    }
    if (bad) continue;
    total++;
    const m = solve({ central: c, movable: mv, pairSize: 2 },
      (cen, pp) => triangleInequality(pp[0], pp[1], cen));
    if (m.solutionCount === 1) {
      uniq++;
      mis[m.misleadingPlacements] = (mis[m.misleadingPlacements] || 0) + 1;
      if (m.misleadingPlacements < best) { best = m.misleadingPlacements; bestG = { c: [...c], mv: [...mv] }; }
    }
  }
  console.log(name, { total, uniq, bestMis: best, best: bestG });
  const keys = Object.keys(mis).map(Number).sort((a, b) => a - b);
  console.log("  mis hist:", keys.map(k => `${k}:${mis[k]}`).join(" "));
}

scan("asym A", 6000, [[45, 75], [80, 105], [110, 140]], [0.55, 0.9], [0.2, 0.45]);
scan("asym strong", 6000, [[45, 75], [80, 105], [110, 140]], [0.7, 0.95], [0.15, 0.35]);
scan("asym extreme", 8000, [[45, 75], [80, 105], [110, 140]], [0.85, 1.15], [0.08, 0.3]);
scan("asym extreme close", 8000, [[55, 80], [85, 110], [115, 140]], [0.85, 1.15], [0.08, 0.3]);
