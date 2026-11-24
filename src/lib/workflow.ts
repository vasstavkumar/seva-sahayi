import type { Role, Stage } from "./types";

/**
 * Workflow:
 *
 *   scrutiny ──verify──▶ field_enquiry ──submit──▶ decision ──approve──▶ approved
 *      │                     │                     │  └─────reject───▶ rejected
 *      │                     │                     └──send_back──▶ field_enquiry
 *      └──────return─────────┴─────return──────────┴──▶ returned ──resubmit──▶ scrutiny
 *
 * GPO/RI does scrutiny + field visit, Tahsildar decides.
 */
export const ACTIONS = [
  "verify_documents",
  "submit_enquiry",
  "approve",
  "reject",
  "return_to_applicant",
  "send_back",
  "resubmit",
] as const;
export type Action = (typeof ACTIONS)[number];

type Transition = { from: readonly Stage[]; to: Stage; requiresRemarks: boolean };

export const TRANSITIONS: Record<Action, Transition> = {
  verify_documents: { from: ["scrutiny"], to: "field_enquiry", requiresRemarks: false },
  submit_enquiry: { from: ["field_enquiry"], to: "decision", requiresRemarks: false },
  approve: { from: ["decision"], to: "approved", requiresRemarks: false },
  reject: { from: ["decision"], to: "rejected", requiresRemarks: true },
  return_to_applicant: {
    from: ["scrutiny", "field_enquiry", "decision"],
    to: "returned",
    requiresRemarks: true,
  },
  send_back: { from: ["decision"], to: "field_enquiry", requiresRemarks: true },
  resubmit: { from: ["returned"], to: "scrutiny", requiresRemarks: false },
};

export const STAGE_OWNER: Partial<Record<Stage, Role>> = {
  scrutiny: "field_officer",
  field_enquiry: "field_officer",
  decision: "tahsildar",
  returned: "field_officer",
};

export const SLA_DAYS = 7;

export function canActOnStage(role: Role, stage: Stage): boolean {
  if (role === "demo") return STAGE_OWNER[stage] !== undefined;
  return STAGE_OWNER[stage] === role;
}

export type TransitionCheck =
  | { ok: true; to: Stage }
  | { ok: false; error: "invalid_stage" | "not_permitted" | "remarks_required" };

export function checkTransition(
  role: Role,
  stage: Stage,
  action: Action,
  remarks?: string,
): TransitionCheck {
  const t = TRANSITIONS[action];
  if (!t.from.includes(stage)) return { ok: false, error: "invalid_stage" };
  if (!canActOnStage(role, stage)) return { ok: false, error: "not_permitted" };
  if (t.requiresRemarks && !remarks?.trim()) return { ok: false, error: "remarks_required" };
  return { ok: true, to: t.to };
}

export function availableActions(role: Role, stage: Stage): Action[] {
  if (!canActOnStage(role, stage)) return [];
  return ACTIONS.filter((a) => TRANSITIONS[a].from.includes(stage));
}

export function isClosed(stage: Stage): boolean {
  return stage === "approved" || stage === "rejected";
}

// for the progress bar, closed = 3
export function stepIndex(stage: Stage): number {
  switch (stage) {
    case "scrutiny":
    case "returned":
      return 0;
    case "field_enquiry":
      return 1;
    case "decision":
      return 2;
    default:
      return 3;
  }
}
