import { useState, useEffect } from "react";
import { C } from "./theme.js";
import { CONFIG } from "./lib.js";

// In-app Privacy/Terms modal (works without the standalone .html pages).

export const LEGAL = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      ["Who we are", `Build Young provides live, online entrepreneurship classes for teenagers. You can reach us at ${CONFIG.contactEmail}.`],
      ["Eligibility — high school students", "Build Young is intended for high school students, enrolled by a parent or guardian. We do not knowingly create accounts for, or collect personal information from, children under 13. If you believe a child under 13 has provided us information, contact us and we will delete it."],
      ["What we collect", "To enroll a student and run the class, we collect the enrolling adult's name and email, the student's first name or chosen display name, the selected class, and payment confirmation (processed by our payment provider — we do not store full card numbers). During class activities, the student builds a real product in a hands-on, project-based class."],
      ["How we use it", "We use this information to deliver the class, send class logistics and reminders, process enrollment and refunds, and improve the program. We send a confirmation email at enrollment and follow-ups tied to class sessions."],
      ["What we do not do", "We do not sell or rent personal information. We do not share it for third-party targeted advertising. We do not use student information to train artificial-intelligence models."],
      ["Sharing with service providers", "We rely on vetted providers to operate — for example payment processing, scheduling, video conferencing, and email delivery. They receive only what they need to perform their service and are bound to protect it."],
      ["Your choices", "You may request a copy of, correction to, or deletion of your information by emailing us. You can unsubscribe from non-essential email at any time."],
      ["Data retention & security", "We keep information only as long as needed for the purposes above and apply reasonable safeguards to protect it."],
      ["Changes", "We may update this policy and will post the new date above."],
    ],
  },
  terms: {
    title: "Terms of Service",
    sections: [
      ["The program", "Build Young offers a live, online program — a 12-week course meeting twice a week, so 24 live sessions in all — delivered over video conference. Students build a product, take it live, learn to grow it, and go to market for their first customers. Classes are live, hands-on, and project-based."],
      ["Eligibility", "Students must be in high school. An adult (parent or guardian) completes enrollment and payment on the student's behalf."],
      ["Education, not professional advice", "Build Young is hands-on entrepreneurship education. It is not licensed business, financial, or legal advice. Students build their own product; any revenue it may earn belongs to the student and their family — Build Young does not collect, hold, or manage it."],
      ["Payment", "Tuition is shown at enrollment and charged through our payment provider at the price listed for the selected cohort."],
      ["Refund policy", "Cancel any time before your cohort's first session for a full refund. Once the program has started, you may withdraw for a prorated refund through the end of the first week — the refund equals the tuition multiplied by the fraction of the program's hours not yet held. After the first week, tuition is non-refundable."],
      ["First-year builder prize", "In each cohort, the FIRST enrolled student to make a real, arms-length sale of their own product or service — a genuine paying customer, not a friend or family member — within one year of their enrollment date is eligible to have their tuition refunded. To claim, the student must (1) provide proof of the sale (e.g., a payment receipt from Stripe, PayPal, or a similar processor) for Build Young to verify, and (2) submit a short video (about 2 minutes) describing their product and experience, together with a parent or guardian's written consent for Build Young to use the student's name, likeness, and the video for promotional purposes. One award per cohort, to the first student who both qualifies and completes these steps; Build Young verifies eligibility and resolves any questions in good faith, and its decision is final. The award equals the tuition paid for that cohort and is issued after verification. Build Young may modify or discontinue the prize for future cohorts; the terms in effect at your enrollment apply. (This is a draft; because the prize is a contest involving minors and the use of a minor's name and likeness, it — and an appropriate parental media-release — must be reviewed by counsel before launch.)"],
      ["Conduct", "We ask students and families to be respectful in live sessions. We may remove anyone whose conduct disrupts the class, consistent with the refund policy above."],
      ["Changes & contact", `We may update these terms and will post the new date above. Questions: ${CONFIG.contactEmail}.`],
    ],
  },
};
export function LegalModal({ kind, onClose }) {
  const doc = LEGAL[kind];
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!doc) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(36,36,36,.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "5vh 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="rise" style={{ background: "#fff", borderRadius: 10, maxWidth: 720, width: "100%", padding: "28px 30px 34px", boxShadow: "0 30px 70px -20px rgba(0,0,0,.4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <h2 className="disp" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>{doc.title}</h2>
          <button className="btn" onClick={onClose} aria-label="Close" style={{ background: C.paper2, border: `1px solid ${C.line}`, borderRadius: 4, width: 32, height: 32, fontSize: 18, color: C.muted, flexShrink: 0 }}>×</button>
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>Last updated: [set before launch]</div>
        <div style={{ background: "#fbeede", border: `1px solid ${C.goldLite}`, borderRadius: 4, padding: "11px 13px", fontSize: 13, color: C.ink2, marginTop: 14 }}>
          <b>Draft template — not legal advice.</b> Have an attorney review and finalize this before launch.
        </div>
        {doc.sections.map(([h, p], i) => (
          <div key={i} style={{ marginTop: 20 }}>
            <h3 className="disp" style={{ fontSize: 17, fontWeight: 700, margin: "0 0 5px" }}>{h}</h3>
            <p style={{ fontSize: 14.5, color: C.ink2, lineHeight: 1.6, margin: 0 }}>{p}</p>
          </div>
        ))}
        <button className="btn" onClick={onClose} style={{ marginTop: 26, background: C.ink, color: C.paper2, padding: "11px 22px", borderRadius: 4, fontSize: 14 }}>Close</button>
      </div>
    </div>
  );
}
