# Contributing to Learn Nix

Thanks for helping out! This guide covers how to set up the project and — most
importantly — how to **verify your changes** before opening a PR, because this
course ships with a real Nix evaluator and a CI content audit.

The one-line summary:

```bash
cd frontend
yarn install
yarn start          # live dev server
yarn audit          # Node-only content audit (fast, run this before pushing)
yarn smoke          # full browser smoke test (run before opening a PR)
```

---

## 🧰 Prerequisites

- **Node.js 22+** (the CI workflow pins Node 22; `puppeteer` requires ≥ 22.12)
- **Yarn Classic v1** (`npm install -g yarn`) — use **Yarn, not npm**; the
  lockfile and `resolutions` are Yarn-based.

---

## 🚀 Setup

```bash
git clone <your-fork-url>
cd learn-nix/frontend
yarn install
yarn start          # opens http://localhost:3000
```

---

## 🗂️ Where things live

| Path | What it is |
|---|---|
| `curriculum.md` | The **source-of-truth syllabus** (all modules & lessons). |
| `frontend/src/data/nixPart1..3.js` | The course content the app renders. Each lesson mirrors a `curriculum.md` section — **keep the two in sync**. |
| `frontend/src/data/nixCheatsheet.js` | Cheat-sheet + command reference (also audited). |
| `frontend/src/course/nixCourse.js` | Assembles the course from the data files via `buildCourse` (`src/course/registry.js`). |
| `frontend/src/lib/nix.js` | Browser evaluator wrapper around `nix-eval` (Tvix WASM). |
| `frontend/scripts/audit-nix.mjs` | The Node content audit. |
| `frontend/scripts/smoke-browser.mjs` | The full browser smoke test. |
| `.github/workflows/cheat-audit.yml` | CI: runs the content audit on every push/PR. |

---

## ✏️ Editing lesson content

Lesson data files export an array of lesson objects:

```js
{
  id: "let-in",                          // stable id, used in ?lesson= deep links
  title: "let…in, Attribute Sets & Strings",
  group: "Module 1 — The Nix Language",
  summary: "Binding names, building attribute sets, and string interpolation.",
  content: [
    { t: "h", text: "let … in — giving names to values" },
    { t: "p", text: "Plain paragraph text. http(s):// URLs auto-link." },
    { t: "note", text: "A callout box." },
    { t: "list", items: ["plain item", { text: "linked item", url: "https://nix.dev" }] },
    { t: "read", code: "shell or code that needs a real Nix install" },  // read-only
    { t: "code", code: "1 + 2" },                                        // runnable pure Nix
  ],
  exercises: [
    {
      prompt: "Write an expression that produces 42.",
      starter: "1 + 1",
      tests: ["answer == 42"],          // Nix boolean expressions
      solution: "6 * 7",
      hint: "Anything that yields 42 works.",
    },
  ],
}
```

Rules of thumb:

- **`code` blocks must be pure, self-contained Nix** — they run in the
  browser via the Tvix WASM evaluator. Anything needing a real Nix install
  (shell commands, derivations, flakes, Home Manager) goes in a `read` block.
- **Exercises** bind the learner's code to `answer` and check it against each
  `tests` boolean expression — so any *correct* solution passes, not just the
  `solution` string.
- **Never guess fetcher hashes.** Use the [prefetch workflow](./README.md#-getting-source-hashes-right-prefetch-workflow)
  documented in the README (`nix-prefetch-url`, `nix store prefetch-file --json/--unpack`, `nix-prefetch-git`).
- **Outbound links**: list items can carry `{ text, url }`; inline `http(s)://`
  URLs in paragraphs auto-link. Both open in a new tab. See the
  [README section](./README.md#-outbound-links-in-lesson-content).
- The **REPL practice tour** (`REPL_TOUR` in `nixPart1.js`) doubles as the
  REPL's welcome script — if you change lesson content that it references,
  keep the tour in sync.

> **ESM note (frontend):** the package is `"type": "module"`. Relative imports
> in `src/` must include the file extension (`import x from "./thing.js"`).
> Node-side config files (craco, postcss, tailwind, health-check plugins) are
> `.cjs` — don't convert them back to `.js`.

---

## ✅ Content audit — `yarn audit`

The content audit is **Node-only** (no browser, no dev server). It evaluates
*every* runnable snippet, exercise solution, cheat-sheet example, and REPL
seed with the **same Tvix WASM evaluator the app uses**, and exits non-zero on
any problem:

```bash
cd frontend
yarn audit                 # equivalent: node scripts/audit-nix.mjs
```

Useful options:

```bash
# Write a machine-readable JSON report (path relative to frontend/)
AUDIT_REPORT=nix-audit-report.json yarn audit

# The script also prints a one-line summary:
#   AUDIT_SUMMARY_JSON={"ok":true,"problems":0,...}
```

**Run this after any content change.** It's what CI runs on every push/PR
(`.github/workflows/cheat-audit.yml`), so `yarn audit` passing locally means
CI's content step will pass too.

The generated report is gitignored (`frontend/.gitignore`), so running the
audit won't dirty your tree.

---

## 🧪 Browser smoke test — `yarn smoke`

The audit proves the *content* evaluates; the smoke test proves the *app*
works. It drives a real headless browser (puppeteer) end-to-end through the
full UI:

1. Loads the app on the first runnable lesson
2. Waits for the WASM runtime to boot
3. Runs the first snippet and checks a result appears
4. Checks the first exercise and verifies a verdict
5. Drives the REPL practice tour end-to-end
6. Exercises the command palette (fuzzy jump, theme toggle)
7. Verifies outbound links + tooltips (incl. viewport-edge flip)
8. Verifies inline auto-links in paragraphs
9. Verifies the FHS Environments lesson renders
10. Verifies the Fetchers / `mkderivation` lesson's prefetch block + exercise
11. **Fails on any page or console error**

You need a running app to point it at:

```bash
# Option A — dev server (default target)
yarn start            # in one terminal
yarn smoke            # in another  → tests http://localhost:3000

# Option B — production build (closest to what ships)
yarn build
python3 -m http.server 4173 --directory build   # any static server works
yarn smoke http://localhost:4173                # or AUDIT_BASE_URL=http://localhost:4173
```

Notes:

- Puppeteer downloads its own Chrome on `yarn install`. To use a system
  Chrome instead: `PUPPETEER_SKIP_DOWNLOAD=1 yarn install` then
  `CHROME_PATH=/path/to/chrome yarn smoke`.
- The smoke test needs the `puppeteer` dependency present (it's in
  `package.json`), so don't prune node_modules.
- **CI does not run the smoke test** (it's browser-heavy) — that's on you
  before opening a PR, especially for changes touching the UI, REPL, palette,
  links, or the evaluator.

---

## 🔍 Before you open a PR

- [ ] `yarn audit` passes (ALL CLEAN)
- [ ] `yarn build` compiles
- [ ] `yarn smoke` passes with **0 page errors / 0 console errors**
- [ ] Lesson data changes are mirrored in `curriculum.md` (and vice versa)
- [ ] Fetcher hashes came from a real prefetch, not a guess
- [ ] No stray `nix-audit-report.json` in `git status` (it's gitignored)

---

## 🤝 License

Your contributions fall under the project's licenses: MIT for source code,
CC BY 4.0 for course content. See [`LICENSE`](./LICENSE) and
[`LICENSE-CONTENT.md`](./LICENSE-CONTENT.md).
