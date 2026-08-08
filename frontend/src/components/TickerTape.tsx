import { fmtMoney } from "../lib/format";
import { ArrowUpIcon, ArrowDownIcon } from "./Icons";

interface TapeItem {
  symbol: string;
  price: number;
  change_pct: number | null;
  currency?: string | null;
}

export default function TickerTape({ items }: { items: TapeItem[] }) {
  if (items.length === 0) return null;
  const doubled = [...items, ...items];
  return (
    <div className="ticker-tape" role="marquee" aria-label="Market ticker">
      <div className="ticker-track">
        {doubled.map((item, i) => {
          const up = (item.change_pct ?? 0) >= 0;
          return (
            <span key={`${item.symbol}-${i}`} className="tape-item">
              <span className="tape-symbol mono">{item.symbol}</span>
              <span className="tape-price mono">{fmtMoney(item.price, item.currency, 2)}</span>
              <span className={`tape-change mono ${up ? "up" : "down"}`}>
                {up ? <ArrowUpIcon size={11} /> : <ArrowDownIcon size={11} />}
                {Math.abs(item.change_pct ?? 0).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
