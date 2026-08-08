import { useEffect, useLayoutEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import SearchBox from "./SearchBox";
import ConsentGate from "./ConsentGate";
import { ActivityIcon, BookIcon, FlaskIcon, ListIcon, LockIcon, LogoMark, MoonIcon, ShieldIcon, StarIcon, SunIcon, WalletIcon } from "./Icons";
import { applyTheme, getStoredTheme, type Theme } from "../lib/theme";
import { hasConsent } from "../lib/consent";

const NAV = [
  { to: "/disclaimer", label: "Disclaimer", icon: ShieldIcon },
  { to: "/", label: "Market", icon: ActivityIcon, end: true },
  { to: "/watchlist", label: "Watchlist", icon: StarIcon },
  { to: "/screener", label: "Screener", icon: ListIcon },
  { to: "/backtest", label: "Backtest", icon: FlaskIcon },
  { to: "/paper", label: "Paper Trading", icon: WalletIcon },
  { to: "/learn", label: "Learn", icon: BookIcon },
];

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      className="icon-btn theme-toggle"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
    </button>
  );
}

function MarketClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const et = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(now);
  const hours = now.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false });
  const h = parseInt(hours, 10);
  const m = now.toLocaleTimeString("en-US", { timeZone: "America/New_York", minute: "2-digit" });
  const mins = h * 60 + parseInt(m, 10);
  const weekend = parts === "Sat" || parts === "Sun";
  const open = !weekend && mins >= 570 && mins < 960; // 9:30 - 16:00 ET
  const label = weekend ? "Closed" : open ? "Open" : "Closed";

  return (
    <div className="market-clock">
      <span className="mono clock-time">{et}</span>
      <span className={`clock-pill ${open ? "clock-open" : "clock-closed"}`}>
        <span className="clock-dot" />
        ET {label}
      </span>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const [consented, setConsented] = useState(hasConsent());
  // Re-check after navigation: accepting from the Disclaimer page writes
  // localStorage, and the next route change should drop the gate. LayoutEffect
  // (not Effect) so the gate never paints a frame on that transition.
  useLayoutEffect(() => {
    if (hasConsent()) setConsented(true);
  }, [location.pathname]);
  // The gate is skipped on the Disclaimer page itself so first-time users can
  // read it in full without accepting first.
  const onDisclaimer = location.pathname.startsWith("/disclaimer");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <LogoMark size={26} />
          <span className="brand-name mono">TICKER</span>
        </NavLink>

        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-privacy">
            <LockIcon size={13} />
            <span>Local &amp; private: no accounts, no personal data, no banking.</span>
          </div>
          <div className="sidebar-note">US · CA equities only · free data</div>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <SearchBox />
          <div className="topbar-right">
            <ThemeToggle />
            <MarketClock />
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
        {!consented && !onDisclaimer && <ConsentGate onAccept={() => setConsented(true)} />}
      </div>
    </div>
  );
}
