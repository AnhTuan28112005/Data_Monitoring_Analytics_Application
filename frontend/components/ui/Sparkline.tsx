"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

export function Sparkline({
  data,
  positive = true,
  height = 40,
}: {
  data: number[];
  positive?: boolean;
  height?: number;
}) {
  const series = data.map((v, i) => ({ i, v }));
  const color = positive ? "#16c784" : "#ea3943";
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={series}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
