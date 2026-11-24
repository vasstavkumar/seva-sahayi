import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { getApplicationDetail } from "@/lib/queries";
import { aiEnabled } from "@/lib/ai/gemini";
import { canActOnStage, isClosed, STAGE_OWNER, stepIndex } from "@/lib/workflow";
import { applicantName, formatDate, rupees } from "@/lib/format";
import { place } from "@/lib/places";
import type { Purpose, Stage } from "@/lib/types";
import type { Dict } from "@/lib/i18n/dict";
import { DueBadge, StageBadge } from "@/components/badges";
import { Card, Field } from "@/components/ui";
import { StagePanel } from "./panels";
import { Timeline } from "./timeline";
import { DocumentList } from "./documents";

export default async function ApplicationPage({ params }: PageProps<"/applications/[id]">) {
  const user = await requireUser();
  const { lang, t } = await getDict();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const detail = await getApplicationDetail(id, user);
  if (!detail) notFound();
  const { app, docs, history } = detail;

  const canAct = canActOnStage(user.role, app.stage);
  const owner = STAGE_OWNER[app.stage];
  const active = app.stage === "scrutiny" || app.stage === "field_enquiry" || app.stage === "decision";

  return (
    <div className="space-y-4">
      <Link href="/dashboard" className="no-print inline-block text-sm text-brand hover:underline">
        {t.app.back}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{applicantName(app, lang)}</h1>
          <p className="text-sm text-muted tabular-nums">
            {t.app.applicationNo}: {app.appNo} · {t.purposes[app.purpose as Purpose]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StageBadge stage={app.stage} t={t} />
          {active && <DueBadge daysLeft={app.priority.daysLeft} t={t} />}
          {active &&
            (canAct ? (
              <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white">{t.app.yourTurn}</span>
            ) : (
              owner && (
                <span className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-muted">
                  {t.app.waitingFor(t.roles[owner])}
                </span>
              )
            ))}
        </div>
      </header>

      <Stepper stage={app.stage} t={t} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <StagePanel app={app} canAct={canAct} aiAvailable={aiEnabled()} />

          <Card className="p-4">
            <h2 className="mb-3 font-semibold">{t.app.applicant}</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Field label={t.app.applicant}>
                {app.applicantNameTe}
                <span className="block text-xs font-normal text-muted">{app.applicantNameEn}</span>
              </Field>
              <Field label={t.app.relation}>{app.relationNameTe}</Field>
              <Field label={`${t.app.age} · ${t.app.gender}`}>
                {app.age} · {t.app.genders[app.gender] ?? app.gender}
              </Field>
              <Field label={t.app.occupation}>{app.occupation}</Field>
              <Field label={t.app.declaredIncome}>{rupees(app.declaredIncome)}</Field>
              <Field label={t.app.aadhaar}>XXXX XXXX {app.aadhaarLast4}</Field>
              <Field label={t.app.village}>
                {place(app.village, lang)}, {place(app.mandal, lang)}
              </Field>
              <Field label={t.app.address}>{app.address}</Field>
              <Field label={t.app.phone}>
                <a href={`tel:${app.phone}`} className="text-brand underline-offset-2 hover:underline">
                  {app.phone}
                </a>
              </Field>
              <Field label={t.app.submitted}>{formatDate(app.submittedAt, lang)}</Field>
              <Field label={t.app.dueBy}>{formatDate(app.dueAt, lang)}</Field>
              {app.purposeDeadline && (
                <Field label={t.app.purposeDeadline}>{formatDate(app.purposeDeadline, lang)}</Field>
              )}
            </dl>
          </Card>

          <DocumentList docs={docs} />
        </div>

        <aside>
          <Card className="p-4 lg:sticky lg:top-20">
            <h2 className="mb-3 font-semibold">{t.app.history}</h2>
            <Timeline events={history} />
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Stepper({ stage, t }: { stage: Stage; t: Dict }) {
  const current = stepIndex(stage);
  const closed = isClosed(stage);
  const steps = ["scrutiny", "field_enquiry", "decision"] as const;
  return (
    <ol className="grid grid-cols-3 gap-1.5" aria-label="workflow">
      {steps.map((s, i) => {
        const done = i < current;
        const now = i === current && !closed;
        return (
          <li
            key={s}
            aria-current={now ? "step" : undefined}
            className={`rounded-xl border px-2 py-2 text-center ${
              now
                ? "border-brand bg-brand text-white"
                : done
                  ? "border-brand-soft bg-brand-soft text-brand"
                  : "border-line bg-card text-muted"
            }`}
          >
            <div className="text-[11px] opacity-80">
              {done ? "✓ " : ""}
              {t.stepLabel(i + 1)}
            </div>
            <div className="text-sm font-semibold leading-tight">{t.stages[s]}</div>
          </li>
        );
      })}
    </ol>
  );
}
