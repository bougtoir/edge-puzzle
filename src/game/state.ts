/**
 * Game state — pure reducer, UI-free.
 * Local legality only: a pair is locked once the two movable edges on a
 * central edge satisfy the triangle inequality. Placements that are locally
 * legal but globally wrong are allowed (backtracking is the game).
 */

import { triangleLegal } from "./puzzle";
import type { Puzzle } from "./puzzle";

export interface Placement {
  movableId: string;
  fixedEdgeIndex: number;
}

export interface GameStats {
  moves: number;
  undos: number;
  invalidAttempts: number;
}

export interface GameState {
  puzzle: Puzzle;
  /** placements in order; each fixed edge holds at most pairSize */
  placements: Placement[];
  /** fixedEdgeIndex -> completed (locally legal & locked) */
  completed: boolean[];
  /** last invalid attempt for flash feedback */
  lastInvalid: { movableId: string; fixedEdgeIndex: number; at: number } | null;
  stats: GameStats;
  done: boolean;
}

export function initialState(puzzle: Puzzle): GameState {
  return {
    puzzle,
    placements: [],
    completed: puzzle.fixedEdges.map(() => false),
    lastInvalid: null,
    stats: { moves: 0, undos: 0, invalidAttempts: 0 },
    done: false,
  };
}

export function edgePlaced(state: GameState, fixedEdgeIndex: number): string[] {
  return state.placements
    .filter((p) => p.fixedEdgeIndex === fixedEdgeIndex)
    .map((p) => p.movableId);
}

export type Action =
  | { type: "place"; movableId: string; fixedEdgeIndex: number }
  | { type: "unplace"; movableId: string }
  | { type: "undo" }
  | { type: "reset" }
  | { type: "clearInvalid" };

export function reducer(state: GameState, action: Action): GameState {
  const { puzzle } = state;
  switch (action.type) {
    case "place": {
      if (state.done) return state;
      const target = action.fixedEdgeIndex;
      if (state.completed[target]) return state;
      // edge already placed somewhere? remove it first (re-targeting)
      let placements = state.placements.filter((p) => p.movableId !== action.movableId);
      const current = placements.filter((p) => p.fixedEdgeIndex === target);
      if (current.length >= puzzle.pairSize) return state; // full
      placements = [...placements, { movableId: action.movableId, fixedEdgeIndex: target }];

      const group = placements
        .filter((p) => p.fixedEdgeIndex === target)
        .map((p) => puzzle.movableEdges.find((e) => e.id === p.movableId)!.length);

      const stats = { ...state.stats, moves: state.stats.moves + 1 };
      const completed = [...state.completed];
      let lastInvalid = state.lastInvalid;

      if (group.length === puzzle.pairSize) {
        if (triangleLegal(puzzle.fixedEdges[target].length, group)) {
          completed[target] = true;
        } else {
          // reject: the just-placed edge returns to the pool, flash red
          placements = placements.filter((p) => p.movableId !== action.movableId);
          stats.invalidAttempts++;
          lastInvalid = { movableId: action.movableId, fixedEdgeIndex: target, at: Date.now() };
        }
      }

      const done =
        completed.every(Boolean) && placements.length === puzzle.movableEdges.length;
      return { ...state, placements, completed, stats, lastInvalid, done };
    }
    case "unplace": {
      const idx = state.placements.findIndex((p) => p.movableId === action.movableId);
      if (idx < 0) return state;
      const target = state.placements[idx].fixedEdgeIndex;
      if (state.completed[target]) return state; // locked
      const placements = state.placements.filter((_, i) => i !== idx);
      return { ...state, placements, stats: { ...state.stats, moves: state.stats.moves + 1 } };
    }
    case "undo": {
      // remove the most recent placement belonging to a non-locked edge,
      // else unlock the most recently completed edge
      for (let i = state.placements.length - 1; i >= 0; i--) {
        const t = state.placements[i].fixedEdgeIndex;
        if (!state.completed[t]) {
          const placements = state.placements.filter((_, j) => j !== i);
          return { ...state, placements, stats: { ...state.stats, undos: state.stats.undos + 1 } };
        }
      }
      // all placements are in completed edges: undo last completed group
      if (state.placements.length === 0) return state;
      const last = state.placements[state.placements.length - 1];
      const t = last.fixedEdgeIndex;
      const completed = [...state.completed];
      completed[t] = false;
      const placements = state.placements.filter((p) => p.movableId !== last.movableId);
      return {
        ...state,
        placements,
        completed,
        done: false,
        stats: { ...state.stats, undos: state.stats.undos + 1 },
      };
    }
    case "reset":
      return initialState(state.puzzle);
    case "clearInvalid":
      return { ...state, lastInvalid: null };
    default:
      return state;
  }
}
