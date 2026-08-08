import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { SearchResult } from "../api/types";
import { ChevronRightIcon } from "./Icons";

interface Props {
  value: string;
  /** Fired on every keystroke so the parent can own the raw input state. */
  onChange: (value: string) => void;
  /** Fired when a suggestion is picked (click / Enter) with the chosen symbol. */
  onSelect: (symbol: string) => void;
  /** Fired on blur with the current text (unless a suggestion was just picked). */
  onBlurValue?: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * A symbol field with live autocomplete suggestions (name + exchange shown).
 * Shares the debounce / keyboard / stale-response guards of the top-bar search.
 */
export default function SymbolInput({
  value,
  onChange,
  onSelect,
  onBlurValue,
  placeholder,
  className = "mono symbol-input",
  ariaLabel,
}: Props) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const pickedRef = useRef(false);

  const q = value.trim();

  useEffect(() => {
    if (q.length < 1) {
      setResults([]);
      setOpen(false);
      setBusy(false);
      return;
    }
    const requestId = ++requestRef.current;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get<{ results: SearchResult[] }>("/search", { params: { q } });
        if (requestRef.current !== requestId) return; // stale response; ignore
        setResults(data.results);
        // Only reopen if the field is still focused; otherwise a slow
        // response would pop the dropdown over unrelated UI after blur.
        if (document.activeElement === inputRef.current) {
          setOpen(true);
          setActive(-1);
        }
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
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (symbol: string) => {
    pickedRef.current = true;
    onSelect(symbol);
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" && q) pick(q.toUpperCase());
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
      const chosen = active >= 0 ? results[active] : results[0];        // Dropdown open but empty; fall back to the typed text so Enter
      // never gets swallowed.
      if (chosen) pick(chosen.symbol);
      else if (q) pick(q.toUpperCase());
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="symbol-picker" ref={wrapRef}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => q && setOpen(true)}
        onBlur={() => {
          if (pickedRef.current) {
            pickedRef.current = false;
            return;
          }
          onBlurValue?.(value.trim());
        }}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={className}
      />
      {busy && <span className="search-busy spinner" aria-hidden="true" />}

      {open && results.length > 0 && (
        <div className="search-dropdown" role="listbox">
          <div className="search-dropdown-head">Symbols</div>
          {results.map((r, i) => (
            <button
              key={r.symbol}
              role="option"
              aria-selected={i === active}
              className={`search-result ${i === active ? "search-result-active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(r.symbol);
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

      {open && !busy && results.length === 0 && q && (
        <div className="search-dropdown search-dropdown-empty">
          No equities found for “{q}”. Try a symbol like AAPL or RY.TO
        </div>
      )}
    </div>
  );
}
