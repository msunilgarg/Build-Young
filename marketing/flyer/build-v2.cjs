// Build Young — flyer v2 (student-facing, simple, in the "Malini Way" reference style).
// Renders an 8.5x11 PDF + a PNG preview via the cached Chrome (puppeteer-core). QR via `qrcode`.
// Run:  NODE_PATH=/tmp/pptr/node_modules:/tmp/qrp/node_modules \
//       PUPPETEER_EXECUTABLE_PATH=<chrome> node marketing/flyer/build-v2.cjs
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const puppeteer = require("puppeteer-core");

const NAVY = "#0b2c4a", ORANGE = "#ef7d22", TEAL = "#0a7d85", INK = "#24405a", MUTED = "#5b7a93";
const OUT = path.dirname(path.resolve(__filename));

// lucide-style line icons (stroke only)
const I = {
  rocket: '<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"/><path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"/>',
  sparkles: '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  trending: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  trophy: '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
};
const ic = (n, size, color, sw = "2") =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;

// brand mark — three ascending blocks + a teal spark
const MARK = `<svg width="34" height="34" viewBox="0 -10 58 68" style="vertical-align:-8px">
<rect x="0" y="34" width="16" height="22" rx="3" fill="${NAVY}" opacity="0.55"/><rect x="21" y="20" width="16" height="36" rx="3" fill="${NAVY}" opacity="0.78"/><rect x="42" y="2" width="16" height="54" rx="3" fill="${NAVY}"/><path d="M50 -8 l6 8 h-12 z" fill="${TEAL}"/></svg>`;

const checkItem = (t) =>
  `<div class="ci"><span class="cib">${ic("check", "0.16in", "#fff", "3")}</span><span>${t}</span></div>`;
const botIcon = (n, color) => `<div class="bi">${ic(n, "0.52in", color, "1.9")}</div>`;

(async () => {
  const qr = await QRCode.toString("https://www.build-young.com", {
    type: "svg", margin: 0, color: { dark: NAVY, light: "#00000000" },
  });

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: Letter; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Liberation Sans","DejaVu Sans",Arial,sans-serif; color: ${INK}; }
  .page { width: 8.5in; height: 11in; overflow: hidden; position: relative;
          background: linear-gradient(180deg,#cfeafc 0%,#e3f3fd 48%,#eef8ff 100%);
          padding: 0.5in 0.62in 0; display: flex; flex-direction: column; }
  .top { display:flex; flex-direction:column; align-items:center; }
  .url { font-size: 10.5pt; font-weight: 700; color: ${TEAL}; letter-spacing: .3px; }
  .brand { font-size: 22pt; font-weight: 800; color: ${NAVY}; letter-spacing: -.3px; margin-top: -2px; }
  .kicker { text-align:center; font-size: 14pt; font-weight: 800; color: ${NAVY}; letter-spacing: 1px; margin-top: 0.30in; }
  .h1 { text-align:center; font-size: 58pt; font-weight: 800; color: ${NAVY}; line-height: .98; letter-spacing: -1.5px; margin: 0.02in 0 0; }
  .h1 .ac { color: ${ORANGE}; }
  .sub { text-align:center; font-size: 12.5pt; color: ${INK}; line-height: 1.4; max-width: 6.1in; margin: 0.16in auto 0; }
  .sub b { color: ${NAVY}; }
  .midrow { display:flex; align-items:center; gap: 0.18in; margin: 0.26in 0 0; }
  .pill { background: ${ORANGE}; color:#fff; font-size: 12pt; font-weight: 800; letter-spacing:.4px;
          border-radius: 999px; padding: 9px 20px; white-space: nowrap; box-shadow: 0 4px 12px -4px ${ORANGE}; }
  .callout { font-size: 11.5pt; color: ${INK}; line-height: 1.35; flex: 1; }
  .callout b { color: ${ORANGE}; }
  .arrow { flex: 0 0 auto; }
  .card { background:#fff; border-radius: 16px; padding: 0.22in 0.28in; margin: 0.26in 0 0;
          box-shadow: 0 10px 26px -14px rgba(11,44,74,.4); }
  .card h3 { margin:0 0 0.12in; font-size: 12.5pt; font-weight: 800; color: ${NAVY}; }
  .ci { display:flex; align-items:flex-start; gap: 11px; font-size: 12.5pt; color: ${INK}; line-height: 1.3; margin: 9px 0; font-weight: 600; }
  .cib { flex:0 0 auto; width: 0.26in; height: 0.26in; border-radius: 50%; background: ${ORANGE};
         display:flex; align-items:center; justify-content:center; margin-top: 1px; }
  .cta { margin: 0.28in 0 0; background: ${ORANGE}; border-radius: 16px; padding: 0.22in 0.3in;
         display:flex; align-items:center; justify-content:space-between; gap: 0.24in; box-shadow: 0 10px 26px -12px ${ORANGE}; }
  .cta .l .t { font-size: 17pt; font-weight: 800; color:#fff; font-style: italic; line-height: 1.05; }
  .cta .l .u { font-size: 15pt; font-weight: 800; color:#fff; margin-top: 5px; }
  .cta .l .s { font-size: 10pt; color:#fff; opacity:.95; margin-top: 5px; }
  .qr { background:#fff; border-radius: 10px; padding: 7px; flex:0 0 auto; text-align:center; }
  .qr svg { width: 1.0in; height: 1.0in; display:block; }
  .qr .c { font-size: 7.5pt; font-weight: 800; color: ${NAVY}; margin-top: 3px; letter-spacing:.3px; }
  .bottom { margin-top: auto; display:flex; align-items:center; justify-content:space-between;
            padding: 0.2in 0.1in 0.26in; }
  .bi { opacity: .92; }
  </style></head><body>
  <div class="page">
    <div class="top">
      <div class="url">build-young.com</div>
      <div class="brand">${MARK} BUILD YOUNG</div>
    </div>

    <div class="kicker">A LIVE, 12-WEEK ONLINE COURSE</div>
    <div class="h1">BUILD WITH<br><span class="ac">AI.</span></div>
    <div class="sub">Build a <b>real product</b> with AI, take it <b>live on the internet</b>, and go get your
      <b>first customers</b> — <b>no coding</b> required; AI does the how.</div>

    <div class="midrow">
      <div class="pill">LIVE · SMALL GROUPS · ONLINE</div>
      <div class="arrow">
        <svg width="0.7in" height="0.5in" viewBox="0 0 70 50" fill="none" stroke="${ORANGE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 10 C 30 6, 52 14, 60 34"/><path d="M50 30 l11 6 l-3 -12"/></svg>
      </div>
      <div class="callout"><b>No coding</b> — you build with <b>Claude Code</b>. The real skill is taste:
        knowing what's worth making, and shipping it. The edge isn't a degree; it's <b>what you can build.</b></div>
    </div>

    <div class="card">
      <h3>What you'll do</h3>
      ${checkItem("Find a real problem &amp; build a product with AI")}
      ${checkItem("Take it live — real people can use it (and buy)")}
      ${checkItem("Learn to grow it: a funnel, the metrics, real customers")}
      ${checkItem("Present a capstone &amp; graduate with a certificate")}
    </div>

    <div class="cta">
      <div class="l">
        <div class="t">ENROLL NOW &mdash;</div>
        <div class="u">build-young.com</div>
        <div class="s">Live cohorts starting soon · Free 15-min intro call — talk to us first.</div>
        <div class="s"><b>Scholarships:</b> a limited number of funded seats each season, awarded by application.</div>
      </div>
      <div class="qr">${qr}<div class="c">SCAN TO ENROLL</div></div>
    </div>

    <div class="bottom">
      ${botIcon("bulb", NAVY)}${botIcon("sparkles", ORANGE)}${botIcon("code", TEAL)}${botIcon("rocket", ORANGE)}${botIcon("trending", NAVY)}${botIcon("trophy", TEAL)}
    </div>
  </div>
  </body></html>`;

  fs.writeFileSync(path.join(OUT, "build-young-flyer-v2.html"), html);

  const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({ path: path.join(OUT, "build-young-flyer-v2.pdf"), width: "8.5in", height: "11in", printBackground: true, pageRanges: "1" });
  await page.screenshot({ path: path.join(OUT, "build-young-flyer-v2.png") });
  await browser.close();
  console.log("wrote build-young-flyer-v2.{html,pdf,png}");
})().catch((e) => { console.error(e); process.exit(1); });
