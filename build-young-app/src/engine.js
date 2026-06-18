import { fmt } from "./theme.js";
import { CONFIG } from "./lib.js";
import { BATCHES } from "./cohorts.js";
import { WEEKS } from "./course.js";
import { HOMEWORK } from "./courseState.js";

// Course engine: the transactional email builders (welcome/follow-up/withdrawal), the initial
// student state, and the pure week-advance reducer. No React. Covered by test/engine.test.js.

export const MAIL_FROM = CONFIG.contactEmail;
export function welcomeEmail(student) {
  const b = BATCHES.find((x) => x.id === student.batch) || BATCHES[0];
  const first = student.name.split(" ")[0];
  return {
    id: "w" + Date.now(), from: MAIL_FROM, when: "Just now", type: "welcome",
    subject: "Welcome to Build Young — your class details inside",
    body: `Hi ${first},

Welcome aboard! Your seat in the ${b.track} cohort is confirmed.

  •  When: ${b.day}
  •  Where: Live online over Zoom
  •  Your Zoom link (same one for every class): ${b.zoom}

Your username is your email (${student.email}) — use it to log in to your student portal anytime.

Week 1 is "Find a Problem Worth Solving" — the start of building a product you believe people would pay for. Over the weeks ahead you'll build it, take it live, learn to grow it, and go after your first customers. Everything runs inside your student dashboard.

One more thing to aim for: the BUILDER PRIZE. The first builder in your cohort to land a real paying customer — within a year of today — gets their tuition refunded (a real sale, with proof, plus a short video about what you built). The whole point of Build Young, rewarded. See the Terms for details.

See you in class,
The Build Young Team`,
  };
}
export function followupEmail(s, week, batch) {
  const first = s.student.name.split(" ")[0];
  const wk = WEEKS[week - 1];
  const last = week >= 12; // finishing Week 12 = course complete (no separate check-in)
  const next = WEEKS[week];
  return {
    id: "f" + week + "_" + Date.now(), from: MAIL_FROM, when: "Just now", type: "followup",
    subject: last ? "Course complete — you did it 🎓" : `Week ${week} recap + your next class`,
    body: last
      ? `Hi ${first},

You finished all 12 lessons of Build Young.

You built something real, took it live, and learned how to grow it and go after your first customers. Your certificate of completion is waiting in your dashboard — download it and add it to LinkedIn.

Proud of you,
The Team`
      : `Hi ${first},

Great work in Week ${week}: "${wk.t}."

Your next session is Week ${week + 1}: "${next.t}"
${batch.day}  ·  Join on Zoom: ${batch.zoom}
${HOMEWORK[week] ? `\nHomework — to prepare for next week:\n${HOMEWORK[week]}\n` : ""}
See you there,
The Team`,
  };
}
// Refund/cancellation confirmation — sent when a student confirms a withdrawal. Full refund if
// the cohort hasn't started; otherwise a flat 75% refund within the first-week window.
// Why a family cancels — preset options (the `value` is aggregate-safe for the funnel; the
// optional free-text note goes only to the founder's email, never the analytics stream).
export const CANCEL_REASONS = [
  { value: "cost", label: "Cost — too expensive" },
  { value: "schedule", label: "Schedule or timing doesn't work" },
  { value: "fit", label: "Not the right fit" },
  { value: "other_program", label: "Going with another program" },
  { value: "interest", label: "Lost interest" },
  { value: "other", label: "Other" },
];
export const cancelReasonLabel = (v) => (CANCEL_REASONS.find((r) => r.value === v) || {}).label || "";

export function withdrawalEmail(s, batch, refund, notStarted, reasonText) {
  const first = s.student.name.split(" ")[0] || "there";
  return {
    id: "x" + Date.now(), from: MAIL_FROM, when: "Just now", type: "withdrawal",
    subject: notStarted ? "Your Build Young enrollment is canceled" : "Your Build Young withdrawal is confirmed",
    body: notStarted
      ? `Hi ${first},

We've canceled your enrollment in the ${batch.track} cohort, as requested, and started your refund. A full refund of ${fmt(refund)} will be returned to your original payment method — refunds typically land within 5–10 business days.

  •  Cohort: ${batch.track} — ${batch.day}
  •  Refund: ${fmt(refund)} (full)${reasonText ? `\n  •  Reason: ${reasonText}` : ""}

No hard feelings — your seat is freed up for someone else, and you're welcome back anytime. Just reply to this email if anything looks off.

Take care,
The Build Young Team`
      : `Hi ${first},

We've processed your withdrawal from the ${batch.track} cohort and started your refund. A 75% refund of ${fmt(refund)} — the flat rate for cancelling within the first week — will be returned to your original payment method, typically within 5–10 business days.

  •  Cohort: ${batch.track} — ${batch.day}
  •  Refund: ${fmt(refund)} (75% of tuition)${reasonText ? `\n  •  Reason: ${reasonText}` : ""}

Thanks for giving it a try — you're welcome back anytime. Just reply to this email if anything looks off.

Take care,
The Build Young Team`,
  };
}

export const newState = (student) => ({
  student,
  // "" for a normal (direct) enrollment; "partner" for a third-party (marketplace) seat — partner
  // students don't self-withdraw (the founder removes them; refunds are the partner's). SPECS/005 T31.
  paymentSource: (student && student.paymentSource) || "",
  started: false, // class hasn't begun yet — full refund available until first session
  week: 1,
  phase: "course",
  checkin: 0,
  done: false,
  emails: [welcomeEmail(student)],
});

/* ============================ ENGINE ============================ */
// Advance the simulation one week. The course is 12 weeks flat: each call moves to the next
// week; finishing Week 12 graduates the student (done:true). `started` flips true on the first
// advance (class has begun). Pure — returns a NEW state, never mutates `prev` (preserves the
// functional-update / no-lost-update guarantee under rapid double-clicks).
export function advance(prev) {
  const s = JSON.parse(JSON.stringify(prev));
  s.started = true;
  if (s.week >= 12) { s.week = 12; s.done = true; }
  else s.week += 1;
  return s;
}
