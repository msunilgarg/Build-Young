// Shared course curriculum data: the 12 lessons (WEEKS: act/title/blurb/action) and the three
// act titles (ACTS). Used by Landing (3-act section), the Platform dashboard, and the email
// builders — so it lives in its own dependency-free module both App.jsx and components import.

// Each week carries its lesson (t/s/act) and an optional `materials` list — the place the
// team adds weekly class content as it's built (verified, primary-source links only, per the
// statistics-integrity bar). A few are seeded as examples; the rest show "coming soon" in the
// Course hub until filled in.
// THREE ACTS: Act 1 · 0→1 (Weeks 1–7) — go from nothing to a launched, earning product. Act 2 ·
// 1→100 (Weeks 8–10) — grow first customers into a real business. Act 3 · THE CAPSTONE (Week 11
// prep + Week 12 present what you built). Lesson content is the per-week
// activity (weekActivity); Week 12 is the capstone presentation.
export const WEEKS = [
  // ─── Act 1 · 0 → 1 (Weeks 1–7): find a problem → write the spec → build it in 4 layers
  // (Wk3 core product · Wk4 accounts & data · Wk5 payments · Wk6 production-ready) → Wk7 go live ───
  { act: 1, t: "Find a Problem Worth Solving", s: "Spot a real need people would pay to fix — your product starts here.", action: "build", comingSoon: true },
  { act: 1, t: "Shape the Idea — write your spec", s: "Turn the need into a clear spec: what it is, what it does, how it works.", action: "build", comingSoon: true },
  { act: 1, t: "Build the Core Product", s: "Hand Claude your spec and build the core product — the main thing it does — then ship it live.", action: "build", comingSoon: true },
  { act: 1, t: "Make It Yours", s: "Add sign-in and save each user's data, so it's personal and remembers them.", action: "build", comingSoon: true },
  { act: 1, t: "Add E-commerce", s: "Add e-commerce to your product — a real checkout so people can buy what you built, with payments handled safely.", action: "build", comingSoon: true },
  { act: 1, t: "Make It Real", s: "Emails, being findable, and keeping data safe — everything that makes it ready for real users.", action: "build", comingSoon: true },
  { act: 1, t: "Go Live", s: "Point a real web address at it, switch on live payments, and run your launch checklist — your product is open for business.", action: "build", comingSoon: true },
  // ─── Act 2 · 1 → 100 (Weeks 8–10): grow it — funnel → metrics & scaling → product-led growth ───
  { act: 2, t: "The Funnel", s: "Build a funnel into your product — find it → try it → come back — and add the tracking so you can see how people move through it.", action: "build", comingSoon: true },
  { act: 2, t: "Metrics & Scaling", s: "No new building — read the real numbers from last week's funnel: active users, retention, and where people drop off. Pick the one thing to fix.", action: "build", comingSoon: true },
  { act: 2, t: "Product-Led Growth", s: "A discussion: how could your product grow itself? People share what's genuinely good — work out how yours spreads.", action: "build", comingSoon: true },
  // ─── Act 3 · THE CAPSTONE (Week 11 prep + Week 12 present): get ready, then present what you built ───
  { act: 3, t: "Prepare Your Capstone", s: "Get ready to present — pull together the story of what you built, who it's for, and what's next, and polish your product so it shines on the final call.", action: "build", comingSoon: true },
  { act: 3, t: "Capstone: Present What You Built", s: "Present it all — the product you made, who's using it, and what you'd build next. This is your moment to show family and friends what you created; parents are welcome to join this final call to watch.", action: "capstone" },
];
export const ACTS = { 1: "0 → 1 · Build & launch the product", 2: "Learn how to grow it", 3: "Make your parents proud" };
