// Render the canonical interactive loop diagram (docs/architecture/loop.html) to versioned exports.
//   loop.png = the COLLAPSED overview (compact inline image for BUILD-YOUNG-ARCHITECTURE.md).
//   loop.pdf = the FULLY-EXPANDED walkthrough (the zoomable/printable handout).
// loop.html is the SINGLE SOURCE — edit it, then re-run scripts/render-architecture.sh.
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
  // The interactive controls/hints are meaningless in a static export — hide them.
  await page.evaluate(() => { document.querySelectorAll(".controls, .hint").forEach((c) => (c.style.display = "none")); });

  // PNG: the VISUAL DIAGRAM only (the inline <svg>) — the image embedded in the architecture doc.
  const svg = await page.$(".diagram svg");
  await svg.screenshot({ path: outBase + ".png" });

  // PDF: the diagram + EVERY detail card expanded — the full handout. break-inside:avoid keeps cards whole.
  await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
  await new Promise((r) => setTimeout(r, 150));
  await page.pdf({ path: outBase + ".pdf", printBackground: true, format: "A4", margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });

  await browser.close();
  console.log(`rendered ${htmlPath} -> ${outBase}.{png (the diagram), pdf (diagram + all detail)}`);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
