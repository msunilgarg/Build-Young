import { C } from "./theme.js";

// Single source of truth for the "More than money" body paragraph — rendered identically on the landing
// page (Landing.jsx) and the About page (About.jsx). Only the heading/badge around it differs per page;
// the copy itself is shared, so it lives here once (was duplicated verbatim). Brand copy — keep in sync
// with POSITIONING.md: raising builders, and college as a SUBORDINATE proof point (evidence + a story,
// never an admissions promise).
export function MoreThanMoneyBody() {
  return (
    <p style={{ fontSize: 21, lineHeight: 1.5, marginTop: 18, maxWidth: 760, marginLeft: "auto", marginRight: "auto", textAlign: "center", color: C.ink }}>
      <b className="disp">Raising builders, not consumers.</b> AI just collapsed the barrier to building — what once took a team and a budget, a motivated teenager can now do alone. So the edge isn't a credential; it's <b>taste</b> — knowing what's worth making — and starting early. We teach it by letting them live it: they build, they ship, then they learn to grow what they've made. And what they're left with — a real, shipped product and a story only they can tell — stands out far beyond the classroom: in a college essay, an interview, anywhere genuine initiative counts.
    </p>
  );
}
