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
  "Build the Core Product",
  "Make It Yours",
  "Add E-commerce",
  "Make It Real",
  "Polish & Iterate",
  "Go Live",
  "The Funnel",
  "Metrics & Scaling",
  "Product-Led Growth",
  "Prepare Your Capstone",
  "Capstone: Present What You Built",
];

// Homework to prepare for each lesson (index = week − 1). Sent in the week-completion email
// (prep for the NEXT week) and the 2-days-before class reminder. Kept here (dependency-free) so
// the app email + the cron reminder share one source. DRAFTS — refine the copy any time; an empty
// string means "no homework section" for that week.
export const WEEK_PREP = [
  "Come with 3 problems you (or people you know) run into — small, real, a little annoying. We'll pick one to build around.",
  "Using last lesson's problem, come ready to write a short spec for your core product — what it is, who it's for, the single \"magic moment\" it nails, and the smallest version you could build. We'll spec it and build it live with AI, and your Claude account + tools should be ready.",
  "Have your core product working. This lesson you spec and add sign-in + saving each user's data — so come knowing who logs in and what should be saved for them.",
  "Your product works and remembers users — this lesson you spec and add real payments. Come knowing what people pay for and what they get.",
  "It works and can take payment — this lesson you spec and make it real (emails, being findable, keeping data safe). Note anything that still feels rough.",
  "Your product is real but still rough in places — this lesson you polish and iterate: refine it against real use, smooth the rough edges, and tighten your spec. Come with a short list of what still feels unfinished or could be better.",
  "Your product's built and solid — make sure your payment account is set up (a parent helps). This lesson we take it live: a real web address, live payments, and a launch checklist.",
  "Think about how a customer first finds and tries your product. This lesson we build a funnel — find → try → come back — add the tracking, and list the steps you'll measure at each stage.",
  "Come ready to read funnels — we'll work through a few real-looking funnels built from the steps you're tracking: spot where people drop off, what it means, and what you'd do about it. (No building this lesson.)",
  "Think of one reason someone would tell a friend about your product. This lesson is a discussion: how your product could grow itself (product-led growth).",
  "Your product is built and growing — this lesson we prepare for your capstone. Come ready to pull together the story of what you built: the product, who it's for, and what you'd do next, so you're set to present it.",
  "Be ready to show what you built, who's using it, and what you'd build next. This is your presentation to family and friends, so parents are welcome to join the call to watch.",
];

// What you'll learn each class (index = week − 1) — the in-dashboard "kickoff" shown at the top of
// each lesson's activity, instead of a slide. Newline-separated bullets. Founder-editable (KV-backed via
// api/_lib/objectivesStore.js); an empty string means "no objectives card" for that week. DRAFTS.
// Framed as what you'll LEARN (the durable takeaway/insight) — not what you'll DO (the activity).
export const WEEK_OBJECTIVES = [
  "It all starts here — a great product begins with a real problem. Nail the one you find today, and next lesson you'll turn it into a spec and start building.\nBuilders start with a problem, not a product — find one worth solving and you're already ahead of most \"ideas.\"\nHow to work backwards from the customer: name who it's for, the pain they feel, then write a short \"press release\" before you build — writing it first forces the idea to be clear.\nWhy being honest up front — your one promise, and what's true now vs. the goal — earns trust instead of hype.\nSpotting real problems is a skill you'll use your whole life, not just in this class.",
  "Last lesson you found a problem worth building. This lesson you write its spec and build it — your first real, working product; next lesson you make it personal with accounts.\nAI does the how; you do the what — your power is describing clearly, not coding. A good spec says what it is, who it's for, why, and what \"done\" looks like.\nVague in, vague out: \"make me a study app\" makes the AI guess; a clear spec gets the right thing the first time.\nThe build loop: describe → see → refine. You steer; the AI writes the code, and you push until it's good — that judgment of what \"good\" looks like is taste, the one part AI can't do for you.\nA rough version that's real beats a perfect plan that isn't — and watching a customer use something you made is a feeling no class can give you.",
  "Last lesson you wrote a spec and shipped a working product. This lesson you spec and make it personal — sign-in and saved data — so it's ready to take payments next lesson.\nWhy accounts + saved data turn a one-time demo into something people come back to.\nHow log-ins and per-user data actually work, in plain terms.\nThe data you keep about people is a responsibility, not just a feature.",
  "Your product knows its users — now it can earn. This lesson you spec and add real payments; next lesson you make the whole thing production-ready.\nHow a customer goes from interested to paying — trust plus a clear reason, not just a button.\nThe difference between \"free\" and \"worth paying for\" — and which parts of yours are which.\nHandling money means handling it safely; you'll see what that takes.",
  "It works and can take payment. This lesson you spec and add the unglamorous layer that makes it trustworthy — emails, being findable, keeping data safe; next lesson you polish and iterate on it.\nWhat separates a class project from something a customer can rely on: emails, being findable, keeping data safe.\nThe finishing work is invisible when it's done right — and obvious when it's missing.\nSweating these details is taste, too — people feel the polish even when they can't name it.\n\"Production-ready\" is a mindset: assume real people, real mistakes, real stakes.",
  "Your product is real but rough in places. This lesson you polish and iterate — so next lesson you can take it live with confidence.\nReal builders spend real time on the last 10% — the rough edges are exactly what users feel first.\nIterating means refining against real use: smoothing what's awkward, handling the tricky paths (empty states, wrong input), and tightening your spec.\nPolish is a discipline — \"mostly done\" isn't done; you make it great before you ship.\nKnowing when it's good enough to launch is its own kind of taste.",
  "Everything's ready. This lesson you flip it on — a real address, live payments — and next lesson you start bringing people to it.\nShipping is a decision, not a finish line — real beats perfect.\n\"Live\" means a real address, real payments, real people — and that changes how you think.\nPutting your work into the world, with your name on it, is its own kind of brave.",
  "You're live — now the question is whether anyone shows up. This lesson you build a funnel to bring them in; next lesson you'll read the numbers it produces.\nHow people actually become customers: find it → try it → come back.\nYou can't improve what you don't measure — so you add tracking at each step.\nPicking the right few numbers to watch is a skill — they tell you almost everything.",
  "Last week you built the funnel and the tracking. This lesson you read what it's telling you; next lesson you turn that into how the product grows.\nHow to read where people drop off — and what it actually means.\nGrowth comes from fixing one thing at a time, not doing everything at once.\nNumbers are a story, not a scoreboard — learn to listen to them.",
  "You can read your numbers. This lesson you learn how a product grows itself; next lesson you start pulling your whole story together for the capstone.\nThe best growth comes from a product people actually want to share.\nThe difference between buying attention and earning it.\nFind the one reason someone would tell a friend — and lean into it.",
  "You've built it and learned to grow it. This lesson you pull the whole story together; next lesson you present it.\nHow to tell the story of what you built — honestly (what's true now vs. the goal).\nHow you communicate your work is as much a skill as building it.\nPolishing for an audience makes you see your own product with fresh eyes.",
  "This is it — everything led here. You present what you built, and what you've learned is yours to keep going.\nYou can build something real — and that's yours to own.\nPresenting your work, honestly and proudly, is its own skill.\nThe end of the course is the start of what you do next.",
];
