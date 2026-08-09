# Learn Nix — in your browser

An interactive, **runnable Nix curriculum** — a ~12-week course for developers
with basic command-line experience, taught entirely in the browser. Every
lesson is written in plain English, code is syntax-highlighted, and **pure Nix
expressions run right in the page** via the real Nix evaluator (Tvix) compiled
to WebAssembly — there is no backend and no server required.

- **29 lessons** across 11 modules, from *"What is Nix?"* to a **capstone**:
  Module 0 setup → the Nix language → derivations & `stdenv.mkDerivation` →
  classic Nix (`nix-shell`, channels) → **flakes** → dev shells → advanced
  packaging (`callPackage`, overlays) → the **NixOS module system** → Home
  Manager → Nix in CI/CD & production → capstone projects.
- A **reference section**: appendix of legacy features, an A–Z glossary, a
  traditional-vs-flake **command cheat sheet**, and further reading.
- **Runnable language lessons** — attribute sets, `let…in`, lambdas, `builtins`
  — evaluated by a real Nix evaluator compiled to WASM, with **auto-checked
  exercises** that accept any correct expression.

This app is the [multi-course course engine](https://github.com/jawuku/clojure-webdev-course)
reused for Nix content: the UI (sidebar, themes, search, REPL playground,
cheat sheet, progress tracking) is unchanged — only the course data and the
browser evaluator were swapped.

---

## ✨ Features

- **Runnable Nix code** in the language lessons — press **Run** (or
  `Ctrl/Cmd + Enter`) and evaluate with the Tvix WASM Nix evaluator.
- **Auto-checked exercises** — each evaluated against Nix boolean tests that
  accept *any* correct expression.
- **Read-only snippets** for everything that needs a real Nix install
  (derivations, flakes, Home Manager, `nix build`…), with a table block type
  for the build-phase and command reference tables.
- **Nix syntax highlighting** in every editor (CodeMirror 6 + Lezer Nix grammar)
  with a small builtins/keyword autocomplete.
- **Interactive REPL playground** (`nix-repl>`) for experimenting with pure Nix.
- **Reference Cheat Sheet** per course with click-to-run language examples.
- **Command palette** (`Ctrl/Cmd + K`, hinted on the trigger and in the palette footer): VS Code-style fuzzy search over lessons and quick actions — `opr` finds *Open REPL Playground*, title matches rank above body matches, and you can jump to any lesson, open the REPL or cheat sheet, or toggle the theme and font size. The footer advertises the full shortcut set (`⌘/Ctrl+K` open anytime, `↑/↓` navigate, `↵` select, `esc` close).
- **Clickable outbound links** — Resources-style list items render as external links, and `http(s)://` URLs inside paragraph text auto-link. Both open in a **new tab** (`rel="noopener noreferrer"`) and show a hover tooltip with the destination domain.
- **Two themes** — Kanagawa (dark) and Gruvbox (light) — plus adjustable text size.
- **Progress tracking + resume** in `localStorage`, and a course-complete
  celebration.
- **Shareable deep-links** (`?lesson=<id>`, `?view=repl`, `?view=cheatsheet`).
- A reusable **"course engine"** (`buildCourse`) so a future course is just a
  data file plus one registration entry.

---

## 🧰 Tech Stack

- **React 19** (Create React App + [CRACO](https://craco.js.org/))
- **CodeMirror 6** + [`@replit/codemirror-lang-nix`](https://github.com/replit/codemirror-lang-nix)
  for Nix highlighting (with the dormant Clojure mode retained for future courses)
- **[nix-eval](https://github.com/dvcorreia/nix-eval)** — the Nix evaluator
  (Tvix) compiled to WebAssembly, for in-browser evaluation
- **Tailwind CSS** + shadcn/ui components
- **Yarn** for package management

> The app is **100% client-side** — there is no backend, auth, or database.
> You only need to run the frontend.

---

## ✅ Prerequisites

- **Node.js 18+** (LTS recommended)
- **Yarn** (Classic v1). Install with `npm install -g yarn` if you don't have it.

---

## 🚀 Getting Started (run locally)

```bash
git clone <your-repo-url>
cd learn-nix/frontend

# 2. Install dependencies (use yarn, not npm)
yarn install

# 3. Start the dev server
yarn start
```

The app opens at **http://localhost:3000**.

> Use **Yarn**, not npm — the lockfile and resolutions are Yarn-based.

---

## 📦 Production Build

```bash
cd frontend
yarn build
```

This produces a static site in **`frontend/build/`**. Because the app is entirely
client-side, you can host that folder on **any static web host**.

Quick local preview of the build:

```bash
npx serve -s build
```

---

## 🌐 Deploying

The output is a static single-page app that uses **query-string** routing
(`?lesson=…`), so it works on plain static hosts **without** any SPA redirect
rules. `frontend/package.json` sets `"homepage": "."` (a relative base path that
works on GitHub Pages, Netlify, Vercel, custom domains).

### Netlify
- Base directory: `frontend`
- Build command: `yarn build`
- Publish directory: `frontend/build`

### Vercel
- Root directory: `frontend`
- Framework preset: **Create React App**
- Build command: `yarn build` · Output directory: `build`

### GitHub Pages
```bash
cd frontend
yarn install
yarn deploy        # runs predeploy (yarn build) then publishes build/ to the gh-pages branch
```

Then set **Settings → Pages → Source** to the **`gh-pages`** branch.

---

## 🗂️ Project Structure

```
frontend/src/
├── App.js                     # Shell: layout, routing, view switching
├── App.css                    # Themes (Kanagawa / Gruvbox) + all styling
├── course/
│   ├── registry.js            # buildCourse(): the reusable "course engine"
│   ├── nixCourse.js           # The Nix course, assembled from data/nixPart1..3
│   └── index.js               # COURSES list + default course id
├── context/
│   ├── CourseContext.jsx      # Injects the active course
│   └── AppContext.jsx         # Theme, font size, progress (per-course localStorage)
├── components/
│   ├── CodeEditor.jsx         # CodeMirror 6, Nix/Clojure modes, themes
│   ├── RunnableSnippet.jsx    # Editable/runnable Nix expression (Tvix WASM)
│   ├── StaticSnippet.jsx      # Read-only (non-runnable) preview code
│   ├── Exercise.jsx           # Exercise runner (Check / Run / Hint / Solution)
│   ├── Repl.jsx               # nix-repl playground + shortcuts cheatsheet
│   ├── CheatSheet.jsx         # Reference cheat sheet (click-to-run)
│   ├── CommandPalette.jsx     # Ctrl/Cmd+K search + navigation commands
│   ├── CourseComplete.jsx     # Course-complete celebration overlay
│   ├── Sidebar.jsx / Topbar.jsx / LessonView.jsx
├── data/
│   ├── nixPart1.js            # Modules 0–1 (setup + the Nix language)
│   ├── nixPart2.js            # Modules 2–5 (derivations, classic Nix, flakes, shells)
│   ├── nixPart3.js            # Modules 6–10 + reference (appendix, glossary, …)
│   └── nixCheatsheet.js       # Language cheat sheet + command reference
└── lib/
    ├── nix.js                 # nix-eval (Tvix WASM) wrapper: eval + exercise checking
    ├── run.js                 # Course-aware runtime dispatch (Nix / Clojure)
    ├── sci.js                 # Dormant SCI/Clojure path (kept for future courses)
    └── log.js                 # Dev-only logging helper
```

---

## 🧩 How code execution works

- **Runnable blocks** (`{ t: "code" }`), the **REPL** and the **cheat sheet**
  evaluate through `lib/nix.js`, which wraps `nix-eval` (the Nix evaluator
  compiled to WebAssembly). One evaluator instance is created lazily and reused.
- **Exercises** bind the learner's expression to `answer` and evaluate each
  Nix boolean test in the same expression (`let answer = (…); in (test)`), so
  many different correct solutions are accepted.
- **Read-only blocks** (`{ t: "read" }`) cover everything that needs a real
  Nix install: derivations, flakes, Home Manager, shell commands, CI configs.
- The course declares its runtime hooks (`evaluate`, `checkExercise`,
  `waitForRuntime`) in `course/nixCourse.js`; `lib/run.js` dispatches on them,
  keeping the engine able to host other languages later (the SCI/Clojure path
  in `lib/sci.js` is retained for that purpose).

---

## 🔗 Outbound links in lesson content

Lesson content supports two kinds of outbound links, both of which open in a
new tab with `target="_blank"` and `rel="noopener noreferrer"` (so the tooltip
on hover shows the destination domain — after a ~150ms hover, with a brief
linger on mouse-out so moving between adjacent links crossfades rather than
flickering; keyboard focus shows it too, and `prefers-reduced-motion` users get
it instantly):

- **List links** — a `list` block's items can be either a plain string or an
  object with `text` and `url`:

  ```js
  { t: "list", items: [
    "Plain list item (no link)",
    { text: "nix.dev — the official learning resource.", url: "https://nix.dev" },
  ]},
  ```

- **Inline auto-links** — any `http(s)://` URL in a `p` block's text is
  detected and linked automatically; trailing sentence punctuation stays
  outside the link, so `See https://nix.dev.` links the URL and keeps the
  period. A closing `)` is kept when it balances one inside the URL (e.g.
  `https://en.wikipedia.org/wiki/Nix_(package_manager)`).

The content audit (`yarn audit`) validates every list item is a string or a
`{ text, url }` object with an `http(s):`/`mailto:` URL, so malformed items
fail CI before they can ship.

---

## 🔑 Getting source hashes right (prefetch workflow)

Lesson data uses real `sha256` values in fetcher examples (e.g. `fetchurl`,
`fetchFromGitHub`). Don't guess or paste a placeholder — prefetch the hash
with Nix itself, no build required:

```bash
# Plain file / tarball -> fetchurl's sha256 (ships with Nix)
nix-prefetch-url https://example.com/my-program-1.0.0.tar.gz
# => 0abc123...

# Modern alternative (Nix 2.20+) -> fetchurl's hash field (SRI)
nix store prefetch-file https://example.com/my-program-1.0.0.tar.gz
# --json      machine-readable output
# --unpack    hash the unpacked tarball contents (what unpackPhase builds)

# GitHub repo -> fetchFromGitHub's rev + sha256 (separate nixpkgs script)
nix shell nixpkgs#nix-prefetch-git          # temporary install
nix-prefetch-git https://github.com/user/repo v1.0.0
# => { "rev": "...", "sha256": "..." }
```

Same workflow is taught to learners in `curriculum.md` §2.5 and the
`mkderivation` lesson; the Module 2 exercise 5 asks them to try it on real
URLs. Keep the two sources in sync when you edit fetcher content.

---

## ✅ Content audit

`yarn audit` (Node-only, no browser needed) evaluates **every** runnable
snippet, exercise solution and cheat-sheet example with the same Tvix WASM
evaluator the app uses, and exits non-zero on any failure:

```bash
cd frontend
yarn audit
```

This runs on CI on every push/PR (`.github/workflows/cheat-audit.yml`).

`yarn smoke` additionally drives the app through a real (headless) browser to
prove the WASM runtime boots in-browser and snippets/exercises/cheat-sheet
work end-to-end. It needs a dev server on `AUDIT_BASE_URL` (default
`http://localhost:3000`) and the `puppeteer` devDependency (which downloads
its own Chrome; set `PUPPETEER_SKIP_DOWNLOAD=1` and `CHROME_PATH` to skip).

---

## ♻️ Reusing the UI for another course

The UI is course-agnostic. To add another course with the **same interface,
themes, REPL, search and cheat sheet**, supply new data via `buildCourse` and
register it in `src/course/index.js`:

```js
// src/course/myCourse.js
import { buildCourse } from "./registry";
import { myLessons } from "../data/myLessons";

export const myCourse = buildCourse({
  id: "my-course",
  name: "My Course",
  tagline: "Learn Something",
  storageKey: "my_course_v1",
  lessons: myLessons,
  // Optional: a different in-browser evaluator (see lib/nix.js for the model)
  evaluate: async (code) => ({ ok: true, value: "...", output: "", error: null }),
  checkExercise: async (userCode, tests) => ({ passed: true, results: [], runError: null }),
  editorLang: "nix",        // "nix" | "clojure"
  runtimeBlurb: "Runs 100% in your browser",
});
```

```js
// src/course/index.js
import { nixCourse } from "./nixCourse";
import { myCourse } from "./myCourse";

export const COURSES = [nixCourse, myCourse];
```

That's it — the sidebar switcher, routing, progress tracking and search pick
it up automatically.

---

## 📝 License

- **Source code** — licensed under the [MIT License](./LICENSE).
- **Course content** (all lesson prose, exercises, examples and cheat-sheet
  entries, derived from `curriculum.md`) — licensed under **Creative Commons
  Attribution 4.0 International (CC BY 4.0)**. See [LICENSE-CONTENT.md](./LICENSE-CONTENT.md).

Copyright (c) 2026 Jason Awuku.
