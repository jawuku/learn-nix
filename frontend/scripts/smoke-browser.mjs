#!/usr/bin/env node
/**
 * Browser smoke test — the one check Node can't do: proves the nix-eval WASM
 * runtime actually boots inside a real browser and drives the UI end-to-end.
 *
 *  1. Loads the app on the first runnable lesson (?lesson=language-basics).
 *  2. Waits for the in-browser runtime banner to disappear (WASM initialized).
 *  3. Clicks the first snippet's Run button and asserts a result appears.
 *  4. Clicks the first exercise's Check button and asserts a verdict appears.
 *  5. Drives the REPL practice tour from the repl-idioms lesson end-to-end.
 *  6. Exercises the command palette (fuzzy jump, theme toggle).
 *  7. Renders outbound lesson links + delay-aware tooltips (incl. the
 *     viewport-edge flip).
 *  8. Auto-links http(s):// URLs inside paragraph text (new-tab + tooltip).
 *  9. Verifies the FHS Environments lesson renders the freebuff flake.
 * 10. Verifies the stdenv.mkDerivation lesson's Fetchers prefetch workflow
 *     (nix-prefetch-url / nix store prefetch-file --json/--unpack / nix-prefetch-git)
 *     and its prefetch exercise render fully.
 * 11. Fails on any uncaught page error or console error.
 *
 * Usage: node scripts/smoke-browser.mjs [url]  (default http://localhost:3000)
 * Env:  AUDIT_BASE_URL overrides the url; CHROME_PATH overrides the browser.
 */
import puppeteer from "puppeteer";

const baseUrl = process.env.AUDIT_BASE_URL || process.argv[2] || "http://localhost:3000";
const url = `${baseUrl}/?lesson=language-basics`;

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 160)));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160));
  });

  console.log(`loading ${url} …`);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });

  // 1. The runtime banner disappears once Tvix WASM has initialized.
  console.log("waiting for the in-browser runtime to boot…");
  await page
    .waitForFunction(() => !document.querySelector('[data-testid="sci-loading"]'), { timeout: 30000 })
    .catch(() => {
      throw new Error("runtime banner never disappeared — WASM init likely failed");
    });
  console.log("  runtime banner gone ✓");

  // 2. Run the first runnable snippet.
  await page.waitForSelector('[data-testid="snippet-run"]', { timeout: 15000 });
  await page.click('[data-testid="snippet-run"]');
  await page.waitForSelector('[data-testid="snippet-result"]', { timeout: 20000 });
  const snippetText = await page.$eval('[data-testid="snippet-result"]', (el) => el.textContent.trim());
  console.log(`  snippet result: ${JSON.stringify(snippetText)}`);
  if (!snippetText || snippetText.includes("error")) {
    throw new Error(`snippet produced no/errored result: ${snippetText}`);
  }

  // 3. Check the first exercise (starter is intentionally wrong: 1 + 1 != 42,
  //    so we expect a verdict banner to appear — proving the harness runs).
  await page.waitForSelector('[data-testid="exercise-check-0"]', { timeout: 15000 });
  await page.click('[data-testid="exercise-check-0"]');
  await page.waitForSelector('[data-testid="exercise-result-0"]', { timeout: 20000 });
  const checkText = await page.$eval('[data-testid="exercise-result-0"]', (el) => el.textContent.trim().slice(0, 120));
  console.log(`  exercise verdict: ${JSON.stringify(checkText)}`);
  if (!checkText) throw new Error("exercise check produced no verdict");

  // 4. Render a table block (commands lesson) and the cheat sheet to be safe.
  await page.goto(`${baseUrl}/?lesson=commands`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector(".lesson-table", { timeout: 15000 });
  const tableText = await page.$eval(".lesson-table", (el) => el.textContent.trim().slice(0, 60));
  console.log(`  commands table renders: ${JSON.stringify(tableText)}`);

  await page.goto(`${baseUrl}/?view=cheatsheet`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector('[data-testid="cheat-run"]', { timeout: 15000 });
  await page.click('[data-testid="cheat-run"]');
  await page.waitForSelector('[data-testid="cheat-result"]', { timeout: 20000 });
  const cheatText = await page.$eval('[data-testid="cheat-result"]', (el) => el.textContent.trim().slice(0, 60));
  console.log(`  cheat-sheet run result: ${JSON.stringify(cheatText)}`);
  if (!cheatText) throw new Error("cheat-sheet example produced no result");

  // 5. REPL practice tour: from the repl-idioms lesson, click "Practice in
  //    the REPL" (pre-seeds the editor with the curated tour), Run it, and
  //    expect one evaluated entry per blank-line-separated block.
  await page.goto(`${baseUrl}/?lesson=repl-idioms`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector('[data-testid="lesson-repl-btn"]', { timeout: 15000 });
  await page.click('[data-testid="lesson-repl-btn"]');
  await page.waitForSelector('[data-testid="repl"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="repl-run"]', { timeout: 15000 });
  await page.click('[data-testid="repl-run"]');
  await page
    .waitForFunction(() => document.querySelectorAll(".repl-entry").length >= 8, { timeout: 30000 })
    .catch(() => {});
  const entryCount = await page.$$eval(".repl-entry", (els) => els.length);
  const errorCount = await page.$$eval(".repl-entry .out-error", (els) => els.length);
  const logSnippet = await page.$eval(".repl-log", (el) => el.textContent.trim().slice(0, 300));
  const firstValue = await page.$eval(".repl-entry .out-value", (el) => el.textContent.trim().slice(0, 40)).catch(() => "");
  console.log(`  repl tour entries: ${entryCount} (first: ${JSON.stringify(firstValue)}, errors: ${errorCount})`);
  if (entryCount < 8 || errorCount > 0) {
    console.log("  repl log snippet:", JSON.stringify(logSnippet));
    throw new Error(`REPL tour produced ${entryCount} results with ${errorCount} errors`);
  }
  if (!firstValue) throw new Error("REPL tour produced no values");

  // 6. Command palette: Cmd/Ctrl+K opens it, "repl" surfaces the REPL action
  //    and clicking it navigates; reopening and searching a lesson jumps there.
  //    Start from a lesson view so the REPL assertion can't false-pass.
  await page.goto(`${baseUrl}/?lesson=language-basics`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.keyboard.down("Meta");
  await page.keyboard.press("k");
  await page.keyboard.up("Meta");
  await page.waitForSelector('[data-testid="command-palette"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="palette-input"]', { timeout: 15000 });
  // The palette footer advertises its shortcuts (navigate / select / close).
  await page.waitForSelector('[data-testid="palette-footer"]', { timeout: 5000 });
  const footerHint = await page.$eval('[data-testid="palette-footer"]', (el) => el.textContent.trim());
  console.log(`  palette footer hint: ${JSON.stringify(footerHint)}`);
  if (!/navigate/.test(footerHint) || !/select/.test(footerHint) || !/close/.test(footerHint)) {
    throw new Error(`palette footer should advertise its shortcuts (got ${JSON.stringify(footerHint)})`);
  }
  // Fuzzy matching: "opr" (o-p-r subsequence) must surface the REPL action.
  await page.type('[data-testid="palette-input"]', "opr");
  await page.waitForSelector('[data-testid="palette-action-repl"]', { timeout: 15000 });
  await page.click('[data-testid="palette-action-repl"]');
  await page.waitForSelector('[data-testid="repl"]', { timeout: 15000 });
  const replTitle = await page.$eval(".repl-title", (el) => el.textContent.trim());
  console.log(`  palette → REPL: ${JSON.stringify(replTitle)}`);
  if (!replTitle.includes("REPL") || !page.url().includes("view=repl")) {
    throw new Error("palette REPL action did not navigate");
  }

  await page.goto(`${baseUrl}/?lesson=language-basics`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.keyboard.down("Meta");
  await page.keyboard.press("k");
  await page.keyboard.up("Meta");
  await page.waitForSelector('[data-testid="palette-input"]', { timeout: 15000 });
  // "modern standard" also matches the setup lesson's prose, so pick the exact
  // Flakes lesson row by its title instead of assuming the first result.
  await page.type('[data-testid="palette-input"]', "modern standard");
  await page.waitForSelector('[data-testid^="palette-result-"]', { timeout: 15000 });
  const resultCount = await page.$$eval('[data-testid^="palette-result-"]', (els) => els.length);
  const found = await page.$$eval(
    '[data-testid^="palette-result-"]',
    (els, q) => {
      const el = els.find((e) => e.textContent.includes(q));
      if (el) el.setAttribute("data-smoke-target", "1");
      return !!el;
    },
    "Flakes: The Modern Standard"
  );
  if (!found) throw new Error("palette did not surface the Flakes lesson");
  await page.click('[data-smoke-target="1"]');
  await page.waitForFunction(
    () => {
      const t = document.querySelector('[data-testid="topbar-title"]');
      return t && /flake/i.test(t.textContent);
    },
    { timeout: 15000 }
  );
  const jumpedLesson = await page.$eval('[data-testid="topbar-title"]', (el) => el.textContent.trim());
  console.log(`  palette → lesson (${resultCount} results): ${JSON.stringify(jumpedLesson)}`);
  if (!page.url().includes("lesson=")) throw new Error("palette lesson jump did not update the URL");

  // Theme action keeps the palette open and flips the theme immediately.
  await page.keyboard.down("Meta");
  await page.keyboard.press("k");
  await page.keyboard.up("Meta");
  await page.waitForSelector('[data-testid="palette-input"]', { timeout: 15000 });
  const themeBefore = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme")
  );
  await page.click('[data-testid="palette-action-theme"]');
  await page.waitForFunction(
    (t) => document.documentElement.getAttribute("data-theme") !== t,
    { timeout: 15000 },
    themeBefore
  );
  const themeAfter = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme")
  );
  const paletteStillOpen = !!(await page.$('[data-testid="command-palette"]'));
  console.log(`  palette → theme: ${themeBefore} → ${themeAfter} (open: ${paletteStillOpen})`);
  if (!paletteStillOpen) throw new Error("theme action should keep the palette open");

  // 7. Resources lesson: external links render clickable and open in a new tab.
  await page.goto(`${baseUrl}/?lesson=resources`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector(".lesson-link", { timeout: 15000 });
  const linkCount = await page.$$eval(".lesson-link", (els) => els.length);
  const firstLink = await page.$eval(".lesson-link", (el) => ({
    href: el.getAttribute("href"),
    target: el.getAttribute("target"),
    rel: el.getAttribute("rel"),
  }));
  console.log(`  resources links: ${linkCount} (first: ${JSON.stringify(firstLink)})`);
  if (linkCount < 5) throw new Error(`resources lesson should link out (got ${linkCount})`);
  if (firstLink.target !== "_blank") throw new Error("lesson links must open in a new tab");
  if (!(firstLink.rel || "").includes("noopener")) throw new Error("lesson links need rel=noopener");

  // Hovering a lesson link shows a tooltip with the domain + new-tab hint.
  // The tooltip is delay-aware: it must NOT appear instantly — only after a
  // brief (~150ms) hover.
  //
  // Warm-up: headless Chrome skips the very first hover transition after a
  // page load (no base style has been painted yet), so run one full
  // show/hide cycle first to make the delay assertions deterministic.
  await page.hover(".lesson-link");
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector(".lesson-link"), "::after").opacity === "1",
    { timeout: 5000 }
  );
  await page.mouse.move(10, 10);
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector(".lesson-link"), "::after").opacity === "0",
    { timeout: 5000 }
  );

  await page.hover(".lesson-link");
  const preDelayOpacity = await page.$eval(
    ".lesson-link",
    (el) => getComputedStyle(el, "::after").opacity
  );
  if (preDelayOpacity !== "0") {
    throw new Error(
      `tooltip should wait ~150ms before appearing (opacity=${preDelayOpacity} right after hover)`
    );
  }
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector(".lesson-link"), "::after").opacity === "1",
    { timeout: 5000 }
  );
  const tooltip = await page.$eval(".lesson-link", (el) => ({
    content: getComputedStyle(el, "::after").content,
    opacity: getComputedStyle(el, "::after").opacity,
    showDelay: getComputedStyle(el, "::after").transitionDelay,
  }));
  console.log(`  lesson link tooltip: ${JSON.stringify(tooltip)}`);
  if (!tooltip.content.includes("nix.dev") || !tooltip.content.includes("new tab")) {
    throw new Error(`tooltip should show domain + new-tab hint (got ${tooltip.content})`);
  }
  if (tooltip.opacity !== "1") throw new Error("tooltip should be visible on hover");
  if (!tooltip.showDelay.includes("0.15s")) {
    throw new Error(`tooltip show transition should delay ~150ms (got ${tooltip.showDelay})`);
  }

  // Moving straight to the neighbouring link must not flicker: the first
  // tooltip lingers (hide grace) while the next one fades in.
  const listLinks = await page.$$(".lesson-link");
  if (listLinks.length < 2) throw new Error("need >=2 lesson links for the flicker check");
  await listLinks[1].hover();
  const graceOpacity = await page.$eval(
    ".lesson-link",
    (el) => getComputedStyle(el, "::after").opacity
  );
  if (graceOpacity !== "1") {
    throw new Error(
      `tooltip should not flicker between links (first link opacity=${graceOpacity} right after moving on)`
    );
  }
  await page.waitForFunction(
    () => {
      const els = document.querySelectorAll(".lesson-link");
      return (
        els.length >= 2 &&
        getComputedStyle(els[0], "::after").opacity === "0" &&
        getComputedStyle(els[1], "::after").opacity === "1"
      );
    },
    { timeout: 5000 }
  );
  console.log("  tooltip crossfade between adjacent links: ok");

  // 7b. When a link sits near the top edge of the viewport the tooltip would
  // clip above the screen, so it flips to render below the link. The app's
  // topbar reserves 62px above the scroll area (links can't reach the very
  // top edge in the default layout), so hide it to exercise the flip path.
  await page.evaluate(() => {
    const scroller = document.querySelector(".main-scroll");
    scroller.style.scrollBehavior = "auto";
    document.querySelector(".topbar-row").style.display = "none";
    document.querySelector(".lesson-link").scrollIntoView({ block: "start" });
  });
  await page.waitForFunction(
    () => document.querySelector(".lesson-link").getBoundingClientRect().top < 20,
    { timeout: 5000 }
  );
  await new Promise((r) => setTimeout(r, 100));
  await page.hover(".lesson-link");
  // Wait for React to commit the flip state before reading it.
  await page.waitForFunction(
    () => document.querySelector(".lesson-link").classList.contains("lesson-link-flip"),
    { timeout: 5000 }
  );
  const nearTop = await page.$eval(".lesson-link", (el) => ({
    flip: el.classList.contains("lesson-link-flip"),
    top: getComputedStyle(el, "::after").top,
    bottom: getComputedStyle(el, "::after").bottom,
    rectTop: Math.round(el.getBoundingClientRect().top),
  }));
  console.log(`  tooltip flip (link near top): ${JSON.stringify(nearTop)}`);
  if (!nearTop.flip) {
    throw new Error(
      `tooltip should flip below a link near the top (rectTop=${nearTop.rectTop})`
    );
  }
  // With the flipped placement the bubble's `top` resolves positive (below the
  // link's top edge) while `bottom` goes negative; the normal placement is the
  // mirror image (top negative, bottom positive).
  const flipTop = parseFloat(nearTop.top);
  const flipBottom = parseFloat(nearTop.bottom);
  if (!(flipTop > 0 && flipBottom < 0)) {
    throw new Error(
      `flipped tooltip must be positioned below the link (top=${nearTop.top}, bottom=${nearTop.bottom})`
    );
  }
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector(".lesson-link"), "::after").opacity === "1",
    { timeout: 5000 }
  );

  // Restore the layout and scroll the link to mid-viewport: the placement
  // reverts to above the link.
  await page.evaluate(() => {
    const scroller = document.querySelector(".main-scroll");
    document.querySelector(".topbar-row").style.display = "";
    document.querySelector(".lesson-link").scrollIntoView({ block: "center" });
    scroller.style.scrollBehavior = "";
  });
  await page.waitForFunction(
    () => document.querySelector(".lesson-link").getBoundingClientRect().top > 100,
    { timeout: 5000 }
  );
  await new Promise((r) => setTimeout(r, 100));
  await page.hover(".lesson-link");
  // Wait for React to commit the revert before reading it.
  await page.waitForFunction(
    () => !document.querySelector(".lesson-link").classList.contains("lesson-link-flip"),
    { timeout: 5000 }
  );
  const midView = await page.$eval(".lesson-link", (el) => ({
    flip: el.classList.contains("lesson-link-flip"),
    top: getComputedStyle(el, "::after").top,
  }));
  console.log(`  tooltip placement (mid viewport): ${JSON.stringify(midView)}`);
  if (midView.flip) throw new Error("tooltip should stay above a mid-viewport link");
  // Normal placement: the bubble's top edge resolves negative (above the link).
  if (!(parseFloat(midView.top) < 0)) {
    throw new Error(`mid-viewport tooltip should be above the link (top=${midView.top})`);
  }

  // 8. Inline URLs inside paragraph blocks auto-link too (http(s):// in p
  //    text), opening in a new tab — with trailing sentence punctuation
  //    staying as plain text outside the link.
  await page.goto(`${baseUrl}/?lesson=setup`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector('[data-testid^="inline-link-"]', { timeout: 15000 });
  const inlineLink = await page.$eval('[data-testid^="inline-link-"]', (el) => ({
    href: el.getAttribute("href"),
    target: el.getAttribute("target"),
    rel: el.getAttribute("rel"),
    text: el.textContent.trim().slice(0, 60),
    tail: el.nextSibling ? el.nextSibling.textContent : "",
  }));
  console.log(`  inline p link: ${JSON.stringify(inlineLink)}`);
  if (inlineLink.href !== "https://install.determinate.systems/nix") {
    throw new Error(`inline paragraph URL did not auto-link (href=${inlineLink.href})`);
  }
  if (inlineLink.target !== "_blank") throw new Error("inline links must open in a new tab");
  if (!(inlineLink.rel || "").includes("noopener")) throw new Error("inline links need rel=noopener");
  if (inlineLink.tail !== ")") {
    throw new Error(`trailing punctuation should stay outside the inline link (got ${JSON.stringify(inlineLink.tail)})`);
  }

  // Inline links get the same hover tooltip (domain + new-tab hint) — also
  // delay-aware (not visible instantly). Warm up one show/hide cycle first
  // (the page.goto above is a fresh load ⇒ the first-hover transition is
  // skipped in headless Chrome).
  await page.hover('[data-testid^="inline-link-"]');
  await page.waitForFunction(
    () =>
      getComputedStyle(
        document.querySelector('[data-testid^="inline-link-"]'),
        "::after"
      ).opacity === "1",
    { timeout: 5000 }
  );
  await page.mouse.move(10, 10);
  await page.waitForFunction(
    () =>
      getComputedStyle(
        document.querySelector('[data-testid^="inline-link-"]'),
        "::after"
      ).opacity === "0",
    { timeout: 5000 }
  );
  await page.hover('[data-testid^="inline-link-"]');
  const inlinePreDelay = await page.$eval(
    '[data-testid^="inline-link-"]',
    (el) => getComputedStyle(el, "::after").opacity
  );
  if (inlinePreDelay !== "0") {
    throw new Error(
      `inline tooltip should also wait ~150ms (opacity=${inlinePreDelay} right after hover)`
    );
  }
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector('[data-testid^="inline-link-"]'), "::after").opacity === "1",
    { timeout: 5000 }
  );
  const inlineTip = await page.$eval('[data-testid^="inline-link-"]', (el) =>
    getComputedStyle(el, "::after").content
  );
  console.log(`  inline link tooltip: ${JSON.stringify(inlineTip)}`);
  if (!inlineTip.includes("install.determinate.systems") || !inlineTip.includes("new tab")) {
    throw new Error(`inline tooltip should show domain + hint (got ${inlineTip})`);
  }

  // 9. FHS Environments lesson (Module 6): renders the buildFHSEnv content,
  //    quotes the real freebuff-nix flake, and the { text, url } exercise
  //    link gets the standard new-tab + tooltip treatment. CodeMirror renders
  //    long read-only blocks lazily, so scroll the flake editor into view
  //    before asserting its (full) content.
  await page.goto(`${baseUrl}/?lesson=fhs-environments`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(
    () => {
      const t = document.querySelector('[data-testid="topbar-title"]');
      return t && /FHS Environments/.test(t.textContent);
    },
    { timeout: 15000 }
  );
  const fhsTitle = await page.$eval('[data-testid="topbar-title"]', (el) => el.textContent.trim());
  // Scroll the abridged freebuff flake editor (the one containing freebuffEnv)
  // fully into view so CodeMirror materializes every line.
  await page.evaluate(() => {
    const hosts = [...document.querySelectorAll(".cm-host")];
    const target = hosts.find((h) =>
      (h.querySelector(".cm-content") || { textContent: "" }).textContent.includes("freebuffEnv")
    );
    if (target) target.scrollIntoView({ block: "center" });
  });
  await page.waitForFunction(
    () => {
      const hosts = [...document.querySelectorAll(".cm-host")];
      const target = hosts.find((h) =>
        (h.querySelector(".cm-content") || { textContent: "" }).textContent.includes("freebuffEnv")
      );
      return (
        !!target &&
        (target.querySelector(".cm-content") || { textContent: "" }).textContent.includes(
          "npx --yes freebuff"
        )
      );
    },
    { timeout: 10000 }
  );
  const fhsBody = await page.evaluate(() => document.body.textContent);
  if (!/buildFHSEnvBubblewrap/.test(fhsBody) || !/npx --yes freebuff/.test(fhsBody)) {
    throw new Error("FHS lesson should render the buildFHSEnv content and the freebuff runScript");
  }
  const fhsLink = await page.$('a.lesson-link[href="https://github.com/jawuku/freebuff-nix"]');
  if (!fhsLink) throw new Error("FHS lesson should link the real freebuff-nix flake");
  const fhsLinkAttrs = await page.$eval(
    'a.lesson-link[href="https://github.com/jawuku/freebuff-nix"]',
    (el) => ({ target: el.getAttribute("target"), rel: el.getAttribute("rel") })
  );
  if (fhsLinkAttrs.target !== "_blank" || !(fhsLinkAttrs.rel || "").includes("noopener")) {
    throw new Error(`freebuff-nix link should open in a new tab (got ${JSON.stringify(fhsLinkAttrs)})`);
  }
  await page.hover('a.lesson-link[href="https://github.com/jawuku/freebuff-nix"]');
  await page.waitForFunction(
    () =>
      getComputedStyle(
        document.querySelector('a.lesson-link[href="https://github.com/jawuku/freebuff-nix"]'),
        "::after"
      ).opacity === "1",
    { timeout: 5000 }
  );
  const fhsTip = await page.$eval(
    'a.lesson-link[href="https://github.com/jawuku/freebuff-nix"]',
    (el) => getComputedStyle(el, "::after").content
  );
  console.log(`  FHS lesson: ${JSON.stringify(fhsTitle)} — link ${JSON.stringify(fhsTip)}`);
  if (!fhsTip.includes("github.com") || !fhsTip.includes("new tab")) {
    throw new Error(`freebuff link tooltip should show domain + hint (got ${fhsTip})`);
  }

  // 10. stdenv.mkDerivation lesson (Module 2): the Fetchers section renders the
  //     hash-prefetch workflow (nix-prefetch-url, nix store prefetch-file with
  //     --json/--unpack, nix-prefetch-git) and the Module 2 prefetch exercise.
  //     CodeMirror renders long read-only blocks lazily, so scroll the prefetch
  //     editor into view before asserting its (full) content.
  await page.goto(`${baseUrl}/?lesson=mkderivation`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(
    () => {
      const t = document.querySelector('[data-testid="topbar-title"]');
      return t && /stdenv\.mkDerivation/.test(t.textContent);
    },
    { timeout: 15000 }
  );
  const mkTitle = await page.$eval('[data-testid="topbar-title"]', (el) => el.textContent.trim());
  // Scroll the prefetch editor (the one containing nix-prefetch-url) fully
  // into view so CodeMirror materializes every line — the block is long, so
  // also scroll the editor's internal scroller to its end (the HEAD note is
  // the last content) before asserting.
  await page.evaluate(() => {
    const hosts = [...document.querySelectorAll(".cm-host")];
    const target = hosts.find((h) =>
      (h.querySelector(".cm-content") || { textContent: "" }).textContent.includes("nix-prefetch-url")
    );
    if (target) {
      target.scrollIntoView({ block: "center" });
      const scroller = target.querySelector(".cm-scroller");
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    }
  });
  await page.waitForFunction(
    () => {
      const hosts = [...document.querySelectorAll(".cm-host")];
      const target = hosts.find((h) =>
        (h.querySelector(".cm-content") || { textContent: "" }).textContent.includes("nix-prefetch-url")
      );
      // Wait for the very last line of the block (the HEAD-note tail) — if
      // that is materialized, everything before it is too.
      return (
        !!target &&
        (target.querySelector(".cm-content") || { textContent: "" }).textContent.includes(
          "Omitting the rev fetches the current HEAD"
        )
      );
    },
    { timeout: 10000 }
  );
  const mkBody = await page.evaluate(() => document.body.textContent);
  if (
    !/nix-prefetch-url https:\/\/example\.com\/my-program-1\.0\.0\.tar\.gz/.test(mkBody) ||
    !/nix store prefetch-file --json/.test(mkBody) ||
    !/nix store prefetch-file --unpack/.test(mkBody) ||
    !/nix-prefetch-git https:\/\/github\.com\/user\/repo/.test(mkBody) ||
    !/Omitting the rev fetches the current HEAD/.test(mkBody) ||
    !/Prefetch a real tarball/.test(mkBody)
  ) {
    throw new Error(
      "mkderivation lesson should render the prefetch workflow and its exercise"
    );
  }
  console.log(`  Fetchers lesson: ${JSON.stringify(mkTitle)} — prefetch block + exercise ✓`);

  console.log(`page errors: ${pageErrors.length}`, pageErrors.slice(0, 5));
  console.log(`console errors: ${consoleErrors.length}`, consoleErrors.slice(0, 5));
  if (pageErrors.length) throw new Error("page errors: " + pageErrors.slice(0, 3).join(" | "));
  console.log("SMOKE TEST PASSED");
} finally {
  await browser.close();
}
