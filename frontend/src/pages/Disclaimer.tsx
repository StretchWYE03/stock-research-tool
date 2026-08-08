import { useNavigate } from "react-router-dom";
import { acceptConsent } from "../lib/consent";
import { ShieldIcon } from "../components/Icons";

export default function Disclaimer() {
  const navigate = useNavigate();

  const accept = () => {
    acceptConsent();
    navigate("/");
  };

  return (
    <div className="page page-reveal">
      <div className="page-head">
        <div>
          <h1 className="page-title">Disclaimer</h1>
          <p className="page-sub">Read carefully. This governs your use of Ticker.</p>
        </div>
      </div>

      <div className="panel disclaimer-panel">
        <div className="disclaimer-banner">
          <ShieldIcon size={18} />
          <span>
            <strong>Important:</strong> Ticker is a research and data-visualization tool. It is{" "}
            <strong>not personalized financial advice</strong>, and nothing it shows is tailored to you.
          </span>
        </div>

        <h3>1. Not financial advice</h3>
        <p>
          Ticker provides information and visualizations for educational and research purposes only. Nothing on
          this application constitutes personalized financial, investment, tax, or legal advice, and nothing is
          tailored to your individual circumstances, objectives, risk tolerance, or financial situation.
        </p>

        <h3>2. No adviser or client relationship</h3>
        <p>
          Using Ticker does not create a client, fiduciary, or advisory relationship between you and Ticker, its
          developers, or any affiliated party. We are not acting as your investment adviser, broker, or agent.
        </p>

        <h3>3. No recommendations or offers</h3>
        <p>
          Scores, ratings, signals, and backtest results are mechanical outputs of rule-based algorithms running
          on historical data. They are not recommendations, endorsements, or solicitations to buy, sell, or hold
          any security, and they are not offers to sell or solicitations of an offer to buy any security. You
          should never rely on them as a substitute for your own analysis.
        </p>

        <h3>4. Educational and informational purposes</h3>
        <p>
          All content is provided for general information and education. It is a visualizer of public market data,
          not a decision engine. It does not account for your financial goals, holdings, time horizon, or tax
          situation.
        </p>

        <h3>5. Data limitations</h3>
        <p>
          Market data is supplied by third-party providers, including Yahoo Finance public endpoints, and is
          provided “as is” without warranty of accuracy, completeness, timeliness, or fitness for any particular
          purpose. Free-tier feeds are delayed (typically around 15 minutes) and are not real-time. Data may
          contain errors, gaps, omissions, or adjustments (including corporate actions) that are not reflected.
        </p>

        <h3>6. Backtested performance is hypothetical</h3>
        <p>
          Past performance does not guarantee future results. Backtests are simulations computed locally from
          historical data and do not reflect actual trading, commissions, fees, slippage, taxes, or liquidity
          constraints. Simulated results may differ materially from live trading results.
        </p>

        <h3>7. Your responsibility</h3>
        <p>
          You are solely responsible for any investment decision you make. Before investing, we encourage you to
          consult a licensed financial adviser, tax professional, or other qualified expert, and to conduct your
          own independent research and due diligence.
        </p>

        <h3>8. No liability</h3>
        <p>
          To the fullest extent permitted by law, Ticker and its developers disclaim all liability for any loss or
          damage, including direct, indirect, incidental, consequential, or special damages, arising from your
          use of the application, your reliance on its content, or any decision made based on it.
        </p>

        <h3>9. No guarantee of service</h3>
        <p>
          Ticker makes no guarantee that any feature, dataset, or output will be available, accurate, or
          uninterrupted. Features, data sources, and algorithms may change or be discontinued at any time without
          notice.
        </p>

        <h3>10. Jurisdiction and applicability</h3>
        <p>
          This application is provided without regard to your local laws or regulations. It is your responsibility
          to ensure your use complies with the laws of your jurisdiction. Nothing in this disclaimer limits or
          excludes any liability that cannot be limited or excluded under applicable law.
        </p>

        <h3>11. Acceptance</h3>
        <p>
          By accessing or using Ticker, you acknowledge that you have read, understood, and agree to be bound by
          this disclaimer. If you do not agree, do not use the application.
        </p>

        <div className="disclaimer-accept">
          <button className="btn btn-primary" onClick={accept}>
            <ShieldIcon size={15} /> I understand &amp; accept
          </button>
          <span className="dim">Accepting lets you use Ticker; this choice is remembered on this device.</span>
        </div>
      </div>
    </div>
  );
}
