"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import type { RankedApplication } from "@/lib/queries";
import type { AiMeta } from "@/lib/types";
import type { Dict } from "@/lib/i18n/dict";
import { useI18n } from "@/lib/i18n/client";
import { rupees } from "@/lib/format";
import { availableActions, type Action } from "@/lib/workflow";
import { Button, Card, inputClass, Spinner } from "@/components/ui";
import { useSpeechToText } from "@/components/use-speech";
import {
  performAction,
  runChecklistAi,
  runDecisionAi,
  runEnquiryReportAi,
  runScrutinyAi,
  type ActionResult,
  type WorkflowInput,
} from "./actions";

type PanelProps = { app: RankedApplication; canAct: boolean; aiAvailable: boolean };

function errorText(t: Dict, code: string): string {
  switch (code) {
    case "notes_required":
      return t.enquiry.notesRequired;
    case "income_required":
      return t.enquiry.incomeRequired;
    case "ai_not_configured":
      return t.ai.notConfigured;
    case "ai_failed":
      return t.ai.failed;
    case "ai_rate_limited":
      return t.ai.rateLimited;
    default:
      return t.errors[code] ?? t.errors.generic;
  }
}

function useServerCall() {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>, onOk?: () => void) =>
    start(async () => {
      setError(null);
      try {
        const res = await fn();
        if (res.ok) onOk?.();
        else setError(errorText(t, res.error));
      } catch {
        setError(t.errors.generic);
      }
    });
  return { pending, error, run, setError };
}

export function StagePanel(props: PanelProps) {
  const { t } = useI18n();
  switch (props.app.stage) {
    case "scrutiny":
      return <ScrutinyPanel {...props} />;
    case "field_enquiry":
      return <EnquiryPanel {...props} />;
    case "decision":
      return <DecisionPanel {...props} />;
    case "returned":
      return (
        <Card className="space-y-3 border-warning bg-warning-soft p-4">
          <p className="font-medium">{t.app.returnedBanner}</p>
          {props.canAct && <ActionButtons app={props.app} />}
        </Card>
      );
    default:
      return <ClosedPanel app={props.app} />;
  }
}

// --- shared ---

function AiBox({
  intro,
  meta,
  hasResult,
  aiAvailable,
  canAct,
  runLabel,
  onRun,
  pending,
  error,
  children,
}: {
  intro: string;
  meta?: AiMeta;
  hasResult: boolean;
  aiAvailable: boolean;
  canAct: boolean;
  runLabel: string;
  onRun: () => void;
  pending: boolean;
  error: string | null;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-ai-line bg-ai-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-ai">
          <span aria-hidden>✦</span> {t.ai.label}
        </div>
        {canAct && aiAvailable && (
          <Button variant="ai" onClick={onRun} disabled={pending} className="min-h-9 py-1 text-sm">
            {pending ? (
              <>
                <Spinner /> {t.ai.running}
              </>
            ) : hasResult ? (
              t.ai.rerun
            ) : (
              runLabel
            )}
          </Button>
        )}
      </div>
      {!hasResult && <p className="mt-2 text-sm text-ink-2">{aiAvailable ? intro : t.ai.notConfigured}</p>}
      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical">
          {error}
        </p>
      )}
      {hasResult && <div className="mt-3 space-y-3 text-[15px]">{children}</div>}
      {hasResult && (
        <p className="mt-3 border-t border-ai-line pt-2 text-xs text-ai/80">
          {t.ai.disclaimer}
          {meta && <> · {t.ai.generatedBy(meta.model, (meta.ms / 1000).toFixed(1))}</>}
        </p>
      )}
    </div>
  );
}

function List({ title, items, tone = "plain" }: { title: string; items: string[]; tone?: "plain" | "warn" }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold text-ink-2">{title}</h4>
      <ul className="space-y-1">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className={tone === "warn" ? "text-critical" : "text-ai"}>
              {tone === "warn" ? "⚠" : "•"}
            </span>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// reject/return/send back ask for a reason before submitting
function ActionButtons({
  app,
  primary,
  extra,
  suggestedRemarks,
  disabledReason,
}: {
  app: RankedApplication;
  primary?: { action: Action; label?: string; build: () => Omit<WorkflowInput, "id" | "action"> | string };
  extra?: () => Omit<WorkflowInput, "id" | "action">;
  suggestedRemarks?: Partial<Record<Action, string>>;
  disabledReason?: string | null;
}) {
  const { t } = useI18n();
  const { pending, error, run, setError } = useServerCall();
  const [open, setOpen] = useState<Action | null>(null);
  const [remarks, setRemarks] = useState("");
  const actions = availableActions("demo", app.stage);
  const secondary = actions.filter((a) => a !== primary?.action);

  const submit = (action: Action, payload: Omit<WorkflowInput, "id" | "action">) =>
    run(() => performAction({ id: app.id, action, ...payload }), () => setOpen(null));

  const variantFor = (a: Action) =>
    a === "reject" ? "danger" : a === "approve" ? "good" : a === "resubmit" ? "primary" : "secondary";

  if (open) {
    const draft = suggestedRemarks?.[open];
    return (
      <div className="space-y-2 rounded-2xl border border-line bg-page p-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">
            {t.actions[open]} — {t.actionHelp[open] ?? t.remarksPlaceholder}
          </span>
          <textarea
            autoFocus
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={t.remarksPlaceholder}
            className={inputClass}
          />
        </label>
        {draft && remarks !== draft && (
          <button type="button" onClick={() => setRemarks(draft)} className="text-sm font-medium text-ai hover:underline">
            ✦ {t.ai.useDraft}
          </button>
        )}
        {error && <p className="text-sm text-critical">{error}</p>}
        <div className="flex gap-2">
          <Button
            variant={variantFor(open)}
            disabled={pending || !remarks.trim()}
            onClick={() => submit(open, { remarks, ...(extra?.() ?? {}) })}
          >
            {pending ? t.saving : t.confirm}
          </Button>
          <Button variant="secondary" onClick={() => (setOpen(null), setError(null))} disabled={pending}>
            {t.cancel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {disabledReason && <p className="text-sm text-muted">{disabledReason}</p>}
      {error && (
        <p role="alert" className="rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {primary && (
          <Button
            variant={primary.action === "approve" ? "good" : "primary"}
            disabled={pending}
            onClick={() => {
              const payload = primary.build();
              if (typeof payload === "string") setError(payload);
              else submit(primary.action, payload);
            }}
          >
            {pending ? t.saving : (primary.label ?? t.actions[primary.action])}
          </Button>
        )}
        {secondary.map((a) =>
          a === "resubmit" ? (
            <Button key={a} variant="primary" disabled={pending} onClick={() => submit(a, {})}>
              {pending ? t.saving : t.actions[a]}
            </Button>
          ) : (
            <Button
              key={a}
              variant={variantFor(a)}
              disabled={pending}
              onClick={() => {
                setRemarks("");
                setOpen(a);
              }}
            >
              {t.actions[a]}
            </Button>
          ),
        )}
      </div>
    </div>
  );
}

function StageCard({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <Card className="space-y-4 border-brand/30 p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-brand">{title}</h2>
        <p className="text-sm text-muted">{intro}</p>
      </div>
      {children}
    </Card>
  );
}

// --- step 1: scrutiny ---

const STATUS_STYLE: Record<string, string> = {
  match: "text-good-text",
  mismatch: "text-critical",
  missing: "text-critical",
  unclear: "text-[#8a5a00]",
};
const STATUS_ICON: Record<string, string> = { match: "✓", mismatch: "✗", missing: "✗", unclear: "?" };

function ScrutinyPanel({ app, canAct, aiAvailable }: PanelProps) {
  const { t } = useI18n();
  const ai = app.scrutiny.ai;
  const call = useServerCall();
  const [notes, setNotes] = useState(app.scrutiny.officerNotes ?? "");

  return (
    <StageCard title={t.scrutiny.title} intro={t.scrutiny.intro}>
      <AiBox
        intro={t.scrutiny.aiIntro}
        meta={app.scrutiny.aiMeta}
        hasResult={!!ai}
        aiAvailable={aiAvailable}
        canAct={canAct}
        runLabel={t.ai.run}
        onRun={() => call.run(() => runScrutinyAi(app.id))}
        pending={call.pending}
        error={call.error}
      >
        {ai && (
          <>
            <div
              className={`rounded-xl px-3 py-2 font-semibold ${
                ai.recommendation === "verify" ? "bg-good-soft text-good-text" : "bg-warning-soft text-[#6b4a00]"
              }`}
            >
              {t.ai.recommendation}: {ai.recommendation === "verify" ? t.scrutiny.recVerify : t.scrutiny.recReturn}
            </div>
            <p>{ai.summary}</p>
            <div>
              <h4 className="mb-1 text-sm font-semibold text-ink-2">{t.scrutiny.checks}</h4>
              <ul className="divide-y divide-ai-line rounded-xl border border-ai-line bg-white">
                {ai.checks.map((c, i) => (
                  <li key={i} className="flex gap-3 px-3 py-2 text-sm">
                    <span className={`w-28 shrink-0 font-semibold ${STATUS_STYLE[c.status]}`}>
                      {STATUS_ICON[c.status]} {t.scrutiny.status[c.status]}
                    </span>
                    <span>
                      <span className="font-medium">{c.field}</span> — {c.note}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <List title={t.scrutiny.flags} items={ai.flags} tone="warn" />
            <List title={t.scrutiny.missingDocs} items={ai.missingDocuments} tone="warn" />
            {ai.extracted.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold text-ink-2">{t.scrutiny.extracted}</summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-muted">
                      <tr>
                        <th className="py-1 pr-2">{t.app.documents}</th>
                        <th className="py-1 pr-2">{t.app.applicant}</th>
                        <th className="py-1 pr-2">{t.app.relation}</th>
                        <th className="py-1 pr-2">{t.app.address}</th>
                        <th className="py-1">₹</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ai.extracted.map((x, i) => (
                        <tr key={i} className="border-t border-ai-line align-top">
                          <td className="py-1 pr-2 font-medium">{x.document}</td>
                          <td className="py-1 pr-2">{x.name || "—"}</td>
                          <td className="py-1 pr-2">{x.relationName || "—"}</td>
                          <td className="py-1 pr-2">{x.address || "—"}</td>
                          <td className="py-1 tabular-nums">{x.annualIncome ? rupees(x.annualIncome) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </>
        )}
      </AiBox>

      {canAct && (
        <>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink-2">{t.scrutiny.notes}</span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
          </label>
          <ActionButtons
            app={app}
            primary={{ action: "verify_documents", label: t.scrutiny.verify, build: () => ({ remarks: notes }) }}
            suggestedRemarks={{ return_to_applicant: ai?.returnReasonDraft || undefined }}
          />
        </>
      )}
    </StageCard>
  );
}

// --- step 2: field enquiry ---

function EnquiryPanel({ app, canAct, aiAvailable }: PanelProps) {
  const { t } = useI18n();
  const e = app.enquiry;
  const checklistCall = useServerCall();
  const reportCall = useServerCall();
  const [notes, setNotes] = useState(e.notes ?? "");
  const [income, setIncome] = useState<string>(
    e.officerEstimatedIncome ? String(e.officerEstimatedIncome) : e.report ? String(e.report.estimatedAnnualIncome) : "",
  );
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const speech = useSpeechToText((text) => setNotes((n) => (n ? `${n} ${text}` : text)));

  // prefill from the AI estimate, but don't overwrite what the officer typed
  const [lastReport, setLastReport] = useState(e.report);
  if (e.report !== lastReport) {
    setLastReport(e.report);
    if (e.report && !income) setIncome(String(e.report.estimatedAnnualIncome));
  }

  const report = e.report;
  const scrutinyFlags = app.scrutiny.ai?.flags ?? [];

  return (
    <StageCard title={t.enquiry.title} intro={t.enquiry.intro}>
      {scrutinyFlags.length > 0 && (
        <div className="rounded-xl border border-line bg-page p-3 text-sm">
          <List title={t.decision.scrutinySummary} items={scrutinyFlags} tone="warn" />
        </div>
      )}

      <AiBox
        intro={t.enquiry.checklist}
        meta={e.checklistMeta}
        hasResult={!!e.checklist}
        aiAvailable={aiAvailable}
        canAct={canAct}
        runLabel={t.enquiry.getChecklist}
        onRun={() => checklistCall.run(() => runChecklistAi(app.id))}
        pending={checklistCall.pending}
        error={checklistCall.error}
      >
        {e.checklist && (
          <>
            <List title={t.enquiry.focus} items={e.checklist.focusAreas} />
            <div>
              <h4 className="mb-1 text-sm font-semibold text-ink-2">{t.enquiry.checklist}</h4>
              <ul className="space-y-1">
                {e.checklist.questions.map((q, i) => (
                  <li key={i}>
                    <label className="flex min-h-9 cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        className="mt-1.5 size-4 accent-ai"
                        checked={ticked.has(i)}
                        onChange={() =>
                          setTicked((s) => {
                            const n = new Set(s);
                            if (n.has(i)) n.delete(i);
                            else n.add(i);
                            return n;
                          })
                        }
                      />
                      <span className={ticked.has(i) ? "text-muted line-through" : ""}>{q}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </AiBox>

      {canAct && (
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <label htmlFor="notes" className="text-sm font-semibold">
              {t.enquiry.notes}
            </label>
            {speech.supported ? (
              <Button
                type="button"
                variant={speech.listening ? "danger" : "secondary"}
                className="min-h-9 py-1 text-sm"
                onClick={speech.listening ? speech.stop : () => speech.start("te-IN")}
              >
                <span aria-hidden>{speech.listening ? "■" : "🎤"}</span>
                {speech.listening ? t.enquiry.stop : t.enquiry.speak}
              </Button>
            ) : null}
          </div>
          <textarea
            id="notes"
            rows={5}
            value={notes}
            onChange={(ev) => setNotes(ev.target.value)}
            placeholder={t.enquiry.notesHint}
            className={inputClass}
          />
          {speech.listening && (
            <p className="text-sm text-critical">
              ● {t.enquiry.listening} {speech.interim && <span className="text-muted">{speech.interim}</span>}
            </p>
          )}
          {!speech.supported && <p className="text-xs text-muted">{t.enquiry.voiceUnsupported}</p>}
          {aiAvailable && (
            <Button
              variant="ai"
              disabled={reportCall.pending || !notes.trim()}
              onClick={() => reportCall.run(() => runEnquiryReportAi(app.id, notes))}
            >
              {reportCall.pending ? (
                <>
                  <Spinner /> {t.ai.running}
                </>
              ) : (
                <>✦ {t.enquiry.structure}</>
              )}
            </Button>
          )}
          {reportCall.error && <p className="text-sm text-critical">{reportCall.error}</p>}
        </div>
      )}

      {report && (
        <AiBox
          intro=""
          meta={e.reportMeta}
          hasResult
          aiAvailable={aiAvailable}
          canAct={false}
          runLabel=""
          onRun={() => {}}
          pending={false}
          error={null}
        >
          <h4 className="font-semibold">{t.enquiry.report}</h4>
          <p>{report.summary}</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">{t.enquiry.occupation}</dt>
              <dd className="font-medium">{report.occupation || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">{t.enquiry.land}</dt>
              <dd className="font-medium">{t.enquiry.acres(report.landAcres)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted">{t.enquiry.assets}</dt>
              <dd className="font-medium">{report.assets || "—"}</dd>
            </div>
          </dl>
          {report.earningMembers.length > 0 && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-ink-2">{t.enquiry.earningMembers}</h4>
              <ul className="divide-y divide-ai-line rounded-xl border border-ai-line bg-white text-sm">
                {report.earningMembers.map((m, i) => (
                  <li key={i} className="flex justify-between gap-2 px-3 py-1.5">
                    <span>
                      {m.relation} · {m.occupation}
                    </span>
                    <span className="font-medium tabular-nums">{rupees(m.annualIncome)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <IncomeCompare declared={app.declaredIncome} found={report.estimatedAnnualIncome} t={t} />
          <List title={t.enquiry.discrepancies} items={report.discrepancies} tone="warn" />
        </AiBox>
      )}

      {canAct && (
        <>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{t.enquiry.officerIncome}</span>
            <input
              inputMode="numeric"
              value={income}
              onChange={(ev) => setIncome(ev.target.value.replace(/[^\d]/g, ""))}
              className={`${inputClass} max-w-xs tabular-nums`}
              placeholder="0"
            />
          </label>
          <ActionButtons
            app={app}
            primary={{
              action: "submit_enquiry",
              label: t.enquiry.submit,
              build: () => {
                if (!notes.trim()) return t.enquiry.notesRequired;
                if (!Number(income)) return t.enquiry.incomeRequired;
                return { notes, establishedIncome: Number(income) };
              },
            }}
          />
        </>
      )}
    </StageCard>
  );
}

function IncomeCompare({ declared, found, t }: { declared: number; found: number; t: Dict }) {
  const diff = declared > 0 ? (found - declared) / declared : 0;
  const consistent = Math.abs(diff) <= 0.2;
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div className="rounded-xl border border-line bg-white px-3 py-2">
        <div className="text-muted">{t.decision.declared}</div>
        <div className="text-lg font-semibold tabular-nums">{rupees(declared)}</div>
      </div>
      <div
        className={`rounded-xl border px-3 py-2 ${consistent ? "border-good bg-good-soft" : "border-critical bg-critical-soft"}`}
      >
        <div className="text-muted">{t.decision.found}</div>
        <div className="text-lg font-semibold tabular-nums">{rupees(found)}</div>
        <div className={`text-xs font-semibold ${consistent ? "text-good-text" : "text-critical"}`}>
          {consistent ? `✓ ${t.enquiry.consistent}` : `⚠ ${t.enquiry.inconsistent} (${diff > 0 ? "+" : ""}${Math.round(diff * 100)}%)`}
        </div>
      </div>
    </div>
  );
}

// --- step 3: decision ---

function DecisionPanel({ app, canAct, aiAvailable }: PanelProps) {
  const { t } = useI18n();
  const d = app.decision;
  const ai = d.ai;
  const call = useServerCall();
  const established = app.enquiry.officerEstimatedIncome ?? 0;
  const [income, setIncome] = useState(String(established || ""));
  const [remarks, setRemarks] = useState("");

  const outcomeStyle =
    ai?.suggestedOutcome === "approve"
      ? "bg-good-soft text-good-text"
      : ai?.suggestedOutcome === "reject"
        ? "bg-critical-soft text-critical"
        : "bg-warning-soft text-[#6b4a00]";

  return (
    <StageCard title={t.decision.title} intro={t.decision.intro}>
      {/* What the earlier steps established, side by side */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-page p-3 text-sm">
          <h4 className="mb-1 font-semibold">{t.decision.scrutinySummary}</h4>
          <p>{app.scrutiny.ai?.summary || app.scrutiny.officerNotes || "—"}</p>
          {app.scrutiny.officerNotes && app.scrutiny.ai && (
            <p className="mt-1 text-muted">“{app.scrutiny.officerNotes}”</p>
          )}
        </div>
        <div className="rounded-xl border border-line bg-page p-3 text-sm">
          <h4 className="mb-1 font-semibold">{t.decision.enquirySummary}</h4>
          <p>{app.enquiry.report?.summary || app.enquiry.notes || "—"}</p>
        </div>
      </div>
      <IncomeCompare declared={app.declaredIncome} found={established} t={t} />

      <AiBox
        intro={t.decision.getSuggestion}
        meta={d.aiMeta}
        hasResult={!!ai}
        aiAvailable={aiAvailable}
        canAct={canAct}
        runLabel={t.decision.getSuggestion}
        onRun={() => call.run(() => runDecisionAi(app.id))}
        pending={call.pending}
        error={call.error}
      >
        {ai && (
          <>
            <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 font-semibold ${outcomeStyle}`}>
              <span>
                {t.ai.recommendation}: {t.decision.outcome[ai.suggestedOutcome]}
                {ai.suggestedOutcome === "approve" && ai.certifiedIncome > 0 && ` · ${rupees(ai.certifiedIncome)}`}
              </span>
              <span className="text-xs font-medium opacity-80">{t.ai.confidence[ai.confidence]}</span>
            </div>
            <div>
              <h4 className="mb-1 text-sm font-semibold text-ink-2">{t.decision.caseSummary}</h4>
              <p>{ai.caseSummary}</p>
            </div>
            <List title={t.decision.reasons} items={ai.reasons} />
            <div className="rounded-xl border border-ai-line bg-white p-3 text-sm">
              <p>{ai.draftRemarks}</p>
              {canAct && remarks !== ai.draftRemarks && (
                <button
                  type="button"
                  className="mt-1 font-medium text-ai hover:underline"
                  onClick={() => {
                    setRemarks(ai.draftRemarks);
                    if (ai.certifiedIncome > 0) setIncome(String(ai.certifiedIncome));
                  }}
                >
                  ✦ {t.ai.useDraft}
                </button>
              )}
            </div>
          </>
        )}
      </AiBox>

      {canAct && (
        <>
          <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">{t.decision.certifiedIncome}</span>
              <input
                inputMode="numeric"
                value={income}
                onChange={(ev) => setIncome(ev.target.value.replace(/[^\d]/g, ""))}
                className={`${inputClass} tabular-nums`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">{t.decision.remarks}</span>
              <textarea rows={2} value={remarks} onChange={(ev) => setRemarks(ev.target.value)} className={inputClass} />
            </label>
          </div>
          <ActionButtons
            app={app}
            primary={{
              action: "approve",
              build: () => (Number(income) > 0 ? { remarks, certifiedIncome: Number(income) } : t.enquiry.incomeRequired),
            }}
            suggestedRemarks={
              ai
                ? {
                    reject: ai.suggestedOutcome === "reject" ? ai.draftRemarks : undefined,
                    return_to_applicant: ai.suggestedOutcome === "return" ? ai.draftRemarks : undefined,
                  }
                : undefined
            }
          />
        </>
      )}
    </StageCard>
  );
}

// --- closed ---

function ClosedPanel({ app }: { app: RankedApplication }) {
  const { t } = useI18n();
  const d = app.decision;
  const approved = app.stage === "approved";
  return (
    <Card className={`space-y-2 p-4 ${approved ? "border-good bg-good-soft" : "border-critical bg-critical-soft"}`}>
      <p className={`text-lg font-bold ${approved ? "text-good-text" : "text-critical"}`}>
        {approved ? "✓" : "✗"} {t.stages[app.stage]}
      </p>
      {approved && d.certifiedIncome !== undefined && (
        <p>
          {t.certificate.annualIncome}: <strong className="tabular-nums">{rupees(d.certifiedIncome)}</strong>
          {d.certificateNo && <span className="ml-2 text-sm text-muted">· {d.certificateNo}</span>}
        </p>
      )}
      {d.remarks && <p className="text-sm">“{d.remarks}”</p>}
      {approved && (
        <Link
          href={`/certificate/${app.id}`}
          className="inline-flex min-h-11 items-center rounded-xl bg-good-text px-4 font-semibold text-white hover:bg-[#004d00]"
        >
          {t.app.viewCertificate}
        </Link>
      )}
    </Card>
  );
}
