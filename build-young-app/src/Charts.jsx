import React from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  BarChart, Bar, LabelList,
} from "recharts";

// Lazily-loaded charts. recharts (~344 KB) only ships in this chunk, which is
// fetched on demand when the dashboard first renders — not on the landing page.
export default function Charts({ kind, data, color, mutedColor, fmt }) {
  // Horizontal funnel bars: stage counts, with a count + conversion label on each bar.
  if (kind === "funnel") {
    return (
      <ResponsiveContainer width="100%" height={data.length * 54 + 12}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 124, bottom: 4, left: 8 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" width={104} tick={{ fontSize: 12, fill: mutedColor }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => v.toLocaleString()} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28} isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            <LabelList dataKey="annot" position="right" style={{ fontSize: 11, fill: mutedColor, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }
  // Generic integer-count BARS (e.g. the weekly "Visited by week" trend — discrete weekly buckets read
  // better as bars than a curve). Same {label, value} data shape as `countline`.
  if (kind === "countbar") {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: mutedColor }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: mutedColor }} width={36} />
          <Tooltip formatter={(v) => v.toLocaleString()} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  // Generic integer-count line (week progression / check-in retention curves).
  if (kind === "countline") {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: mutedColor }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: mutedColor }} width={36} />
          <Tooltip formatter={(v) => v.toLocaleString()} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (kind === "line") {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: mutedColor }} />
          <YAxis tick={{ fontSize: 11, fill: mutedColor }} width={48} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
          <Tooltip formatter={(v) => fmt(v)} />
          <Line type="monotone" dataKey="nw" stroke={color} strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip formatter={(v) => fmt(v)} />
      </PieChart>
    </ResponsiveContainer>
  );
}
