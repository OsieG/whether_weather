export type UlapMood = "idle" | "thinking" | "happy";

/** Ulap ("cloud" in Filipino), the chat mascot. */
export default function Ulap({ mood = "idle", size = 72 }: { mood?: UlapMood; size?: number }) {
  return (
    <svg viewBox="0 0 120 100" width={size} height={size * (100 / 120)} className="ulap" data-mood={mood} aria-hidden>
      <ellipse className="ulap-shadow" cx="62" cy="92" rx="30" ry="4" fill="#000" opacity="0.14" />
      <g className="ulap-body">
        <g fill="var(--ulap)">
          <circle cx="38" cy="60" r="24" />
          <circle cx="62" cy="46" r="29" />
          <circle cx="88" cy="60" r="23" />
          <rect x="22" y="58" width="82" height="28" rx="14" />
        </g>
        <path d="M30 80 Q62 90 96 80" stroke="#000" strokeOpacity="0.06" strokeWidth="6" fill="none" strokeLinecap="round" />

        {/* cheeks */}
        <ellipse cx="42" cy="72" rx="6.5" ry="4" fill="#ff9fb4" opacity="0.75" />
        <ellipse cx="82" cy="72" rx="6.5" ry="4" fill="#ff9fb4" opacity="0.75" />

        {/* eyes */}
        <g className="ulap-eyes" fill="#26305a">
          {mood === "happy" ? (
            <>
              <path d="M44 66 Q50 57 56 66" stroke="#26305a" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M68 66 Q74 57 80 66" stroke="#26305a" strokeWidth="3" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <ellipse className="ulap-eye" cx="50" cy="64" rx="4.6" ry="6.2" />
              <ellipse className="ulap-eye" cx="74" cy="64" rx="4.6" ry="6.2" />
              <circle cx="51.6" cy="61.6" r="1.5" fill="#fff" />
              <circle cx="75.6" cy="61.6" r="1.5" fill="#fff" />
            </>
          )}
        </g>

        {/* mouth */}
        {mood === "thinking" ? (
          <circle cx="62" cy="75" r="2.6" fill="#26305a" />
        ) : (
          <path d="M55 72.5 Q62 80 69 72.5" stroke="#26305a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        )}
      </g>

      {/* sun sparkle */}
      <path className="ulap-spark" d="M104 12 L107 21 L116 24 L107 27 L104 36 L101 27 L92 24 L101 21 Z" fill="#ffc83d" />
    </svg>
  );
}
