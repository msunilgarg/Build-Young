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
// Framed as what you'll LEARN (the durable takeaway/insight) — not what you'll DO (the activity).
export const WEEK_OBJECTIVES = [
  "It all starts here — a great product begins with a real problem. Nail the one you find today, and next week you'll shape it into a spec your AI can build.\nBuilders start with a problem, not a product — find one worth solving and you're already ahead of most \"ideas.\"\nHow to work backwards from the customer: name who it's for, the pain they feel, then write a short \"press release\" before you build — writing it first forces the idea to be clear.\nWhy being honest up front — your one promise, and what's true now vs. the goal — earns trust instead of hype.\nSpotting real problems is a skill you'll use your whole life, not just in this class.",
  "Last week you found a problem worth building. This week you turn it into a spec — the brief your AI builds from — so next week the building can begin.\nAI does the how; you do the what — your power is describing clearly, not coding. A good brief says what it is, who it's for, why, and what \"done\" looks like.\nVague in, vague out: \"make me a study app\" makes the AI guess; a clear spec gets the right thing the first time.\nHow to break a product into parts — core first, then accounts, payments, and polish — so you build it one clear piece at a time.\nHow to make success measurable — what an \"active\" user does, who comes back, and earning more than it costs to run.\nIn an AI world, clear thinking is the edge — it's the skill behind everything you'll make.",
  "You steer the AI through a loop — describe, see, refine; it can't read your mind.\nA rough version that's real beats a perfect plan that isn't.\n\"Done\" is something you decide, not something the AI decides for you.",
  "Accounts and saved data turn a one-time demo into something people come back to.\nThe data you keep about people is a responsibility, not just a feature.",
  "Getting a stranger to pay takes trust and a clear reason — not just a button.\n\"Free\" and \"worth paying for\" are different things; know which parts are which.",
  "The unglamorous finishing work — emails, being findable, keeping data safe — is what makes a product trustworthy.\nThere's a real gap between a class project and something a stranger can rely on.",
  "Shipping is a decision, not a finish line — real beats perfect.\n\"Live\" means a real address, real payments, real people — and that changes how you think.",
  "Strangers become users through a funnel: find it → try it → come back.\nYou can't improve what you don't measure.",
  "Numbers tell a story — learn to read where people drop off, and why.\nGrowth comes from fixing one thing at a time, not doing everything at once.",
  "The best growth comes from a product people actually want to share.\nThere's a difference between buying attention and earning it.",
  "How you tell the story of what you built is as much a skill as building it.\nHonest beats hype — say what's true now vs. what's still the goal.",
  "You can build something real — and that's yours to own.\nPresenting your work, honestly and proudly, is its own skill.",
];
