const RATING_CLASS: Record<string, string> = {
  STRONG_BUY: "rating-strong-buy",
  BUY: "rating-buy",
  HOLD: "rating-hold",
  SELL: "rating-sell",
  STRONG_SELL: "rating-strong-sell",
};

export default function RatingBadge({ rating, label, size = "md" }: { rating: string; label?: string; size?: "sm" | "md" }) {
  const cls = RATING_CLASS[rating] ?? "rating-hold";
  return (
    <span className={`rating-badge ${cls} rating-${size}`}>
      <span className="rating-dot" />
      {label ?? rating.replace("_", " ")}
    </span>
  );
}
