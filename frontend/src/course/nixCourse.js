import { buildCourse } from "./registry.js";
import { nixPart1, REPL_TOUR } from "../data/nixPart1.js";
import { nixPart2 } from "../data/nixPart2.js";
import { nixPart3 } from "../data/nixPart3.js";
import { NIX_CHEATSHEET } from "../data/nixCheatsheet.js";
import { evalNix, runNixExerciseTests, nixReady, waitForNix } from "../lib/nix.js";

// Assemble the curriculum in teaching order: modules 0–10, then reference.
const LESSONS = [...nixPart1, ...nixPart2, ...nixPart3];

export const nixCourse = buildCourse({
  id: "nix",
  name: "Nix",
  tagline: "Learn Nix",
  brandMark: "❄",
  storageKey: "nix_course_v1",
  // SCI namespace is unused for this course (there is no SCI runtime); kept
  // for engine symmetry.
  ns: "nix",
  lessons: LESSONS,
  cheatsheet: NIX_CHEATSHEET,
  // Curated practice tour (blank-line-separated expressions, evaluated one
  // at a time by the REPL like lines of `nix repl`).
  replWelcome: REPL_TOUR,
  replPrompt: "nix-repl>",
  editorLang: "nix",
  runtimeBlurb: "Runs 100% in your browser — a real Nix evaluator (Tvix WASM)",
  // Course runtime hooks: everything runnable evaluates through nix-eval.
  evaluate: evalNix,
  checkExercise: runNixExerciseTests,
  runtimeReady: nixReady,
  waitForRuntime: waitForNix,
});

export default nixCourse;
