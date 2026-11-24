import type { Dict } from "@/lib/i18n/dict";
import type { Stage } from "@/lib/types";

const STAGE_STYLE: Record<Stage, string> = {
  scrutiny: "bg-brand-soft text-brand",
  field_enquiry: "bg-brand-soft text-brand",
  decision: "bg-brand-soft text-brand",
  approved: "bg-good-soft text-good-text",
  rejected: "bg-critical-soft text-critical",
  returned: "bg-page text-ink-2 border border-line",
};

export function StageBadge({ stage, t, short = false }: { stage: Stage; t: Dict; short?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STAGE_STYLE[stage]}`}>
      {short ? t.stageShort[stage] : t.stages[stage]}
    </span>
  );
}

export function DueBadge({ daysLeft, t }: { daysLeft: number; t: Dict }) {
  if (daysLeft < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-critical px-2.5 py-0.5 text-xs font-semibold text-white">
        <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
          <path d="M8 1.5 15 14H1L8 1.5Zm-.75 4.5v4h1.5V6h-1.5Zm0 5v1.5h1.5V11h-1.5Z" />
        </svg>
        {t.due.overdue(-daysLeft)}
      </span>
    );
  }
  if (daysLeft <= 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning px-2.5 py-0.5 text-xs font-semibold text-[#0b0b0b]">
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 4.5V8l2 1.5" />
        </svg>
        {daysLeft === 0 ? t.due.today : t.due.left(daysLeft)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2">
      {t.due.left(daysLeft)}
    </span>
  );
}

export function AiFlagBadge({ count, t }: { count: number; t: Dict }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ai-line bg-ai-soft px-2.5 py-0.5 text-xs font-semibold text-ai">
      <span aria-hidden>✦</span>
      {t.dashboard.flags(count)}
    </span>
  );
}
