// ============================ STUDENT BUILD PLANS (founder view) ============================
//
// Each student's "Your build" plan (idea + customer pain + press release) lives inside their sim
// state (state:<email>, field `build`). For the founder to coach across students we keep a set of
// every student email that has saved state (`students:emails`, SADD on each save) and read their
// plans on demand. Founder-gated (served via /api/funnel?resource=builds). Instructor coursework
// view — names + cohort, behind the founder session.

import { kvConfigured, kvGet, kvCommand } from "./kv.js";

const INDEX = "students:emails";

// Record that a student has saved state (idempotent via SADD). Fire-and-forget.
export async function indexStudent(email) {
  if (!kvConfigured() || !email) return;
  try { await kvCommand(["SADD", INDEX, email]); } catch { /* best-effort */ }
}

const parse = (raw) => { try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; } };
const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;

// Every student's build plan that has any content, for the founder console.
export async function listBuildPlans(limit = 1000) {
  if (!kvConfigured()) return [];
  let emails = [];
  try { emails = (await kvCommand(["SMEMBERS", INDEX])) || []; } catch { emails = []; }
  emails = emails.slice(0, limit);

  const plans = await Promise.all(emails.map(async (email) => {
    try {
      const st = parse(await kvGet(`state:${email}`));
      const b = st && st.build ? st.build : null;
      if (!b) return null;
      const hasContent = (nonEmpty(b.scenario) && b.scenario !== "") || nonEmpty(b.custom) || nonEmpty(b.pain) || nonEmpty(b.pr);
      if (!hasContent) return null;
      return {
        email,
        name: (st.student && st.student.name) || "",
        batchId: (st.student && st.student.batch) || null,
        scenario: b.scenario || "",
        custom: b.custom || "",
        pain: b.pain || "",
        pr: b.pr || "",
      };
    } catch { return null; }
  }));
  return plans.filter(Boolean);
}
