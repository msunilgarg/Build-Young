import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// GUARD (SPECS/015 fix): Vite only compiles src/, and Vitest's esbuild transform tolerates
// duplicate import bindings — so a duplicate-import SyntaxError in api/*.js sails through `npm run
// build` + the whole vitest suite, yet crashes the serverless function on Vercel's real Node loader.
// `node --check` IS that real loader. This test fails the build if any api file won't parse/load.
function jsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...jsFiles(p));
    else if (name.endsWith(".js")) out.push(p);
  }
  return out;
}

describe("api/ files load under the real Node runtime (not just Vite/Vitest)", () => {
  for (const file of jsFiles("api")) {
    it(`node --check ${file}`, () => {
      expect(() => execFileSync("node", ["--check", file], { stdio: "pipe" })).not.toThrow();
    });
  }
});
