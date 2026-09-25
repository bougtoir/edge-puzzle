import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { analyzePuzzle } from "./game/puzzle";
import type { Difficulty, Puzzle } from "./game/puzzle";
import { generatePuzzle } from "./game/generator";
import { EASY_PUZZLE, HARD_PUZZLE } from "./game/puzzles";
import { initialState, reducer } from "./game/state";
import { Board } from "./ui/Board";
import { Pool } from "./ui/Pool";
import "./app.css";

type Mode = "practice" | "timeattack";
type Source = "fixed" | "random";

const BEST_KEY = (d: Difficulty) => `edge-puzzle-best-${d}`;
const readBest = (d: Difficulty): number | null => {
  const v = localStorage.getItem(BEST_KEY(d));
  return v ? parseFloat(v) : null;
};

function loadPuzzle(difficulty: Difficulty, source: Source): Puzzle {
  const p =
    source === "fixed"
      ? difficulty === "easy"
        ? EASY_PUZZLE
        : HARD_PUZZLE
      : generatePuzzle(difficulty);
  if (!p.metadata.metrics) p.metadata.metrics = analyzePuzzle(p);
  return p;
}

export default function App() {
  const debug = useMemo(
    () => new URLSearchParams(location.search).get("debug") === "1",
    [],
  );
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [source, setSource] = useState<Source>("fixed");
  const [mode, setMode] = useState<Mode>("practice");
  const [showLengths, setShowLengths] = useState(true);
  const [nonce, setNonce] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => loadPuzzle("easy", "fixed"));

  const newGame = (d = difficulty, s = source) => {
    setPuzzle(loadPuzzle(d, s));
    setNonce((n) => n + 1);
  };

  return (
    <div className="app">
      <header>
        <h1>Edge Puzzle</h1>
        <div className="controls">
          <label>
            Mode:
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="practice">Practice</option>
              <option value="timeattack">Time Attack</option>
            </select>
          </label>
          <label>
            Difficulty:
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              <option value="easy">Easy</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label>
            Puzzle:
            <select value={source} onChange={(e) => setSource(e.target.value as Source)}>
              <option value="fixed">Fixed</option>
              <option value="random">Random</option>
            </select>
          </label>
          <button onClick={() => newGame()}>New game</button>
          <label className="toggle">
            <input
              type="checkbox"
              checked={showLengths}
              onChange={(e) => setShowLengths(e.target.checked)}
            />
            Show lengths
          </label>
        </div>
      </header>

      <GameScreen
        key={`${puzzle.id}-${nonce}`}
        puzzle={puzzle}
        mode={mode}
        showLengths={showLengths}
        debug={debug}
        onRestart={() => setNonce((n) => n + 1)}
      />
    </div>
  );
}

function GameScreen({
  puzzle,
  mode,
  showLengths,
  debug,
  onRestart,
}: {
  puzzle: Puzzle;
  mode: Mode;
  showLengths: boolean;
  debug: boolean;
  onRestart: () => void;
}) {
  const [state, dispatch] = useReducer(reducer, puzzle, initialState);
  const [selected, setSelected] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [best, setBest] = useState<number | null>(() => readBest(puzzle.difficulty));
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!started || state.done) return;
    timerRef.current = window.setInterval(
      () => setElapsed((Date.now() - startTime) / 1000),
      50,
    );
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, state.done, startTime]);

  useEffect(() => {
    if (!state.done) return;
    const t = (Date.now() - startTime) / 1000;
    setElapsed(t);
    if (mode === "timeattack") {
      const prev = readBest(puzzle.difficulty);
      if (prev === null || t < prev) {
        localStorage.setItem(BEST_KEY(puzzle.difficulty), String(t));
        setBest(t);
      }
    }
  }, [state.done]);

  useEffect(() => {
    if (!state.lastInvalid) return;
    const t = setTimeout(() => dispatch({ type: "clearInvalid" }), 900);
    return () => clearTimeout(t);
  }, [state.lastInvalid]);

  const start = () => {
    setStarted(true);
    setStartTime(Date.now());
  };

  const onSlotClick = (edgeIndex: number) => {
    if (!selected) return;
    dispatch({ type: "place", movableId: selected, fixedEdgeIndex: edgeIndex });
    setSelected(null);
  };

  const metrics = puzzle.metadata.metrics;

  return (
    <>
      <div className="controls">
        <button
          onClick={() => dispatch({ type: "undo" })}
          disabled={state.placements.length === 0 || state.done}
        >
          Undo
        </button>
        <button onClick={onRestart}>Reset</button>
        <span className="timer">{(started ? elapsed : 0).toFixed(2)} s</span>
        {mode === "timeattack" && best !== null && (
          <span className="best">best {best.toFixed(2)} s</span>
        )}
      </div>

      {!started && (
        <div className="overlay">
          <div className="tutorial">
            <h2>Edge Puzzle</h2>
            <p>6本の辺を使って、中央の三角形の外側に3つの三角形を完成させてください。</p>
            <p>各辺は1回だけ使用できます。中央の各辺には2本ずつ置きます。</p>
            <p>三角形として成立する組み合わせでも、最終的な正解とは限りません。</p>
            <button className="primary" onClick={start}>
              Start
            </button>
          </div>
        </div>
      )}

      <main className={started ? "" : "blurred"}>
        <Board
          state={state}
          showLengths={showLengths}
          onSlotClick={onSlotClick}
          onPlacedClick={(id) => dispatch({ type: "unplace", movableId: id })}
          debug={debug}
        />
        <Pool
          state={state}
          showLengths={showLengths}
          selectedId={selected}
          onSelect={setSelected}
          debug={debug}
        />
      </main>

      {state.done && (
        <div className="overlay">
          <div className="tutorial complete">
            <h2>Puzzle Complete!</h2>
            <p>Time: {elapsed.toFixed(2)} s</p>
            <p>Moves: {state.stats.moves}</p>
            <p>Undo: {state.stats.undos}</p>
            <p>Invalid attempts: {state.stats.invalidAttempts}</p>
            {mode === "timeattack" && best !== null && <p>Best: {best.toFixed(2)} s</p>}
            <button className="primary" onClick={onRestart}>
              Play again
            </button>
          </div>
        </div>
      )}

      {debug && metrics && (
        <footer className="debug-panel">
          <div>puzzle: {puzzle.id}</div>
          <div>
            solutions: {metrics.solutionCount} | legalLocalPairs: {metrics.legalLocalPairs}
            {" | "}misleading: {metrics.misleadingPlacements} | searchNodes:{" "}
            {metrics.searchNodes}
          </div>
          <div>
            solution:{" "}
            {metrics.solutions[0]?.groups
              .map(
                (g, i) =>
                  `${puzzle.fixedEdges[i].id}:[${g
                    .map((j) => `${puzzle.movableEdges[j].id}=${puzzle.movableEdges[j].length}`)
                    .join(",")}]`,
              )
              .join("  ")}
          </div>
        </footer>
      )}
    </>
  );
}
