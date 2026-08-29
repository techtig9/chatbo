"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export interface ChannelDatum {
  channel: string;
  runs: number;
  share: number;
}

// Lime/blue/amber accents — cycles
// through the three rather than assigning one color per channel key, so
// this doesn't need updating every time a new channel type ships.
const COLORS = ["#C3F53C", "#3B66D6", "#C2670A"];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChannelDatum }[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]!.payload;
  return (
    <div className="rounded-lg border border-mist bg-elevated px-3 py-2 text-xs shadow-lg">
      <p className="font-medium capitalize text-ink">{d.channel}</p>
      <p className="text-slate">{d.runs} runs · {d.share}%</p>
    </div>
  );
}

export function ChannelDistributionChart({ data }: { data: ChannelDatum[] }) {
  if (data.length === 0) {
    return <p className="rounded-lg border border-dashed border-mist p-4 text-center text-sm text-slate">No channel activity yet.</p>;
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="channel" tick={{ fill: "#5B5D51", fontSize: 11 }} axisLine={false} tickLine={false} width={80} className="capitalize" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F1F1EA" }} />
          <Bar dataKey="runs" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
