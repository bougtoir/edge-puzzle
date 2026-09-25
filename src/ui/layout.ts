/**
 * Maps puzzle data -> SVG world coordinates.
 * All vertex positions are computed exactly from edge lengths via
 * thirdVertexCandidates + outwardVertex — never hand-placed.
 */

import {
  centroid,
  embedTriangle,
  outwardVertex,
  thirdVertexCandidates,
} from "../geometry/triangle";
import type { Vec2 } from "../geometry/triangle";
import type { Puzzle } from "../game/puzzle";

export const VIEW_W = 420;
export const VIEW_H = 400;

export interface BoardGeom {
  /** world coords of A, B, C */
  verts: Vec2[];
  centroid: Vec2;
  /** per fixed edge: endpoints indices into verts, apex candidate for a legal pair, slot anchor point (outside midpoint) */
  edges: {
    i: number;
    p: [Vec2, Vec2];
    mid: Vec2;
    outward: Vec2; // unit outward normal
    slotAnchor: Vec2;
  }[];
  /** scale factor: data length -> world px (edges drawn true to ratio) */
  scale: number;
}

/** build geometry for the central triangle, scaled to fit the view box */
export function boardGeometry(puzzle: Puzzle): BoardGeom | null {
  const [e0, e1, e2] = puzzle.fixedEdges.map((e) => e.length);
  const tri = embedTriangle(e0, e1, e2); // verts[0]=A verts[1]=B verts[2]=C
  if (!tri) return null;

  // bounding box -> uniform scale (outer triangles add ~one edge length of margin)
  const xs = tri.map((p) => p.x);
  const ys = tri.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const maxLen = Math.max(e0, e1, e2);
  const innerW = VIEW_W * 0.45;
  const innerH = VIEW_H * 0.45;
  const scale = Math.min(innerW / w, innerH / h, (VIEW_W * 0.5) / maxLen);

  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const verts = tri.map((p) => ({
    x: VIEW_W / 2 + (p.x - cx) * scale,
    y: VIEW_H / 2 + (p.y - cy) * scale - 10,
  }));
  const ctr = centroid(verts);

  // edges: 0: AB=(0,1), 1: BC=(1,2), 2: CA=(2,0)
  const edgeVerts: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 0],
  ];
  const edges = edgeVerts.map(([i, j], idx) => {
    const p: [Vec2, Vec2] = [verts[i], verts[j]];
    const mid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
    const dx = p[1].x - p[0].x;
    const dy = p[1].y - p[0].y;
    const len = Math.hypot(dx, dy);
    // two candidate normals; pick the one pointing away from centroid
    const n1 = { x: -dy / len, y: dx / len };
    const toCtr = { x: ctr.x - mid.x, y: ctr.y - mid.y };
    const outward = n1.x * toCtr.x + n1.y * toCtr.y < 0 ? n1 : { x: -n1.x, y: -n1.y };
    const slotAnchor = { x: mid.x + outward.x * 26, y: mid.y + outward.y * 26 };
    return { i: idx, p, mid, outward, slotAnchor };
  });

  return { verts, centroid: ctr, edges, scale };
}

/** world position of the new apex for fixed edge i given the two placed lengths */
export function apexPosition(
  geom: BoardGeom,
  edgeIdx: number,
  a: number,
  b: number,
): Vec2 | null {
  const e = geom.edges[edgeIdx];
  const s = geom.scale;
  const cand = thirdVertexCandidates(e.p[0], e.p[1], a * s, b * s);
  if (!cand) return null;
  return outwardVertex(cand, e.p[0], e.p[1], geom.centroid);
}
