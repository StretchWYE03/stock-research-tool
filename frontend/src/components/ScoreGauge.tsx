import { useId } from "react";
import type { Score } from "../api/types";

const RATING_COLOR: Record<string, string> = {
  STRONG_BUY: "#10B981",
  BUY: "#16A34A",
  HOLD: "#D97706",
  SELL: "#EA580C",
  STRONG_SELL: "#DC2626",
};

interface Props {
  score: Score;
}

export default function ScoreGauge({ score }: Props) {
  const gradId = useId().replace(/:/g, "");
  const value = Math.max(0, Math.min(100, score.composite));
  const color = RATING_COLOR[score.rating] ?? "#F5B301";

  const cx = 110;
  const cy = 104;
  const r = 82;
  const angle = (value / 100) * 180;
  const rad = ((180 - angle) * Math.PI) / 180;

  const arcPath = (startDeg: number, endDeg: number, radius: number) => {
    const start = ((startDeg - 180) * Math.PI) / 180;
    const end = ((endDeg - 180) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy - radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy - radius * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${radius},${radius} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
  };

  return (
    <div className="gauge-wrap">
      <svg viewBox="0 0 220 130" className="gauge">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.55} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <path d={arcPath(180, 0, r)} fill="none" style={{ stroke: "var(--gauge-track)" }} strokeWidth={13} strokeLinecap="round" />
        <path d={arcPath(180, 180 - angle, r)} fill="none" stroke={`url(#${gradId})`} strokeWidth={13} strokeLinecap="round" />
        {/* pointer */}
        <line x1={cx} y1={cy} x2={cx + r * 0.78 * Math.cos(rad)} y2={cy - r * 0.78 * Math.sin(rad)} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx + r * 0.78 * Math.cos(rad)} cy={cy - r * 0.78 * Math.sin(rad)} r={4} fill={color} />
        <circle cx={cx} cy={cy} r={4.5} fill="#0A0E15" stroke={color} strokeWidth={2} />
      </svg>
      <div className="gauge-center">
        <div className="gauge-value mono">{Math.round(value)}</div>
        <div className="gauge-label" style={{ color }}>
          {score.rating_label}
        </div>
      </div>
      <div className="gauge-bars">
        <div className="gauge-bar-row">
          <span className="gauge-bar-label">Technical</span>
          <div className="gauge-bar">
            <div className="gauge-bar-fill" style={{ width: `${score.technical}%` }} />
          </div>
          <span className="mono gauge-bar-num">{score.technical.toFixed(0)}</span>
        </div>
        <div className="gauge-bar-row">
          <span className="gauge-bar-label">Fundamental</span>
          <div className="gauge-bar">
            <div className="gauge-bar-fill gauge-bar-fill-brand" style={{ width: `${score.fundamental}%` }} />
          </div>
          <span className="mono gauge-bar-num">{score.fundamental.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}
