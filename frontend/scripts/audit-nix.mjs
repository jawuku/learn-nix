#!/usr/bin/env node
/**
 * Nix content audit
 * -----------------
 * Verifies every runnable snippet, exercise and cheat-sheet example in the
 * Nix course using the exact evaluator the app uses (nix-eval / Tvix WASM).
 * Runs entirely in Node — no browser or dev server required.
 *
 *   - A runnable `code` block that fails to evaluate is a RUN_ERROR problem.
 *   - An exercise whose SOLUTION does not satisfy every test is a TEST_FAIL
 *     (or RUN_ERROR if it fails to evaluate).
 *   - A cheat-sheet item with an `example` that fails is a CHEAT_FAIL.
 *
 * Usage: node scripts/audit-nix.mjs [--help]
 * Env: AUDIT_REPORT=<path> writes a JSON report (see lib/audit-helpers.mjs).
 */
import { createEvaluator } from "nix-eval";
import { splitReplBlocks } from "../src/lib/nix.js";
import { log, summarize, extractModules } from "./lib/audit-helpers.mjs";

const FILES = ["nixPart1", "nixPart2", "nixPart3", "nixCheatsheet"];

// nix-eval reports errors either as a single diagnostic string or an array.
function firstError(result) {
  const e = result && result.errors;
  if (!e) return null;
  if (typeof e === "string") return e.slice(0, 220);
  if (Array.isArray(e) && e.length) {
    const x = e[0];
    return String(typeof x === "object" ? x.message || JSON.stringify(x) : x).slice(0, 220);
  }
  return String(e).slice(0, 220);
}

async function runAudit() {
  log("loading Nix evaluator (Tvix WASM)…");
  const ev = await createEvaluator({ strict: true });
  log("loading lesson data…");
  const modules = await extractModules(FILES);
  const lessons = [
    ...modules.get("nixPart1").nixPart1,
    ...modules.get("nixPart2").nixPart2,
    ...modules.get("nixPart3").nixPart3,
  ];
  const cheatsheet = modules.get("nixCheatsheet").NIX_CHEATSHEET || [];

  const problems = [];
  let snippetCount = 0;
  let exerciseCount = 0;
  let cheatCount = 0;
  let replSeedCount = 0;

  const evalNix = async (src) => {
    try {
      const r = await ev.eval(src);
      const err = firstError(r);
      if (err) return { ok: false, error: err };
      return { ok: true, output: String(r.output ?? "") };
    } catch (e) {
      return { ok: false, error: String(e).slice(0, 220) };
    }
  };

  for (const lesson of lessons) {
    for (const block of lesson.content || []) {
      if (block.t === "list") {
        // List items are either plain strings or { text, url } links.
        for (const it of block.items || []) {
          if (typeof it === "string") continue;
          if (!it || typeof it.text !== "string" || typeof it.url !== "string") {
            problems.push({
              kind: "BAD_LIST_ITEM",
              lesson: lesson.id,
              title: lesson.title,
              error: "list items must be strings or { text, url } objects",
            });
          } else if (!/^(https?:|mailto:)/.test(it.url)) {
            problems.push({
              kind: "BAD_LIST_URL",
              lesson: lesson.id,
              title: lesson.title,
              error: `url must be http(s)/mailto — got "${it.url}"`,
            });
          }
        }
      }
      if (block.t !== "code") continue;
      snippetCount++;
      const r = await evalNix(block.code);
      if (!r.ok) {
        problems.push({
          kind: "RUN_ERROR",
          lesson: lesson.id,
          title: lesson.title,
          what: "snippet",
          error: r.error,
        });
      }
    }
    for (const ex of lesson.exercises || []) {
      exerciseCount++;
      if (!ex.solution || !Array.isArray(ex.tests) || ex.tests.length === 0) {
        problems.push({
          kind: "NO_TESTS",
          lesson: lesson.id,
          title: lesson.title,
          prompt: (ex.prompt || "").slice(0, 90),
        });
        continue;
      }
      for (const test of ex.tests) {
        // Mirror the app's runNixExerciseTests wrapper exactly.
        const r = await evalNix(`let answer = (\n${ex.solution}\n); in (\n${test}\n)`);
        if (!r.ok) {
          problems.push({
            kind: "RUN_ERROR",
            lesson: lesson.id,
            title: lesson.title,
            what: "exercise test",
            test,
            error: r.error,
          });
        } else if (r.output.trim() !== "true") {
          problems.push({
            kind: "TEST_FAIL",
            lesson: lesson.id,
            title: lesson.title,
            test,
            got: r.output.slice(0, 90),
          });
        }
      }
    }
  }

  for (const group of cheatsheet) {
    for (const item of group.items || []) {
      if (!item.example) continue;
      cheatCount++;
      const r = await evalNix(item.example);
      if (!r.ok) {
        problems.push({
          kind: "CHEAT_FAIL",
          group: group.group,
          name: item.name,
          error: r.error,
        });
      }
    }
  }

  // Lesson REPL seeds are multi-expression tours, so evaluate each
  // blank-line-separated block exactly like the REPL does.
  for (const lesson of lessons) {
    if (!lesson.replSeed) continue;
    for (const block of splitReplBlocks(lesson.replSeed)) {
      replSeedCount++;
      const r = await evalNix(block);
      if (!r.ok) {
        problems.push({
          kind: "REPL_SEED_FAIL",
          lesson: lesson.id,
          title: lesson.title,
          block: block.slice(0, 70),
          error: r.error,
        });
      }
    }
  }

  return {
    problems,
    info: [],
    consoleErrors: [],
    pageErrors: [],
    extra: {
      snippets: snippetCount,
      exercises: exerciseCount,
      cheatExamples: cheatCount,
      replSeedBlocks: replSeedCount,
      lessons: lessons.length,
    },
  };
}

// Node-only audit: no browser, no dev server (runMain in audit-helpers boots
// one — we don't need it), so drive summarize directly.
try {
  const result = await runAudit();
  summarize(result);
} catch (e) {
  log("");
  log("FATAL: " + (e && e.message ? e.message : e));
  process.exitCode = 1;
}
