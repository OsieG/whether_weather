import { moonLitPath } from "@/lib/sky";

type Props = {
  /** 0 (new) to 1 (full) */
  fraction: number;
  waning?: boolean;
  size?: number;
  className?: string;
};

export default function MoonDisc({ fraction, waning = false, size = 48, className }: Props) {
  const f = Math.min(1, Math.max(0, fraction));
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden>
      <circle cx="50" cy="50" r="49" fill="#2b3358" opacity="0.4" />
      <circle cx="50" cy="50" r="49" fill="none" stroke="#f4efdc" strokeOpacity="0.35" strokeWidth="2" />
      <g transform={waning ? "translate(100 0) scale(-1 1)" : undefined}>
        <path d={moonLitPath(f)} transform="translate(0 0)" fill="#f4efdc" />
      </g>
    </svg>
  );
}
