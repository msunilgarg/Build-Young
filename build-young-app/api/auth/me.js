// GET /api/auth/me — returns the signed-in student, or 401. The SPA calls this on load to
// decide between the login screen and the dashboard.

import { requireUser, getUser, isFounder } from "../_lib/auth.js";

export default async function handler(req, res) {
  const session = requireUser(req);
  if (!session) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  const user = await getUser(session.email);
  if (!user) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  res.status(200).json({ user: { email: user.email, name: user.name || "", batchId: user.batchId || "", paymentSource: user.paymentSource || "", isFounder: await isFounder(user.email) } });
}
