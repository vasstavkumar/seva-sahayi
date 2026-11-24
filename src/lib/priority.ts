import type { Stage } from "./types";

export type PriorityReason = "overdue" | "due_soon" | "purpose_deadline" | "ai_flags" | "returned_before";

export type PriorityInput = {
  stage: Stage;
  dueAt: Date;
  purposeDeadline: string | null; // YYYY-MM-DD
  flagCount: number;
  returnCount: number;
};

export type Priority = {
  score: number;
  reasons: PriorityReason[];
  // negative = overdue
  daysLeft: number;
  purposeDaysLeft: number | null;
};

const DAY = 24 * 60 * 60 * 1000;

// calendar days in IST, not 24h blocks
export function calendarDaysBetween(from: Date, to: Date): number {
  const ist = (d: Date) => {
    const shifted = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  };
  return Math.round((ist(to) - ist(from)) / DAY);
}

// overdue > due soon > citizen deadline > AI flags > returned before
export function computePriority(app: PriorityInput, now: Date = new Date()): Priority {
  const daysLeft = calendarDaysBetween(now, app.dueAt);
  const purposeDaysLeft = app.purposeDeadline
    ? calendarDaysBetween(now, new Date(`${app.purposeDeadline}T00:00:00+05:30`))
    : null;

  const reasons: PriorityReason[] = [];
  let score = 0;

  const active = app.stage === "scrutiny" || app.stage === "field_enquiry" || app.stage === "decision";
  if (!active) return { score: 0, reasons, daysLeft, purposeDaysLeft };

  if (daysLeft < 0) {
    score += 1000 + Math.min(-daysLeft, 30) * 20;
    reasons.push("overdue");
  } else if (daysLeft <= 2) {
    score += 500 + (2 - daysLeft) * 50;
    reasons.push("due_soon");
  }

  if (purposeDaysLeft !== null && purposeDaysLeft >= 0 && purposeDaysLeft <= 7) {
    score += 300 + (7 - purposeDaysLeft) * 30;
    reasons.push("purpose_deadline");
  }

  if (app.flagCount > 0) {
    score += 40 * Math.min(app.flagCount, 3);
    reasons.push("ai_flags");
  }

  if (app.returnCount > 0) {
    score += 20;
    reasons.push("returned_before");
  }

  // tie-break: less time left first
  score += Math.max(0, 10 - daysLeft);

  return { score, reasons, daysLeft, purposeDaysLeft };
}
