// Render the canonical interactive loop diagram (docs/architecture/build-young-harness.html) to versioned exports.
//   build-young-harness.png = the COLLAPSED overview (compact inline image for BUILD-YOUNG-ARCHITECTURE.md).
//   build-young-harness.pdf = the FULLY-EXPANDED walkthrough (the zoomable/printable handout).
// build-young-harness.html is the SINGLE SOURCE — edit it, then re-run scripts/render-architecture.sh.
// Uses puppeteer-core driving the headless Chrome the Mermaid CLI provisions (~/.cache/puppeteer).
// Usage: node scripts/html-to-exports.cjs <input.html> <out-basename-without-ext>
const { existsSync } = require("fs");
const { execSync } = require("child_process");
const path = require("path");

function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) return process.env.PUPPETEER_EXECUTABLE_PATH;
  try {
    const hits = execSync(`ls -d "$HOME"/.cache/puppeteer/chrome/*/chrome-linux64/chrome 2>/dev/null`, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
    if (hits.length) return hits[hits.length - 1];
  } catch (e) {}
  throw new Error("No Chrome found. Set PUPPETEER_EXECUTABLE_PATH or install the puppeteer browser.");
}

(async () => {
  const [, , htmlPath, outBase] = process.argv;
  if (!htmlPath || !outBase) { console.error("usage: node html-to-exports.cjs <in.html> <outBase>"); process.exit(2); }
  const puppeteer = require("puppeteer-core");
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 900, deviceScaleFactor: 2 });
  await page.goto("file://" + path.resolve(htmlPath), { waitUntil: "networkidle0" });
  // Static export = the WHOLE diagram: reveal every progressive-reveal step, hide the presenter chrome.
  await page.evaluate(() => {
    document.querySelectorAll(".bar, .caption, .lede").forEach((c) => (c.style.display = "none"));
    document.querySelectorAll(".step").forEach((g) => g.classList.add("shown"));
  });
  await new Promise((r) => setTimeout(r, 200));

  // PNG: the VISUAL DIAGRAM only (the inline <svg>) — the image embedded in the architecture doc.
  const svg = await page.$(".diagram svg");
  await svg.screenshot({ path: outBase + ".png" });

  // PDF: the full page (the complete diagram) — the handout.
  await page.pdf({ path: outBase + ".pdf", printBackground: true, format: "A4", landscape: true, margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" } });

  await browser.close();
  console.log(`rendered ${htmlPath} -> ${outBase}.{png (full diagram), pdf (handout)}`);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
