import type { GameState } from "../game/state";

interface Props {
  state: GameState;
  showLengths: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  debug: boolean;
}

const MAX_BAR = 180; // px width for the longest edge

export function Pool({ state, showLengths, selectedId, onSelect, debug }: Props) {
  const placed = new Set(state.placements.map((p) => p.movableId));
  const maxLen = Math.max(...state.puzzle.movableEdges.map((e) => e.length));
  const invalidId =
    state.lastInvalid && Date.now() - state.lastInvalid.at < 900
      ? state.lastInvalid.movableId
      : null;

  return (
    <div className="pool">
      {state.puzzle.movableEdges.map((e) => {
        const used = placed.has(e.id);
        return (
          <button
            key={e.id}
            className={`pool-edge ${used ? "used" : ""} ${selectedId === e.id ? "selected" : ""} ${invalidId === e.id ? "invalid" : ""}`}
            disabled={used}
            onClick={() => onSelect(selectedId === e.id ? null : e.id)}
          >
            <span
              className="edge-bar"
              style={{ width: `${Math.max(14, (e.length / maxLen) * MAX_BAR)}px` }}
            />
            {showLengths && <span className="edge-len">{e.length}</span>}
            {debug && <span className="debug-label">{e.id}</span>}
          </button>
        );
      })}
    </div>
  );
}
