// ============================ POSTBUILD: static prerender for crawlers ============================
//
// Build Young is a client-rendered SPA, so a crawler that doesn't execute JavaScript would otherwise
// see an empty <div id="root">. Googlebot renders JS, but Bing, social scrapers, and many AI bots
// don't reliably — so we inject a STATIC content snapshot into #root at build time.
//
// Single source of truth: we reuse the rich <noscript> block already in index.html (so the snapshot
// can never drift from it). Real visitors never see it — a head script adds a `.js` class that hides
// #prerender before first paint, and React clears #root on mount anyway. Non-JS crawlers get the
// full marketing content.
//
// Zero new dependencies; runs automatically after `npm run build` via the npm `postbuild` lifecycle.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(here, "..", "dist", "index.html");

let html;
try {
  html = await readFile(htmlPath, "utf8");
} catch {
  console.warn("[prerender] dist/index.html not found — skipping (did the build run?).");
  process.exit(0);
}

if (html.includes('id="prerender"')) {
  console.log("[prerender] snapshot already present — nothing to do.");
  process.exit(0);
}

// Pull the inner HTML of the existing <noscript> fallback.
const m = html.match(/<noscript>([\s\S]*?)<\/noscript>/i);
if (!m) {
  console.warn("[prerender] no <noscript> block found — skipping snapshot injection.");
  process.exit(0);
}

// Drop the "please enable JavaScript" line — it's meaningless to a crawler reading the snapshot.
const snapshot = m[1].replace(/\s*<p><em>This experience[\s\S]*?<\/em><\/p>/i, "").trim();

const rootEmpty = '<div id="root"></div>';
if (!html.includes(rootEmpty)) {
  console.warn('[prerender] could not find an empty <div id="root"></div> — skipping (markup changed?).');
  process.exit(0);
}

const injected = `<div id="root"><div id="prerender">${snapshot}</div></div>`;
html = html.replace(rootEmpty, injected);

await writeFile(htmlPath, html, "utf8");
console.log(`[prerender] injected static snapshot into #root (${snapshot.length} chars) for non-JS crawlers.`);
