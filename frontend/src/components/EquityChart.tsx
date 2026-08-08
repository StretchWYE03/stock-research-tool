import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtDate, fmtNum } from "../lib/format";

const axisTick = { fill: "#5C6B85", fontSize: 11, fontFamily: "IBM Plex Mono" };

function EquityTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-date mono">{fmtDate(label)}</div>
      {payload.map((entry: any) => (
        <div className="tooltip-row" key={entry.dataKey}>
          <span style={{ color: entry.stroke }}>{entry.name}</span>
          <span className="mono">${fmtNum(entry.value, 2)}</span>
        </div>
      ))}
    </div>
  );
}

function DrawdownTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-date mono">{fmtDate(label)}</div>
      <div className="tooltip-row">
        <span style={{ color: "#F6465D" }}>Drawdown</span>
        <span className="mono">{fmtNum(payload[0].value, 2)}%</span>
      </div>
    </div>
  );
}

export function EquityCurveChart({ data }: { data: { t: number; strategy: number; benchmark: number }[] }) {
  return (
    <div className="rechart-box">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="#64748B" strokeOpacity={0.4} strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            scale="time"
            tickFormatter={(t: number) => fmtDate(t, { month: "short", day: "numeric" })}
            tick={axisTick}
            tickCount={6}
            stroke="#64748B"
          />
          <YAxis
            tickFormatter={(v: number) => `$${fmtNum(v, 0)}`}
            tick={axisTick}
            width={58}
            domain={["auto", "auto"]}
            stroke="#64748B"
          />
          <Tooltip content={<EquityTooltip />} />
          <Line
            type="monotone"
            dataKey="strategy"
            name="Strategy"
            stroke="#0E9F6E"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
          <Line
            type="monotone"
            dataKey="benchmark"
            name="Buy & Hold"
            stroke="#64748B"
            strokeWidth={1.6}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DrawdownChart({ data }: { data: { t: number; drawdown: number }[] }) {
  return (
    <div className="rechart-box">
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F6465D" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#F6465D" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#64748B" strokeOpacity={0.4} strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            scale="time"
            tickFormatter={(t: number) => fmtDate(t, { month: "short", day: "numeric" })}
            tick={axisTick}
            tickCount={6}
            stroke="#64748B"
          />
          <YAxis
            tickFormatter={(v: number) => `${v}%`}
            tick={axisTick}
            width={46}
            stroke="#64748B"
          />
          <Tooltip content={<DrawdownTooltip />} />
          <Area type="monotone" dataKey="drawdown" stroke="#F6465D" strokeWidth={1.6} fill="url(#ddGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
