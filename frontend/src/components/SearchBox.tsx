import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { SearchResult } from "../api/types";
import { SearchIcon, ChevronRightIcon } from "./Icons";

export default function SearchBox() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (q.trim().length < 1) {
      setResults([]);
      setOpen(false);
      setBusy(false);
      return;
    }
    const requestId = ++requestRef.current;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get<{ results: SearchResult[] }>("/search", { params: { q: q.trim() } });
        if (requestRef.current !== requestId) return; // stale response; ignore
        setResults(data.results);
        setOpen(true);
        setActive(-1);
      } catch {
        if (requestRef.current !== requestId) return;
        setResults([]);
      } finally {
        if (requestRef.current === requestId) setBusy(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (symbol: string) => {
    navigate(`/stock/${encodeURIComponent(symbol)}`);
    setQ("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" && q.trim()) go(q.trim().toUpperCase());
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = active >= 0 ? results[active] : results[0];
      if (pick) go(pick.symbol);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="search-box" ref={boxRef}>
      <SearchIcon size={16} className="search-icon" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => q.trim() && setOpen(true)}
        placeholder="Search US & Canada tickers…"
        spellCheck={false}
        autoComplete="off"
        aria-label="Search tickers"
      />
      {busy && <span className="search-busy spinner" />}

      {open && results.length > 0 && (
        <div className="search-dropdown">
          <div className="search-dropdown-head">Symbols</div>
          {results.map((r, i) => (
            <button
              key={r.symbol}
              className={`search-result ${i === active ? "search-result-active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                go(r.symbol);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="search-symbol mono">{r.symbol}</span>
              <span className="search-name">{r.name}</span>
              <span className="search-exchange mono">{r.exchange}</span>
              <ChevronRightIcon size={14} className="search-chevron" />
            </button>
          ))}
        </div>
      )}

      {open && !busy && results.length === 0 && q.trim() && (
        <div className="search-dropdown search-dropdown-empty">
          No equities found for “{q.trim()}”. Try a symbol like AAPL or RY.TO
        </div>
      )}
    </div>
  );
}
