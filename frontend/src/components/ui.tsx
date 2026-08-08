import type { ReactNode } from "react";
import CountUp from "./CountUp";

export function StatCard({
  label,
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  sub,
  accent = "neutral",
  countUp = false,
  icon,
}: {
  label: string;
  value: number | null | undefined;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  sub?: ReactNode;
  accent?: "neutral" | "up" | "down" | "brand";
  countUp?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className={`stat-card accent-${accent}`}>
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <div className="stat-value mono">
        {countUp && value != null ? (
          <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
        ) : (
          <>
            {prefix}
            {value?.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) ?? "-"}
            {suffix}
          </>
        )}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          className={`tab ${active === tab.id ? "tab-active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="section-title">
      <span className="section-tick" />
      <h2>{children}</h2>
      {hint && <span className="section-hint">{hint}</span>}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "up" | "down" | "brand" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="loading">
      <span className="spinner" />
      <span>{label}…</span>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-mark">∅</div>
      <p className="empty-title">{title}</p>
      {body && <p className="empty-body">{body}</p>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-note">
      <span>{message}</span>
      {onRetry && (
        <button className="btn btn-ghost btn-sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
