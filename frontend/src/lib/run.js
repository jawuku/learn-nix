// Course-aware runtime dispatch. A course may declare its own `evaluate`,
// `checkExercise`, `runtimeReady` and `waitForRuntime` hooks (see
// buildCourse in course/registry.js). The Clojure path routes to the SCI
// runtime (lib/sci.js); the Nix course routes to the Tvix-WASM evaluator
// (lib/nix.js). Components call these helpers instead of the SCI functions
// directly, so adding a future course is purely data + one evaluator module.
import { evalClojure, runExerciseTests, sciReady, waitForSci } from "./sci";
import { evalNix, runNixExerciseTests, nixReady, waitForNix } from "./nix";
import { debug } from "./log";

// Async evaluation of `code` in the active course's runtime.
// Returns a Promise of { ok, value, output, error }.
export function evaluateFor(course, code) {
  if (course && course.evaluate) return course.evaluate(code);
  debug("evaluateFor: no course evaluator hook — falling back to SCI (ensure the SCI runtime is loaded)");
  return Promise.resolve(evalClojure(code));
}

// Async exercise checking in the active course's runtime.
// Returns a Promise of { passed, results: [{test, ok, detail}], runError }.
export function checkExerciseFor(course, userCode, tests) {
  if (course && course.checkExercise) return course.checkExercise(userCode, tests);
  debug("checkExerciseFor: no course exercise hook — falling back to SCI (ensure the SCI runtime is loaded)");
  return Promise.resolve(runExerciseTests(userCode, tests));
}

// Is the active course's runtime ready for evaluation? (sync)
export function runtimeReadyFor(course) {
  if (course && course.runtimeReady) return course.runtimeReady();
  return sciReady();
}

// Wait for the active course's runtime to become ready. (async -> boolean)
export function waitForRuntimeFor(course) {
  if (course && course.waitForRuntime) return course.waitForRuntime();
  return waitForSci();
}

// Kept importable for callers that still want the raw evaluators.
export { evalNix, runNixExerciseTests, nixReady, waitForNix };
