import { WEEK_PREP, WEEK_OBJECTIVES } from "./marketMedia.js";

// Founder-editable per-week homework + class objectives. Default to the code copy; App and the
// founder editors hydrate them at runtime via the setters. Exported as live `let` bindings so
// every importer (engine emails, the dashboard) sees the latest value after a set.
export let HOMEWORK = WEEK_PREP;
export let OBJECTIVES = WEEK_OBJECTIVES;
export const setHomework = (h) => { HOMEWORK = h; };
export const setObjectives = (o) => { OBJECTIVES = o; };
