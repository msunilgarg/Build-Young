import "@testing-library/jest-dom/vitest";
import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// jsdom has no ResizeObserver; recharts uses it, so polyfill a no-op (lets charts mount in tests).
if (!global.ResizeObserver) {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}

// jsdom ships a throwing stub for scrollTo and no matchMedia; replace both.
window.scrollTo = () => {};
if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  });
}

afterEach(() => cleanup());
