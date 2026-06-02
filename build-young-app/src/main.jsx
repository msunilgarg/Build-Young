import React from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    {/* Vercel Web Analytics: cookieless, no PII. Page/route views + time-on-page + referrers
        + devices. App reflects each SPA route in the URL (see App.jsx) so they appear here as
        distinct pages. */}
    <Analytics />
  </React.StrictMode>
);
