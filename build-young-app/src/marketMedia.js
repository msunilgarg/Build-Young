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
  "Get Your First Customers",
  "Capstone: What You Built & What It's Worth",
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
  "Your product is built and growing — this week we go to market and get your first real customers. Come with a guess at who your very first customer is and where you'd find them.",
  "Be ready to show what you built, who's using it, and what it's worth as a business — and to say what you'd build next. This is your presentation, so parents are welcome to join the call to watch.",
];
