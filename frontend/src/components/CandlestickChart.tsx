import { useEffect, useMemo, useRef, useState } from "react";
import type { Bar } from "../api/types";
import { fmtDate, fmtMoney, fmtNum } from "../lib/format";

export interface Overlay {
  label: string;
  color: string;
  points: { t: number; v: number }[];
}

interface Props {
  bars: Bar[];
  overlays?: Overlay[];
  height?: number;
  currency?: string | null;
}

const LEFT = 8;
const RIGHT = 62;
const TOP = 12;
const BOTTOM = 26;
const VOL_H = 56;
const GAP = 8;

export default function CandlestickChart({ bars, overlays = [], height = 400, currency }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(860);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { innerH, minY, maxVol, step, domainRange } = useMemo(() => {
    const n = bars.length;
    const innerW = Math.max(10, width - LEFT - RIGHT);
    const plotH = height - TOP - BOTTOM - VOL_H - GAP;
    let minY = Infinity;
    let maxY = -Infinity;
    let maxVol = 0;
    for (const b of bars) {
      minY = Math.min(minY, b.l);
      maxY = Math.max(maxY, b.h);
      maxVol = Math.max(maxVol, b.v);
    }
    for (const ov of overlays) {
      for (const p of ov.points) {
        minY = Math.min(minY, p.v);
        maxY = Math.max(maxY, p.v);
      }
    }
    if (!isFinite(minY) || !isFinite(maxY)) {
      minY = 0;
      maxY = 1;
    }
    const range = maxY - minY || maxY * 0.01 || 1;
    const pad = range * 0.06;
    minY -= pad;
    maxY += pad;
    const step = n > 0 ? innerW / n : 1;
    return { innerH: plotH, minY, maxVol, step, domainRange: maxY - minY };
  }, [bars, overlays, width, height]);

  if (bars.length === 0) {
    return <div className="chart-empty">No chart data</div>;
  }

  const xFor = (i: number) => LEFT + i * step + step / 2;
  const yFor = (v: number) => TOP + (1 - (v - minY) / domainRange) * innerH;
  const candleW = Math.max(1.5, step * 0.62);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => minY + f * domainRange);
  const xTickIdx = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => Math.round(f * (bars.length - 1)));

  const hoverBar = hover != null ? bars[hover] : null;
  const hoverX = hover != null ? xFor(hover) : 0;

  const overlayPaths = overlays.map((ov) => {
    const valid = ov.points
      .map((p) => ({ x: p.t, y: p.v }))
      .filter((p) => p.x >= bars[0].t && p.x <= bars[bars.length - 1].t);
    const path = valid
      .map((p, i) => {
        const tIndex = Math.max(0, Math.min(bars.length - 1, Math.round(((p.x - bars[0].t) / (bars[bars.length - 1].t - bars[0].t)) * (bars.length - 1))));
        const x = xFor(tIndex);
        const y = yFor(p.y);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return { ...ov, path };
  });

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const i = Math.floor((x - LEFT) / step);
    setHover(Math.max(0, Math.min(bars.length - 1, i)));
  };

  return (
    <div className="candle-wrap" ref={wrapRef}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {/* grid + y labels */}
        {yTicks.map((tick, i) => {
          const y = yFor(tick);
          return (
            <g key={i}>
              <line x1={LEFT} x2={width - RIGHT} y1={y} y2={y} className="grid-line" />
              <text x={width - RIGHT + 6} y={y + 3} className="axis-label mono">
                {tick.toLocaleString("en-US", { maximumFractionDigits: tick >= 100 ? 0 : 2 })}
              </text>
            </g>
          );
        })}

        {/* volume */}
        {bars.map((b, i) => {
          const h = maxVol ? (b.v / maxVol) * VOL_H : 0;
          const up = b.c >= b.o;
          return (
            <rect
              key={i}
              x={xFor(i) - candleW / 2}
              y={height - BOTTOM - h}
              width={candleW}
              height={Math.max(0.5, h)}
              className={up ? "vol-bar vol-up" : "vol-bar vol-down"}
            />
          );
        })}

        {/* candles */}
        {bars.map((b, i) => {
          const up = b.c >= b.o;
          const bodyTop = yFor(Math.max(b.o, b.c));
          const bodyBot = yFor(Math.min(b.o, b.c));
          return (
            <g key={i}>
              <line x1={xFor(i)} x2={xFor(i)} y1={yFor(b.h)} y2={yFor(b.l)} className={up ? "wick up" : "wick down"} />
              <rect
                x={xFor(i) - candleW / 2}
                y={bodyTop}
                width={candleW}
                height={Math.max(1, bodyBot - bodyTop)}
                rx={0.5}
                className={up ? "candle up" : "candle down"}
              />
            </g>
          );
        })}

        {/* overlays */}
        {overlayPaths.map((ov) => (
          <path key={ov.label} d={ov.path} fill="none" stroke={ov.color} strokeWidth={1.4} />
        ))}

        {/* x labels (first/last anchored to avoid edge clipping) */}
        {xTickIdx.map((i) => {
          const x = xFor(i);
          const anchor = i === 0 ? "start" : i === bars.length - 1 ? "end" : "middle";
          const dx = i === 0 ? 2 : i === bars.length - 1 ? -2 : 0;
          return (
            <text key={i} x={x + dx} y={height - BOTTOM + 16} textAnchor={anchor} className="axis-label">
              {fmtDate(bars[i].t, { month: "short", day: "numeric" })}
            </text>
          );
        })}

        {/* crosshair */}
        {hoverBar && (
          <g>
            <line x1={hoverX} x2={hoverX} y1={TOP} y2={height - BOTTOM - VOL_H - GAP} className="crosshair" />
          </g>
        )}
      </svg>

      {hoverBar && (
        <div className="candle-tooltip" style={{ left: Math.min(hoverX + 14, width - 190) }}>
          <div className="tooltip-date mono">{fmtDate(hoverBar.t)}</div>
          <div className="tooltip-row">
            <span>Open</span>
            <span className="mono">{fmtMoney(hoverBar.o, currency, 2)}</span>
          </div>
          <div className="tooltip-row">
            <span>High</span>
            <span className="mono">{fmtMoney(hoverBar.h, currency, 2)}</span>
          </div>
          <div className="tooltip-row">
            <span>Low</span>
            <span className="mono">{fmtMoney(hoverBar.l, currency, 2)}</span>
          </div>
          <div className="tooltip-row">
            <span>Close</span>
            <span className="mono">{fmtMoney(hoverBar.c, currency, 2)}</span>
          </div>
          <div className="tooltip-row">
            <span>Vol</span>
            <span className="mono">{fmtNum(hoverBar.v, 0)}</span>
          </div>
          {overlays.map((ov) => {
            const tIndex = Math.round(((hoverBar.t - bars[0].t) / (bars[bars.length - 1].t - bars[0].t || 1)) * (bars.length - 1));
            const pt = ov.points[Math.min(tIndex, ov.points.length - 1)];
            return (
              <div className="tooltip-row" key={ov.label}>
                <span style={{ color: ov.color }}>{ov.label}</span>
                <span className="mono">{pt ? fmtMoney(pt.v, currency, 2) : "-"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
