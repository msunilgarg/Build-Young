import { C } from "./theme.js";

// Shared presentational primitives used across every screen (Card, the Mark logo, Pill,
// the act() a11y click helper, a themed PageBackdrop, and a Stat tile). JSX via Vite's
// automatic runtime — no React import needed.

export const Card = ({ children, style, className = "" }) => (
  <div className={className} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 4, ...style }}>{children}</div>
);
// Build Young mark: three ascending blocks (building + growth) with a teal spark
export const Mark = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 -10 58 68" style={{ verticalAlign: "-4px", marginRight: 4 }} aria-hidden="true">
    <rect x="0" y="34" width="16" height="22" rx="3" fill="#50a0e0" />
    <rect x="21" y="20" width="16" height="36" rx="3" fill="#0078d4" />
    <rect x="42" y="2" width="16" height="54" rx="3" fill="#0067b8" />
    <path d="M50 -8 l6 8 h-12 z" fill="#038387" />
  </svg>
);
export const Pill = ({ children, bg = C.emerald, color = "#fff" }) => (
  <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 4, letterSpacing: ".04em", textTransform: "uppercase" }}>{children}</span>
);
// accessible click: makes a non-button element keyboard-operable (Enter / Space) + screen-reader friendly
export const act = (fn) => ({ role: "button", tabIndex: 0, onClick: fn, onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } } });
// Reusable themed backdrop — soft wash + the brand's ascending-blocks motif, low opacity.
export const PageBackdrop = ({ tint = "#eaf3fb" }) => (
  <svg aria-hidden="true" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}>
    <defs>
      <radialGradient id="pbWash" cx="50%" cy="0%" r="90%"><stop offset="0%" stopColor={tint} /><stop offset="55%" stopColor="#faf9f8" /><stop offset="100%" stopColor="#faf9f8" /></radialGradient>
    </defs>
    <rect width="1440" height="900" fill="url(#pbWash)" />
    <g opacity="0.05" fill="#0067b8">
      <rect x="70" y="700" width="40" height="110" rx="7" /><rect x="122" y="650" width="40" height="160" rx="7" /><rect x="174" y="585" width="40" height="225" rx="7" />
      <rect x="1268" y="120" width="34" height="80" rx="6" /><rect x="1312" y="78" width="34" height="122" rx="6" /><rect x="1356" y="28" width="34" height="172" rx="6" />
    </g>
  </svg>
);
export const Stat = ({ label, value, sub, icon: Icon, color = C.ink }) => (
  <Card style={{ padding: 18 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
      {Icon && <Icon size={16} color={color} />}
    </div>
    <div className="disp" style={{ fontSize: 28, fontWeight: 700, color, marginTop: 6 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>}
  </Card>
);
