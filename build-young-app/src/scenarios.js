// ============================ BUILD SCENARIOS (dependency-free) ============================
//
// Backup product ideas for students who don't arrive with their own. Each is single-purpose and
// buildable as a simple web app with AI doing the technical work; the "Money & selling" group is
// the easiest bridge to the income half of the program (a clear paying customer). Students can
// always localize one ("…but for my team/town") or pick "Write my own". Kept React-free so it can
// be reused/tested anywhere.

export const SCENARIO_GROUPS = [
  {
    group: "School & studying",
    items: [
      { id: "flashcards", label: "Flashcard maker — paste notes, get flashcards + a quiz" },
      { id: "quizme", label: "Quiz-me for one test (SAT words, a unit, driver's-ed)" },
      { id: "homework", label: "Homework tracker — assignments + due-date reminders" },
      { id: "groupproj", label: "Group-project organizer — split tasks, track who's done" },
      { id: "readinglog", label: "Reading log + book recommendations" },
    ],
  },
  {
    group: "Money & selling",
    items: [
      { id: "tutoring", label: "Tutoring booking page — sell your own tutoring" },
      { id: "service", label: "Service storefront — book dog-walking, babysitting, lessons" },
      { id: "craftshop", label: "Craft / art shop — sell prints, stickers, baked goods" },
      { id: "savegoal", label: "Savings-goal tracker — set a goal, fill a progress bar" },
      { id: "billsplit", label: "Bill & tip splitter for a group outing" },
      { id: "wishlist", label: "Price-drop wishlist — track sneakers, games, collectibles" },
      { id: "fundraiser", label: "Fundraiser thermometer — goal tracker + share page" },
    ],
  },
  {
    group: "Health & habits",
    items: [
      { id: "habits", label: "Habit streak tracker — don't break the chain" },
      { id: "workout", label: "Workout / stretch builder — routine + timer" },
      { id: "practicelog", label: "Practice logger for a musician or athlete" },
      { id: "moodcheck", label: "Private mood / journal check-in (just for you)" },
    ],
  },
  {
    group: "Friends, family & events",
    items: [
      { id: "chores", label: "Chore + allowance board" },
      { id: "petcare", label: "Pet-care schedule — feeding, walks, meds" },
      { id: "rsvp", label: "Event countdown + RSVP page" },
      { id: "spinner", label: "Decision spinner — what to eat / watch" },
      { id: "trivia", label: "Trivia night generator — rounds + scoring" },
      { id: "meals", label: "Snack/meal idea generator from what's in the fridge" },
    ],
  },
  {
    group: "Creators & hobbies",
    items: [
      { id: "linkbio", label: "\"Link in bio\" hub for a creator, athlete, or brand" },
      { id: "clubhub", label: "Club / team hub — announcements, schedule, links" },
      { id: "portfolio", label: "Portfolio page — art, photos, projects, highlights" },
    ],
  },
];

// Flat list of every scenario (handy for lookups / counts). 25 total.
export const SCENARIOS = SCENARIO_GROUPS.flatMap((g) => g.items);

export const scenarioLabel = (id) => (SCENARIOS.find((s) => s.id === id) || {}).label || "";
