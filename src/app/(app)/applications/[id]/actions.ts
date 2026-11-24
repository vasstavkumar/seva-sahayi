"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { applications, documents, type Application, type User } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { findVisibleApplication } from "@/lib/queries";
import { aiQuotaExceeded } from "@/lib/rate-limit";
import { aiChecklist, aiDecision, aiEnquiryReport, aiScrutiny } from "@/lib/ai/steps";
import { logEvent } from "@/lib/events";
import { withNameChecks } from "@/lib/name-check";
import { getLang } from "@/lib/i18n/server";
import type { DecisionData, EnquiryData, ScrutinyData, Stage } from "@/lib/types";
import { ACTIONS, canActOnStage, checkTransition, SLA_DAYS, type Action } from "@/lib/workflow";

export type ActionResult = { ok: true } | { ok: false; error: string };

// server actions are just POST endpoints, validate everything
const idSchema = z.number().int().positive();
const MAX_INCOME = 100_000_000; // ₹10 crore: anything above is a typo
const workflowSchema = z.object({
  id: idSchema,
  action: z.enum(ACTIONS),
  remarks: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  establishedIncome: z.number().int().positive().max(MAX_INCOME).optional(),
  certifiedIncome: z.number().int().positive().max(MAX_INCOME).optional(),
});

async function loadApp(id: unknown, user: User): Promise<Application | undefined> {
  const parsed = idSchema.safeParse(id);
  return parsed.success ? findVisibleApplication(parsed.data, user) : undefined;
}

function done(id: number): ActionResult {
  revalidatePath(`/applications/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

// --- AI suggestions (stored + logged, never change the stage) ---

async function aiGuard(id: number, stage: Stage) {
  const user = await requireUser();
  const app = await loadApp(id, user);
  if (!app) return { ok: false as const, error: "generic" };
  if (app.stage !== stage) return { ok: false as const, error: "invalid_stage" };
  if (!canActOnStage(user.role, stage)) return { ok: false as const, error: "not_permitted" };
  if (await aiQuotaExceeded(user.id)) return { ok: false as const, error: "ai_rate_limited" };
  return { ok: true as const, user, app, lang: await getLang() };
}

// don't save a stale suggestion if someone moved the app while Gemini was running
function stillAt(id: number, stage: Stage) {
  return and(eq(applications.id, id), eq(applications.stage, stage));
}

export async function runScrutinyAi(id: number): Promise<ActionResult> {
  const g = await aiGuard(id, "scrutiny");
  if (!g.ok) return g;
  const docs = await db.query.documents.findMany({
    where: eq(documents.applicationId, id),
    orderBy: asc(documents.id),
  });
  const res = await aiScrutiny(g.app, docs, g.lang);
  if (!res.ok) return { ok: false, error: `ai_${res.error}` };

  const ai = withNameChecks(res.data, g.app.applicantNameEn, g.lang);
  const scrutiny: ScrutinyData = { ...g.app.scrutiny, ai, aiMeta: res.meta };
  await db.transaction(async (tx) => {
    await tx.update(applications).set({ scrutiny, updatedAt: new Date() }).where(stillAt(id, "scrutiny"));
    await logEvent(tx, {
      applicationId: id,
      actor: "ai",
      kind: "ai_scrutiny",
      stage: "scrutiny",
      details: { aiRecommendation: ai.recommendation, flags: ai.flags.length, model: res.meta.model, requestedBy: g.user.id },
    });
  });
  return done(id);
}

export async function runChecklistAi(id: number): Promise<ActionResult> {
  const g = await aiGuard(id, "field_enquiry");
  if (!g.ok) return g;
  const res = await aiChecklist(g.app, g.lang);
  if (!res.ok) return { ok: false, error: `ai_${res.error}` };

  const enquiry: EnquiryData = { ...g.app.enquiry, checklist: res.data, checklistMeta: res.meta };
  await db.transaction(async (tx) => {
    await tx.update(applications).set({ enquiry, updatedAt: new Date() }).where(stillAt(id, "field_enquiry"));
    await logEvent(tx, {
      applicationId: id,
      actor: "ai",
      kind: "ai_checklist",
      stage: "field_enquiry",
      details: { model: res.meta.model, requestedBy: g.user.id },
    });
  });
  return done(id);
}

export async function runEnquiryReportAi(id: number, notes: string): Promise<ActionResult> {
  const g = await aiGuard(id, "field_enquiry");
  if (!g.ok) return g;
  const clean = typeof notes === "string" ? notes.trim().slice(0, 5000) : "";
  if (!clean) return { ok: false, error: "notes_required" };

  const res = await aiEnquiryReport(g.app, clean, g.lang);
  if (!res.ok) return { ok: false, error: `ai_${res.error}` };

  const enquiry: EnquiryData = { ...g.app.enquiry, notes: clean, report: res.data, reportMeta: res.meta };
  await db.transaction(async (tx) => {
    await tx.update(applications).set({ enquiry, updatedAt: new Date() }).where(stillAt(id, "field_enquiry"));
    await logEvent(tx, {
      applicationId: id,
      actor: "ai",
      kind: "ai_report",
      stage: "field_enquiry",
      details: { estimatedIncome: res.data.estimatedAnnualIncome, model: res.meta.model, requestedBy: g.user.id },
    });
  });
  return done(id);
}

export async function runDecisionAi(id: number): Promise<ActionResult> {
  const g = await aiGuard(id, "decision");
  if (!g.ok) return g;
  const res = await aiDecision(g.app, g.lang);
  if (!res.ok) return { ok: false, error: `ai_${res.error}` };

  const decision: DecisionData = { ...g.app.decision, ai: res.data, aiMeta: res.meta };
  await db.transaction(async (tx) => {
    await tx.update(applications).set({ decision, updatedAt: new Date() }).where(stillAt(id, "decision"));
    await logEvent(tx, {
      applicationId: id,
      actor: "ai",
      kind: "ai_decision",
      stage: "decision",
      details: {
        aiRecommendation: res.data.suggestedOutcome,
        certifiedIncome: res.data.certifiedIncome,
        model: res.meta.model, requestedBy: g.user.id,
      },
    });
  });
  return done(id);
}

// --- officer actions ---

export type WorkflowInput = {
  id: number;
  action: Action;
  remarks?: string;
  notes?: string;
  establishedIncome?: number;
  certifiedIncome?: number;
};

function aiAgreement(app: Application, action: Action): { aiRecommendation?: string; followedAi?: boolean } {
  if (app.stage === "scrutiny" && app.scrutiny.ai) {
    const rec = app.scrutiny.ai.recommendation;
    const did = action === "verify_documents" ? "verify" : action === "return_to_applicant" ? "return" : null;
    return { aiRecommendation: rec, followedAi: did === rec };
  }
  if (app.stage === "decision" && app.decision.ai) {
    const rec = app.decision.ai.suggestedOutcome;
    const did =
      action === "approve" ? "approve" : action === "reject" ? "reject" : action === "return_to_applicant" ? "return" : null;
    return { aiRecommendation: rec, followedAi: did === rec };
  }
  return {};
}

export async function performAction(raw: WorkflowInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsedInput = workflowSchema.safeParse(raw);
  if (!parsedInput.success) return { ok: false, error: "generic" };
  const input = parsedInput.data;
  const app = await loadApp(input.id, user);
  if (!app) return { ok: false, error: "generic" };

  const remarks = input.remarks?.trim().slice(0, 2000) || undefined;
  const check = checkTransition(user.role, app.stage, input.action, remarks);
  if (!check.ok) return { ok: false, error: check.error };

  const now = new Date();
  const patch: Partial<Application> = { stage: check.to, updatedAt: now };
  const agreement = aiAgreement(app, input.action);

  switch (input.action) {
    case "verify_documents":
      patch.scrutiny = { ...app.scrutiny, officerNotes: remarks, verifiedAt: now.toISOString() };
      break;

    case "submit_enquiry": {
      const notes = input.notes?.trim();
      if (!notes) return { ok: false, error: "notes_required" };
      const income = input.establishedIncome;
      if (!income || income <= 0 || !Number.isFinite(income)) return { ok: false, error: "income_required" };
      patch.enquiry = {
        ...app.enquiry,
        notes: notes.slice(0, 5000),
        officerEstimatedIncome: Math.round(income),
        submittedAt: now.toISOString(),
      };
      break;
    }

    case "approve": {
      const income = input.certifiedIncome;
      if (!income || income <= 0 || !Number.isFinite(income)) return { ok: false, error: "income_required" };
      patch.closedAt = now;
      patch.decision = {
        ...app.decision,
        outcome: "approved",
        remarks,
        certifiedIncome: Math.round(income),
        certificateNo: `TS-CVL-INC-${now.getFullYear()}-${String(app.id).padStart(5, "0")}`,
        decidedAt: now.toISOString(),
      };
      break;
    }

    case "reject":
      patch.closedAt = now;
      patch.decision = { ...app.decision, outcome: "rejected", remarks, decidedAt: now.toISOString() };
      break;

    case "return_to_applicant":
      patch.returnCount = app.returnCount + 1;
      break;

    case "send_back":
      // keep notes, force a new report
      patch.enquiry = { ...app.enquiry, submittedAt: undefined };
      patch.decision = {};
      break;

    case "resubmit":
      // resubmitted: SLA clock restarts
      patch.dueAt = new Date(now.getTime() + SLA_DAYS * 86_400_000);
      patch.scrutiny = {};
      break;
  }

  const kind = (
    {
      verify_documents: "documents_verified",
      submit_enquiry: "enquiry_submitted",
      approve: "approved",
      reject: "rejected",
      return_to_applicant: "returned",
      send_back: "sent_back",
      resubmit: "resubmitted",
    } as const
  )[input.action];

  const ok = await db.transaction(async (tx) => {
    // CAS on stage so a double submit can't apply twice
    const updated = await tx
      .update(applications)
      .set(patch)
      .where(and(eq(applications.id, app.id), eq(applications.stage, app.stage)))
      .returning({ id: applications.id });
    if (updated.length === 0) return false;

    await logEvent(tx, {
      applicationId: app.id,
      actor: input.action === "resubmit" ? "citizen" : user,
      kind,
      stage: app.stage,
      details: {
        remarks,
        ...agreement,
        estimatedIncome: patch.enquiry?.officerEstimatedIncome,
        certifiedIncome: patch.decision?.certifiedIncome,
        certificateNo: patch.decision?.certificateNo,
      },
    });
    return true;
  });

  if (!ok) return { ok: false, error: "invalid_stage" };
  return done(app.id);
}
