interface InfoTipProps {
  text: string;
}

/** Small ⓘ that reveals a plain-English explanation on hover/focus. */
export default function InfoTip({ text }: InfoTipProps) {
  return (
    <span className="infotip" tabIndex={0} role="tooltip" aria-label={text}>
      <span className="infotip-icon" aria-hidden="true">
        i
      </span>
      <span className="infotip-bubble" aria-hidden="true">
        {text}
      </span>
    </span>
  );
}
