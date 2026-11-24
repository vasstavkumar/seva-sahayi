import type { EventRow } from "@/db/schema";
import type { ActiveStage } from "./types";

const DAY = 86_400_000;

export type ClosedApp = {
  id: number;
  submittedAt: Date;
  closedAt: Date;
  dueAt: Date;
  returnCount: number;
};

export type ImpactMetrics = {
  closed: number;
  avgTurnaroundDays: number;
  withinSlaPct: number;
  returnRatePct: number;
  aiDecisions: number;
  aiAgreementPct: number | null;
  overrides: number;
  avgStageDays: Record<ActiveStage, number>;
};

// time per step from the event log (time in 'returned' isn't counted)
export function stageDurations(history: EventRow[]): Record<ActiveStage, number> {
  const out: Record<ActiveStage, number> = { scrutiny: 0, field_enquiry: 0, decision: 0 };
  let current: ActiveStage | null = null;
  let since = 0;
  const enter = (s: ActiveStage | null, at: number) => {
    if (current) out[current] += at - since;
    current = s;
    since = at;
  };
  for (const e of [...history].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const at = e.createdAt.getTime();
    switch (e.kind) {
      case "submitted":
      case "resubmitted":
        enter("scrutiny", at);
        break;
      case "documents_verified":
      case "sent_back":
        enter("field_enquiry", at);
        break;
      case "enquiry_submitted":
        enter("decision", at);
        break;
      case "returned":
      case "approved":
      case "rejected":
        enter(null, at);
        break;
    }
  }
  return out;
}

export function computeImpact(apps: ClosedApp[], history: EventRow[]): ImpactMetrics {
  const byApp = new Map<number, EventRow[]>();
  for (const e of history) byApp.set(e.applicationId, [...(byApp.get(e.applicationId) ?? []), e]);

  const n = apps.length || 1;
  const turnaround = apps.reduce((s, a) => s + (a.closedAt.getTime() - a.submittedAt.getTime()), 0) / n / DAY;
  const withinSla = apps.filter((a) => a.closedAt <= a.dueAt).length;
  const returned = apps.filter((a) => a.returnCount > 0).length;

  const judged = history.filter((e) => e.actorRole !== "ai" && e.details.followedAi !== undefined);
  const agreed = judged.filter((e) => e.details.followedAi).length;

  const totals: Record<ActiveStage, number> = { scrutiny: 0, field_enquiry: 0, decision: 0 };
  for (const a of apps) {
    const d = stageDurations(byApp.get(a.id) ?? []);
    totals.scrutiny += d.scrutiny;
    totals.field_enquiry += d.field_enquiry;
    totals.decision += d.decision;
  }

  return {
    closed: apps.length,
    avgTurnaroundDays: apps.length ? turnaround : 0,
    withinSlaPct: apps.length ? (withinSla / n) * 100 : 0,
    returnRatePct: apps.length ? (returned / n) * 100 : 0,
    aiDecisions: judged.length,
    aiAgreementPct: judged.length ? (agreed / judged.length) * 100 : null,
    overrides: judged.length - agreed,
    avgStageDays: {
      scrutiny: totals.scrutiny / n / DAY,
      field_enquiry: totals.field_enquiry / n / DAY,
      decision: totals.decision / n / DAY,
    },
  };
}
