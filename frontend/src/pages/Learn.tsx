import { useState } from "react";
import { GLOSSARY } from "../data/glossary";
import { ChevronRightIcon } from "../components/Icons";

export default function Learn() {
  const [open, setOpen] = useState<string | null>(null);
  const article = GLOSSARY.find((a) => a.slug === open);

  return (
    <div className="page page-reveal">
      <div className="page-head">
        <div>
          <h1 className="page-title">Learn</h1>
          <p className="page-sub">Plain-English guides to the numbers on every screen, built for beginners.</p>
        </div>
      </div>

      <div className="learn-layout">
        <div className="learn-list">
          {GLOSSARY.map((a, i) => (
            <button
              key={a.slug}
              className={`learn-item ${open === a.slug ? "learn-item-open" : ""}`}
              style={{ animationDelay: `${i * 40}ms` }}
              aria-expanded={open === a.slug}
              onClick={() => setOpen(open === a.slug ? null : a.slug)}
            >
              <span className="learn-item-icon">{a.icon}</span>
              <span className="learn-item-text">
                <span className="learn-item-title">{a.title}</span>
                <span className="learn-item-summary">{a.summary}</span>
              </span>
              <ChevronRightIcon size={15} className={`learn-chevron ${open === a.slug ? "learn-chevron-open" : ""}`} />
            </button>
          ))}
        </div>

        <div className="learn-article">
          {article ? (
            <>
              <div className="learn-article-head">
                <span className="learn-article-icon">{article.icon}</span>
                <h2>{article.title}</h2>
              </div>
              {article.body.map((p, i) => (
                <p key={i} className="learn-article-p">
                  {p}
                </p>
              ))}
              {article.seeAlso && (
                <div className="learn-see-also">
                  <span className="learn-see-tag">In Ticker</span>
                  <span>{article.seeAlso}</span>
                </div>
              )}
            </>
          ) : (
            <div className="learn-placeholder">
              <span className="learn-placeholder-mark">?</span>
              <p>Pick a topic on the left. Each one explains a concept you'll see in the app: what it means, why it matters, and where to find it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
