import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { acceptConsent } from "../lib/consent";
import { LogoMark, ShieldIcon } from "./Icons";

interface Props {
  onAccept: () => void;
}

/**
 * First-run consent gate. Covers the whole main column (content + topbar) so
 * the app can't be used before accepting, but leaves the sidebar, including
 * the Disclaimer link, clickable so users can read the full text first.
 */
export default function ConsentGate({ onAccept }: Props) {
  const navigate = useNavigate();
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    acceptRef.current?.focus();
  }, []);

  const accept = () => {
    acceptConsent();
    onAccept();
  };

  return (
    <div
      className="consent-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      aria-describedby="consent-lead"
    >
      <div className="consent-card">
        <div className="consent-brand">
          <LogoMark size={30} />
          <span className="brand-name mono">TICKER</span>
        </div>
        <div className="consent-shield">
          <ShieldIcon size={22} />
        </div>
        <h2 id="consent-title">Before you use Ticker</h2>
        <p className="consent-lead" id="consent-lead">
          Ticker is a <strong>research and data-visualization tool, not personalized financial advice</strong>.
          Please read this before continuing.
        </p>

        <ul className="consent-points">
          <li>Nothing here is personalized financial, investment, tax, or legal advice.</li>
          <li>Scores, ratings, signals, and backtests are mechanical algorithm outputs, not recommendations to buy or sell.</li>
          <li>Market data comes from third-party public feeds and is delayed; backtests are hypothetical.</li>
          <li>Your investment decisions are your own. Do your own research and consider a licensed professional.</li>
        </ul>

        <div className="consent-actions">
          <button
            className="btn btn-ghost"
            onClick={() => navigate("/disclaimer")}
          >
            Read the full Disclaimer
          </button>
          <button ref={acceptRef} className="btn btn-primary" onClick={accept}>
            <ShieldIcon size={15} /> I understand &amp; accept
          </button>
        </div>

        <p className="consent-foot dim">
          By accepting you agree to the terms in the full Disclaimer. This choice is remembered only on this
          device.
        </p>
      </div>
    </div>
  );
}
