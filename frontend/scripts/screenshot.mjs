#!/usr/bin/env node
/**
 * README screenshot generator
 * ---------------------------
 * Captures a polished screenshot of the app for the README (docs/screenshot.png):
 * loads the first runnable lesson, waits for the Tvix WASM runtime to boot,
 * clicks the first snippet's Run so a live result is visible, then captures a
 * 1440x900 viewport at 2x device scale (retina-crisp on GitHub).
 *
 * Usage: node scripts/screenshot.mjs [url] [outPath]
 *   url      dev server or static build, e.g. http://localhost:3000
 *            (default: $AUDIT_BASE_URL || http://localhost:3000)
 *   outPath  where to write the PNG, relative to the repo root
 *            (default: docs/screenshot.png)
 *
 * Examples:
 *   node scripts/screenshot.mjs                         # against the dev server
 *   node scripts/screenshot.mjs http://localhost:4173   # against a static build
 *   yarn screenshot                                    # same as the first form
 */
import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const baseUrl = process.env.AUDIT_BASE_URL || process.argv[2] || "http://localhost:3000";
const outPath = process.argv[3]
  ? path.resolve(process.cwd(), process.argv[3])
  : path.join(REPO_ROOT, "docs", "screenshot.png");

const url = `${baseUrl}/?lesson=language-basics`;

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 160));
  });

  // The app's default theme follows the OS. Pin light here so the README shot
  // is always the Gruvbox Light theme, independent of the machine running the script.
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);

  console.log(`loading ${url} …`);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
  // A previously saved pinned theme would override the OS preference, so clear
  // storage (after navigation — localStorage is inaccessible on about:blank)
  // and reload so the shot reflects the OS-following default.
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle2", timeout: 90000 });

  // The runtime banner disappears once Tvix WASM has initialized.
  await page
    .waitForFunction(() => !document.querySelector('[data-testid="sci-loading"]'), { timeout: 30000 })
    .catch(() => {
      throw new Error("runtime banner never disappeared — WASM init likely failed");
    });
  console.log("  runtime booted ✓");

  // Run the first runnable snippet so a live result is visible in the shot.
  await page.waitForSelector('[data-testid="snippet-run"]', { timeout: 15000 });
  await page.click('[data-testid="snippet-run"]');
  await page.waitForSelector('[data-testid="snippet-result"]', { timeout: 20000 });
  const snippetText = await page.$eval('[data-testid="snippet-result"]', (el) => el.textContent.trim());
  console.log(`  snippet result: ${JSON.stringify(snippetText)}`);

  // Settle, then capture.
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: outPath });
  console.log(`screenshot saved to ${outPath}`);

  if (errors.length) {
    console.warn("  page/console errors captured:", errors);
    process.exit(1);
  }
} finally {
  await browser.close();
}
