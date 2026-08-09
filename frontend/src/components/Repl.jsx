import { useState, useRef, useEffect } from "react";
import { Play, Trash2, TerminalSquare, RotateCcw, Keyboard } from "lucide-react";
import { CodeEditor } from "./CodeEditor.jsx";
import { evaluateFor } from "../lib/run.js";
import { splitReplBlocks } from "../lib/nix.js";
import { getCourseNs } from "../lib/sci.js";
import { useApp } from "../context/AppContext.jsx";
import { useCourse } from "../context/CourseContext.jsx";

const DEFAULT_WELCOME = "# Welcome to the REPL playground.\n# Type an expression and press Cmd/Ctrl + Enter to run it.\n1 + 2";

const BASE_SHORTCUTS = [
  { keys: ["⌘/Ctrl", "Enter"], label: "Run the code" },
  { keys: ["Shift", "Enter"], label: "Run the code" },
  { keys: ["Ctrl", "Space"], label: "Trigger autocomplete" },
  { keys: ["Tab"], label: "Accept completion / indent" },
  { keys: ["⌘/Ctrl", "Z"], label: "Undo" },
];

// Structural-editing keys only exist in the Clojure editor mode.
const STRUCTURAL_SHORTCUTS = [
  { keys: ["⌘/Ctrl", "→"], label: "Slurp (pull next form in)" },
  { keys: ["⌘/Ctrl", "←"], label: "Barf (push last form out)" },
  { keys: ["Alt", "S"], label: "Splice (remove surrounding parens)" },
];

export function Repl({ initialSource }) {
  const { themeVars, dark, fontSize } = useApp();
  const course = useCourse();
  const WELCOME = initialSource || (course && course.replWelcome) || DEFAULT_WELCOME;
  const prompt = (course && course.replPrompt) || `${getCourseNs()}=>`;
  const isClojure = (course && course.editorLang) === "clojure";
  const SHORTCUTS = isClojure ? [...BASE_SHORTCUTS, ...STRUCTURAL_SHORTCUTS] : BASE_SHORTCUTS;
  const [source, setSource] = useState(WELCOME);
  const [history, setHistory] = useState([]);
  const [showCheat, setShowCheat] = useState(false);
  const scrollRef = useRef(null);
  const runningRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  // The buffer is either one expression or several blank-line-separated ones.
  // Strategy: if the whole buffer evaluates to a real value, keep it as a
  // single entry (preserves multi-line expressions that contain blank lines).
  // Otherwise — including the browser Tvix quirk of "succeeding" with an
  // empty value on multi-expression input — evaluate each block in order,
  // like feeding lines to a real `nix repl`.
  const run = async () => {
    if (runningRef.current) return; // ignore rapid re-clicks while a run is in flight
    const code = source.trim();
    if (!code) return;
    runningRef.current = true;
    try {
      const blocks = splitReplBlocks(source);
      if (blocks.length > 1) {
        const whole = await evaluateFor(course, code);
        const wholeHasValue = whole.ok && String(whole.value || "").trim() !== "";
        if (wholeHasValue) {
          setHistory((h) => [...h, { code, ...whole }]);
          setSource("");
          return;
        }
        const entries = [];
        for (const block of blocks) {
          const r = await evaluateFor(course, block);
          entries.push({ code: block, ...r });
        }
        setHistory((h) => [...h, ...entries]);
        setSource("");
        return;
      }
      const r = await evaluateFor(course, code);
      setHistory((h) => [...h, { code, ...r }]);
      setSource("");
    } finally {
      runningRef.current = false;
    }
  };

  const clear = () => setHistory([]);

  return (
    <div className="repl" data-testid="repl">
      <div className="repl-head">
        <div className="repl-title"><TerminalSquare size={18} /> REPL Playground</div>
        <div className="repl-head-actions">
          <button className="ghost-btn" onClick={() => setShowCheat((s) => !s)} data-testid="repl-cheatsheet-toggle">
            <Keyboard size={14} /> Shortcuts
          </button>
          <button className="ghost-btn" onClick={() => setSource(WELCOME)} data-testid="repl-restore">
            <RotateCcw size={14} /> Restore default
          </button>
          <button className="ghost-btn" onClick={clear} data-testid="repl-clear">
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      {showCheat && (
        <div className="cheatsheet" data-testid="repl-cheatsheet">
          <div className="cheatsheet-title">Keyboard shortcuts</div>
          <div className="cheatsheet-grid">
            {SHORTCUTS.map((s, i) => (
              <div className="cheat-row" key={i}>
                <span className="cheat-keys">
                  {s.keys.map((k, j) => (
                    <kbd key={j}>{k}</kbd>
                  ))}
                </span>
                <span className="cheat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="repl-log" ref={scrollRef} data-testid="repl-log">
        {history.length === 0 && (
          <div className="repl-empty">Run an expression to see results here.</div>
        )}
        {history.map((h, i) => (
          <div className="repl-entry" key={i}>
            <pre className="repl-input"><span className="repl-prompt">{prompt} </span>{h.code}</pre>
            {h.output && <pre className="out-line out-print">{h.output}</pre>}
            {h.ok ? (
              <pre className="out-line out-value">{h.value}</pre>
            ) : (
              <pre className="out-line out-error">{h.error}</pre>
            )}
          </div>
        ))}
      </div>

      <div className="repl-input-area">
        <div className="snippet-editor">
          <CodeEditor
            value={source}
            onChange={setSource}
            onRun={run}
            themeVars={themeVars}
            dark={dark}
            fontSize={fontSize}
            showLineNumbers
            lang={course?.editorLang || "clojure"}
          />
        </div>
        <button className="run-btn repl-run" onClick={run} data-testid="repl-run">
          <Play size={14} /> Run <kbd>⌘↵</kbd>
        </button>
      </div>
    </div>
  );
}

export default Repl;
