import { cn } from "@/lib/utils";

export function ScoreRing({
  score,
  size = 56,
  className,
}: {
  score: number;
  size?: number;
  className?: string;
}) {
  const normalized = Math.round(Math.min(1, Math.max(0, score)) * 100);
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const color =
    normalized >= 60
      ? "var(--color-score-good)"
      : normalized >= 40
        ? "var(--color-score-mid)"
        : "var(--color-score-low)";

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-label={`생활 취향 궁합 ${normalized}점`}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r={radius} fill="none" stroke="var(--color-muted-surface)" strokeWidth="3" />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - normalized / 100)}
        />
      </svg>
      <span className="relative flex flex-col items-center text-center leading-none">
        <strong className="text-base tabular-nums" style={{ color }}>
          {normalized}
        </strong>
        <span className="mt-0.5 text-[9px] text-muted">궁합</span>
      </span>
    </span>
  );
}
