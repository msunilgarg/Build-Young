import React from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
} from "recharts";

// Lazily-loaded charts. recharts (~344 KB) only ships in this chunk, which is
// fetched on demand when the dashboard first renders — not on the landing page.
export default function Charts({ kind, data, color, mutedColor, fmt }) {
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
