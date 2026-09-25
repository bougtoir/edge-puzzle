import { edgePlaced } from "../game/state";
import type { GameState } from "../game/state";
import { apexPosition, boardGeometry, VIEW_H, VIEW_W } from "./layout";

interface Props {
  state: GameState;
  showLengths: boolean;
  /** called when a slot zone is clicked while an edge is selected */
  onSlotClick: (edgeIndex: number) => void;
  /** click a placed edge chip to return it to the pool */
  onPlacedClick: (movableId: string) => void;
  debug: boolean;
}

const VERTEX_LABELS = ["A", "B", "C"];

export function Board({ state, showLengths, onSlotClick, onPlacedClick, debug }: Props) {
  const geom = boardGeometry(state.puzzle);
  if (!geom) return <div>degenerate central triangle</div>;

  const lenOf = (id: string) =>
    state.puzzle.movableEdges.find((e) => e.id === id)!.length;

  const now = Date.now();
  const invalid = state.lastInvalid && now - state.lastInvalid.at < 900 ? state.lastInvalid : null;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="board"
      role="application"
      aria-label="puzzle board"
    >
      {/* slot zones: translucent triangles outside each fixed edge */}
      {geom.edges.map((e) => {
        const placedCount = edgePlaced(state, e.i).length;
        const done = state.completed[e.i];
        const isInvalid = invalid?.fixedEdgeIndex === e.i;
        return (
          <g key={e.i}>
            <polygon
              points={`${e.p[0].x},${e.p[0].y} ${e.p[1].x},${e.p[1].y} ${e.slotAnchor.x + e.outward.x * 40},${e.slotAnchor.y + e.outward.y * 40}`}
              className={`slot-zone ${done ? "done" : ""} ${isInvalid ? "invalid" : ""}`}
              onClick={() => onSlotClick(e.i)}
            />
            {/* wide invisible click target along the edge itself */}
            {!done && (
              <line
                x1={e.p[0].x}
                y1={e.p[0].y}
                x2={e.p[1].x}
                y2={e.p[1].y}
                stroke="transparent"
                strokeWidth={24}
                style={{ cursor: "pointer" }}
                onClick={() => onSlotClick(e.i)}
              />
            )}
            {/* slot pips */}
            {!done &&
              Array.from({ length: state.puzzle.pairSize }).map((_, k) => (
                <circle
                  key={k}
                  cx={e.slotAnchor.x + e.outward.x * 10 + (k - 0.5) * 22}
                  cy={e.slotAnchor.y + e.outward.y * 10}
                  r={9}
                  className={`slot-pip ${k < placedCount ? "filled" : ""} ${isInvalid ? "invalid" : ""}`}
                  onClick={() => onSlotClick(e.i)}
                />
              ))}
          </g>
        );
      })}

      {/* completed outer triangles */}
      {geom.edges.map((e) => {
        if (!state.completed[e.i]) return null;
        const ids = edgePlaced(state, e.i);
        const apex = apexPosition(geom, e.i, lenOf(ids[0]), lenOf(ids[1]));
        if (!apex) return null;
        return (
          <g key={`outer-${e.i}`}>
            <polygon
              points={`${e.p[0].x},${e.p[0].y} ${e.p[1].x},${e.p[1].y} ${apex.x},${apex.y}`}
              className="outer-tri"
            />
            <line x1={e.p[0].x} y1={e.p[0].y} x2={apex.x} y2={apex.y} className="outer-edge" />
            <line x1={e.p[1].x} y1={e.p[1].y} x2={apex.x} y2={apex.y} className="outer-edge" />
            <circle cx={apex.x} cy={apex.y} r={3} className="apex-dot" />
            <text
              x={apex.x + e.outward.x * 12}
              y={apex.y + e.outward.y * 12}
              className="vertex-label"
            >
              {state.puzzle.apexLabels[e.i]}
            </text>
          </g>
        );
      })}

      {/* placed-but-incomplete edges as chips near the edge */}
      {geom.edges.map((e) => {
        if (state.completed[e.i]) return null;
        const ids = edgePlaced(state, e.i);
        return ids.map((id, k) => (
          <g
            key={id}
            onClick={() => onPlacedClick(id)}
            className="placed-chip"
            style={{ cursor: "pointer" }}
          >
            <rect
              x={e.slotAnchor.x + e.outward.x * 30 - 10 + k * 24}
              y={e.slotAnchor.y + e.outward.y * 30 - 8}
              width={20}
              height={16}
              rx={3}
            />
            <text
              x={e.slotAnchor.x + e.outward.x * 30 + k * 24}
              y={e.slotAnchor.y + e.outward.y * 30 + 4}
            >
              {showLengths ? lenOf(id) : "·"}
            </text>
          </g>
        ));
      })}

      {/* central triangle */}
      <polygon
        points={geom.verts.map((p) => `${p.x},${p.y}`).join(" ")}
        className="central-tri"
      />
      {geom.edges.map((e) => (
        <g key={`lab-${e.i}`}>
          {showLengths && (
            <text x={e.mid.x - e.outward.x * 12} y={e.mid.y - e.outward.y * 12} className="edge-label">
              {state.puzzle.fixedEdges[e.i].length}
            </text>
          )}
          {debug && (
            <text x={e.mid.x - e.outward.x * 24} y={e.mid.y - e.outward.y * 24} className="debug-label">
              {state.puzzle.fixedEdges[e.i].id}
            </text>
          )}
        </g>
      ))}
      {geom.verts.map((p, i) => (
        <text key={i} x={p.x + (p.x - geom.centroid.x) * 0.12} y={p.y + (p.y - geom.centroid.y) * 0.12} className="vertex-label">
          {VERTEX_LABELS[i]}
        </text>
      ))}
    </svg>
  );
}
