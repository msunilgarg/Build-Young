// Convert a hand-authored SVG to PNG + PDF exports (for docs/architecture/).
// Usage: node scripts/svg-to-exports.cjs <input.svg> <out-basename-without-ext>
// Reproducible alongside the Mermaid renderer: it uses puppeteer-core driving a headless Chrome
// (the same browser the Mermaid CLI uses). Chrome is located via $PUPPETEER_EXECUTABLE_PATH or the
// puppeteer cache (~/.cache/puppeteer/chrome/*/chrome-linux64/chrome). Deterministic output size =
// the SVG's own width/height; PNG at 2x for crisp previews, PDF as a single page that size.
const { readFileSync, existsSync } = require("fs");
const { execSync } = require("child_process");

function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) return process.env.PUPPETEER_EXECUTABLE_PATH;
  try {
    const hits = execSync(`ls -d "$HOME"/.cache/puppeteer/chrome/*/chrome-linux64/chrome 2>/dev/null`, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
    if (hits.length) return hits[hits.length - 1];
  } catch (e) {}
  throw new Error("No Chrome found. Set PUPPETEER_EXECUTABLE_PATH or install the puppeteer browser.");
}

(async () => {
  const [, , svgPath, outBase] = process.argv;
  if (!svgPath || !outBase) { console.error("usage: node svg-to-exports.cjs <in.svg> <outBase>"); process.exit(2); }
  const svg = readFileSync(svgPath, "utf8");
  const w = Math.ceil(parseFloat(svg.match(/\bwidth="(\d+(?:\.\d+)?)"/)[1]));
  const h = Math.ceil(parseFloat(svg.match(/\bheight="(\d+(?:\.\d+)?)"/)[1]));
  const puppeteer = require("puppeteer-core");
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0}</style></head><body>${svg}</body></html>`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: outBase + ".png" });
  await page.pdf({ path: outBase + ".pdf", width: w + "px", height: h + "px", printBackground: true, pageRanges: "1" });
  await browser.close();
  console.log(`rendered ${svgPath} -> ${outBase}.{png,pdf} (${w}x${h})`);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
