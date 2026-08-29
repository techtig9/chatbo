"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { ConversationSeriesPoint } from "@/lib/analytics/dashboard";

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-mist bg-elevated px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-ink">
        {label ? new Date(label).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
      </p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold text-ink">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function ConversationsChart({ data }: { data: ConversationSeriesPoint[] }) {
  const hasActivity = data.some((d) => d.conversations > 0);

  return (
    <div className="h-72 w-full">
      {!hasActivity ? (
        <div className="flex h-full items-center justify-center text-sm text-slate">
          No conversations in this range yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="conversationsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C3F53C" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#C3F53C" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B66D6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#3B66D6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E6E6DC" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              tick={{ fill: "#5B5D51", fontSize: 11 }}
              axisLine={{ stroke: "#E6E6DC" }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: "#5B5D51", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
              allowDecimals={false}
              domain={[0, (max: number) => Math.max(4, Math.ceil(max * 1.15))]}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="conversations" name="Conversations" stroke="#C3F53C" strokeWidth={2} fill="url(#conversationsFill)" />
            <Area type="monotone" dataKey="users" name="Users" stroke="#3B66D6" strokeWidth={2} fill="url(#usersFill)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
