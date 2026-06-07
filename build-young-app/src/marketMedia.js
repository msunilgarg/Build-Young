// ============================ COURSE COPY (client-safe, dependency-free) ============================
//
// Small, dependency-free course metadata shared between the browser app (src/App.jsx) and the
// serverless cron (api/cron/market-news.js) so the email copy stays identical whether it's
// rendered client-side (in-app completion email) or server-side (class reminders).
//
// This file has NO React and NO lucide imports on purpose.
//
// What lives here:
//   - WEEK_TITLES — the 12 weekly lesson titles (for email subjects)
//   - WEEK_PREP   — the per-week homework/prep text (for completion + reminder emails)

// The 12 weekly lesson titles (Act/curriculum order). App.jsx's richer WEEKS array carries
// subtitles + actions; the scheduler only needs the title for email subjects/body.
export const WEEK_TITLES = [
  "Find a Problem Worth Solving",
  "Shape the Idea — write your spec",
  "Build the Core Product",
  "Make It Yours",
  "Add E-commerce",
  "Make It Real",
  "Go Live",
  "The Funnel",
  "Metrics & Scaling",
  "Product-Led Growth",
  "Prepare Your Capstone",
  "Capstone: Present What You Built",
];

// Homework to prepare for each week (index = week − 1). Sent in the week-completion email
// (prep for the NEXT week) and the 2-days-before class reminder. Kept here (dependency-free) so
// the app email + the cron reminder share one source. DRAFTS — refine the copy any time; an empty
// string means "no homework section" for that week.
export const WEEK_PREP = [
  "Come with 3 problems you (or people you know) run into — small, real, a little annoying. We'll pick one to build around.",
  "Using last week's problem, jot a one-line idea, who it's for, the single \"magic moment\" it nails, and the smallest version you could build. (See the Shape-the-Idea steps.)",
  "Make sure your Claude account + tools are ready, and your spec is written. We build the core product together, live.",
  "Have your core product working. This week we add sign-in and saving each user's data — so come knowing who logs in and what should be saved for them.",
  "Your product works and remembers users — this week we add real payments. Come knowing what people pay for and what they get.",
  "It works and can take payment — this week we make it real (emails, being findable, keeping data safe). Note anything that still feels rough.",
  "Your product's built — make sure your payment account is set up (a parent helps). This week we take it live: a real web address, live payments, and a launch checklist.",
  "Think about how a stranger first finds and tries your product. This week we build a funnel — find → try → come back — add the tracking, and list the steps you'll measure at each stage.",
  "Come ready to read funnels — we'll work through a few real-looking funnels built from the steps you're tracking: spot where people drop off, what it means, and what you'd do about it. (No building this week.)",
  "Think of one reason someone would tell a friend about your product. This week is a discussion: how your product could grow itself (product-led growth).",
  "Your product is built and growing — this week we prepare for your capstone. Come ready to pull together the story of what you built: the product, who it's for, and what you'd do next, so you're set to present it.",
  "Be ready to show what you built, who's using it, and what you'd build next. This is your presentation to family and friends, so parents are welcome to join the call to watch.",
];

// What you'll learn each class (index = week − 1) — the in-dashboard "kickoff" shown at the top of
// each week's activity, instead of a slide. Newline-separated bullets. Founder-editable (KV-backed via
// api/_lib/objectivesStore.js); an empty string means "no objectives card" for that week. DRAFTS.
export const WEEK_OBJECTIVES = [
  "Spot a real problem worth solving — one people would pay to fix.\nWork backwards from the customer: who it's for, and why.\nWrite your product's first brief — the idea, the one promise, and what's true now vs. the goal.",
  "Turn your idea into a clear spec — the brief you hand your AI.\nSee why a clear brief beats a vague one (vague in, vague out).\nGet your build tools set up so you're ready to build.",
  "Hand your spec to AI and build the core product — the main thing it does.\nLearn the build loop: describe → see → refine.\nShip your first working version live.",
  "Add sign-in so each person has their own account.\nSave each user's data so the product remembers them.\nSee why accounts + data make it feel real.",
  "Add a real checkout so people can pay for what you built.\nDecide what's free vs. paid, and what they get.\nHandle payments safely.",
  "Add the finishing layer: emails, being findable, keeping data safe.\nLearn what makes a product \"production-ready.\"\nGet it ready for real users.",
  "Point a real web address at your product.\nSwitch on live payments.\nRun your launch checklist — you're open for business.",
  "Build a funnel into your product: find it → try it → come back.\nAdd tracking so you can see how people move through it.\nList the steps you'll measure at each stage.",
  "Read your real numbers: active users, retention, and where people drop off.\nLearn what the metrics actually mean.\nPick the one thing to fix first.",
  "Explore how a product can grow itself.\nFind the reason someone would tell a friend.\nWork out how yours spreads.",
  "Pull together the story of what you built — product, who it's for, what's next.\nUpdate your positioning honestly (true now vs. the goal).\nPolish your product so it shines on the final call.",
  "Present what you built, who's using it, and what you'd build next.\nShow your live product.\nCelebrate — parents are welcome to watch.",
];
