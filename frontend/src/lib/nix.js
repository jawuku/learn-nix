// Client-side Nix language evaluation using `nix-eval` — the Nix evaluator
// (Tvix) compiled to WebAssembly and packaged for npm. This is the course
// evaluator for the Nix course: the browser-side counterpart to SCI/Scittle
// used by the (now dormant) Clojure path in lib/sci.js.
//
// Notes on capability: this evaluates the Nix *language* (literals, let…in,
// functions, attribute sets, builtins, string interpolation…). It has no
// store, sandbox or build daemon, so derivations cannot be realised and
// commands like `nix build` / `nix develop` must be taught as read-only
// examples (the `read` block type) rather than runnable code.
import { createEvaluator } from "nix-eval";

let evaluator = null;
let initPromise = null;
let initFailed = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Split REPL input into blank-line-separated expression blocks, dropping
// blocks that contain only comments/whitespace. Nix has no `do` form, so the
// whole buffer can't be evaluated as one unit — this mirrors how a real
// `nix repl` evaluates one complete expression per input. Comment lines are
// kept attached to their block (they're valid Nix).
export function splitReplBlocks(code) {
  const blocks = [];
  for (const raw of (code || "").split(/\n\s*\n/)) {
    const lines = raw.split("\n");
    const hasCode = lines.some((l) => {
      const t = l.trim();
      return t !== "" && !t.startsWith("#");
    });
    if (!hasCode) continue;
    blocks.push(lines.map((l) => l.trimEnd()).join("\n").trim());
  }
  return blocks;
}

// True once the Tvix WASM evaluator is ready to evaluate.
export function nixReady() {
  return evaluator != null;
}

// Resolve once the evaluator is ready (kicking off its one-time WASM init).
// Mirrors waitForSci's contract so the app can wait on either runtime.
// If WASM init fails or times out, resolves `false` and never retries — the
// app then degrades to a readable-but-static course instead of spinning.
export function waitForNix(timeoutMs = 15000) {
  if (evaluator) return Promise.resolve(true);
  if (initFailed) return Promise.resolve(false);
  if (!initPromise) {
    initPromise = createEvaluator({ strict: true })
      .then((ev) => {
        evaluator = ev;
        return ev;
      })
      .catch((e) => {
        initFailed = true;
        initPromise = null;
        throw e;
      });
  }
  return Promise.race([
    initPromise.then(
      () => true,
      () => false
    ),
    sleep(timeoutMs).then(() => (evaluator ? true : false)),
  ]);
}

// Pull the first diagnostic out of a nix-eval result (which may be a string
// or a structured object), or null when the result is clean.
function firstError(result) {
  if (result && Array.isArray(result.errors) && result.errors.length) {
    const e = result.errors[0];
    if (typeof e === "string") return e;
    if (e && typeof e === "object") {
      return e.message || JSON.stringify(e).slice(0, 200);
    }
    return String(e);
  }
  return null;
}

// Evaluate a chunk of Nix code. Returns { ok, value, output, error } — the
// same shape as evalClojure — so every runnable surface (snippets, exercises,
// REPL, cheat sheet) can treat the two runtimes identically.
export async function evalNix(code) {
  const trimmed = (code || "").trim();
  if (!trimmed) return { ok: true, value: "nothing to evaluate", output: "", error: null };
  if (!evaluator) {
    return {
      ok: false,
      value: null,
      output: "",
      error: "The Nix runtime is still loading. Give it a second and try again.",
    };
  }
  try {
    const r = await evaluator.eval(trimmed);
    const err = firstError(r);
    if (err) return { ok: false, value: null, output: "", error: err };
    return { ok: true, value: String(r.output ?? ""), output: "", error: null };
  } catch (e) {
    return {
      ok: false,
      value: null,
      output: "",
      error: String((e && e.message) || e),
    };
  }
}

// Run the user's code in isolation, binding its value to `answer`, then
// evaluate each boolean test expression in the same scope — mirroring how
// runExerciseTests works for the Clojure runtime. Returns
// { passed, results: [{test, ok, detail}], runError }.
export async function runNixExerciseTests(userCode, tests) {
  const code = (userCode || "").trim();
  if (!code) {
    return { passed: false, results: [], runError: "Write some code first, then check your answer." };
  }
  if (!evaluator) {
    return { passed: false, results: [], runError: "The Nix runtime is still loading. Try again in a moment." };
  }
  const results = [];
  for (const test of tests || []) {
    // Newlines guard against a trailing `#` comment swallowing the wrapper.
    const wrapped = `let answer = (\n${code}\n); in (\n${test}\n)`;
    try {
      const r = await evaluator.eval(wrapped);
      const err = firstError(r);
      if (err) {
        results.push({ test, ok: false, detail: err });
      } else {
        const ok = String(r.output ?? "").trim() === "true";
        results.push({ test, ok, detail: ok ? "passed" : `got ${r.output}` });
      }
    } catch (e) {
      results.push({ test, ok: false, detail: String((e && e.message) || e) });
    }
  }
  return {
    passed: results.length > 0 && results.every((r) => r.ok),
    results,
    runError: null,
  };
}
