import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { listWorkload, type RankedApplication } from "@/lib/queries";
import { canActOnStage, isClosed } from "@/lib/workflow";
import { applicantName, formatDate, rupees } from "@/lib/format";
import { place } from "@/lib/places";
import type { Dict } from "@/lib/i18n/dict";
import type { Lang, Purpose, Role } from "@/lib/types";
import { AiFlagBadge, DueBadge, StageBadge } from "@/components/badges";

const VIEWS = ["mine", "all", "scrutiny", "field_enquiry", "decision", "returned", "closed"] as const;
type View = (typeof VIEWS)[number];

const isActive = (a: RankedApplication) =>
  a.stage === "scrutiny" || a.stage === "field_enquiry" || a.stage === "decision";

function filterView(apps: RankedApplication[], view: View, role: Role) {
  switch (view) {
    case "mine":
      return apps.filter((a) => isActive(a) && canActOnStage(role, a.stage));
    case "all":
      return apps.filter(isActive);
    case "closed":
      return apps.filter((a) => isClosed(a.stage));
    default:
      return apps.filter((a) => a.stage === view);
  }
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  const { lang, t } = await getDict();
  const sp = await searchParams;
  const view: View = VIEWS.includes(sp.view as View) ? (sp.view as View) : "mine";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";

  const all = await listWorkload(user);
  const active = all.filter(isActive);
  const mine = active.filter((a) => canActOnStage(user.role, a.stage));

  let list = filterView(all, view, user.role);
  if (q) {
    list = list.filter((a) =>
      [a.applicantNameTe, a.applicantNameEn, a.appNo, a.village, place(a.village, "en")]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  list =
    view === "closed"
      ? list.sort((a, b) => (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0))
      : list.sort((a, b) => b.priority.score - a.priority.score);

  const count = (s: string) => all.filter((a) => a.stage === s).length;
  const overdue = mine.filter((a) => a.priority.daysLeft < 0).length;
  const dueSoon = mine.filter((a) => a.priority.daysLeft >= 0 && a.priority.daysLeft <= 1).length;

  const tabs: { view: View; label: string; n: number }[] = [
    { view: "mine", label: t.dashboard.attention, n: mine.length },
    { view: "all", label: t.dashboard.allPending, n: active.length },
    { view: "scrutiny", label: t.stageShort.scrutiny, n: count("scrutiny") },
    { view: "field_enquiry", label: t.stageShort.field_enquiry, n: count("field_enquiry") },
    { view: "decision", label: t.stageShort.decision, n: count("decision") },
    { view: "returned", label: t.dashboard.waitingCitizen, n: count("returned") },
    { view: "closed", label: t.dashboard.closedRecently, n: all.filter((a) => isClosed(a.stage)).length },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">{t.dashboard.greeting(lang === "te" ? user.nameTe : user.nameEn)}</h1>
        <p className="text-sm text-muted">{t.officeName}</p>
      </div>

      {/* Headline numbers: what is waiting on this officer, and how urgent */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label={t.dashboard.myQueue} value={mine.length} href="/dashboard?view=mine" />
        <StatTile label={t.dashboard.overdue} value={overdue} tone="critical" href="/dashboard?view=mine" />
        <StatTile label={t.dashboard.dueToday} value={dueSoon} tone="warning" href="/dashboard?view=mine" />
      </div>

      {/* Pipeline: where the mandal's applications are sitting */}
      <div className="flex items-stretch overflow-x-auto rounded-2xl border border-line bg-card text-center">
        {(["scrutiny", "field_enquiry", "decision"] as const).map((s, i) => (
          <Link
            key={s}
            href={`/dashboard?view=${s}`}
            className={`flex-1 px-3 py-3 hover:bg-page ${i > 0 ? "border-l border-line" : ""}`}
          >
            <div className="text-xs text-muted">{t.stepLabel(i + 1)}</div>
            <div className="text-sm font-semibold">{t.stages[s]}</div>
            <div className="text-2xl font-semibold tabular-nums">{count(s)}</div>
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {tabs.map((tab) => (
            <Link
              key={tab.view}
              href={`/dashboard?view=${tab.view}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${
                view === tab.view
                  ? "border-brand bg-brand font-semibold text-white"
                  : "border-line bg-card text-ink-2 hover:bg-page"
              }`}
            >
              {tab.label} <span className="tabular-nums opacity-80">{tab.n}</span>
            </Link>
          ))}
        </div>

        <form className="flex gap-2" action="/dashboard">
          <input type="hidden" name="view" value={view} />
          <input
            name="q"
            defaultValue={q}
            placeholder={t.dashboard.search}
            className="min-h-11 w-full rounded-xl border border-line bg-card px-3 text-[15px] outline-none focus:border-brand"
          />
        </form>

        {view === "mine" && <p className="text-xs text-muted">{t.dashboard.attentionHint}</p>}

        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-muted">
            {t.dashboard.empty}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {list.map((a) => (
              <li key={a.id}>
                <ApplicationRow app={a} t={t} lang={lang} actionable={canActOnStage(user.role, a.stage)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone?: "critical" | "warning";
  href: string;
}) {
  const accent =
    tone === "critical" && value > 0
      ? "border-l-critical"
      : tone === "warning" && value > 0
        ? "border-l-warning"
        : "border-l-brand";
  return (
    <Link href={href} className={`rounded-2xl border border-l-4 border-line bg-card px-3 py-3 hover:bg-page ${accent}`}>
      <div className="text-xs leading-snug text-muted">{label}</div>
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
    </Link>
  );
}

function ApplicationRow({
  app,
  t,
  lang,
  actionable,
}: {
  app: RankedApplication;
  t: Dict;
  lang: Lang;
  actionable: boolean;
}) {
  const closed = isClosed(app.stage);
  const active = !closed && app.stage !== "returned";
  const stripe =
    active && app.priority.daysLeft < 0
      ? "before:bg-critical"
      : active && app.priority.daysLeft <= 2
        ? "before:bg-warning"
        : "before:bg-transparent";
  const pd = app.priority.purposeDaysLeft;

  return (
    <Link
      href={`/applications/${app.id}`}
      className={`relative block overflow-hidden rounded-2xl border border-line bg-card p-4 pl-5 transition-shadow before:absolute before:inset-y-0 before:left-0 before:w-1.5 hover:shadow-md ${stripe}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <div className="text-[17px] font-semibold">{applicantName(app, lang)}</div>
          <div className="text-sm text-muted">
            {place(app.village, lang)} · {t.purposes[app.purpose as Purpose]} · {rupees(app.declaredIncome)}
          </div>
        </div>
        <StageBadge stage={app.stage} t={t} />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {active && <DueBadge daysLeft={app.priority.daysLeft} t={t} />}
        {active && pd !== null && pd >= 0 && pd <= 7 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-[#6b4a00]">
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
              <rect x="2" y="3" width="12" height="11" rx="2" />
              <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
            </svg>
            {t.purposeDeadline(pd)}
          </span>
        )}
        {active && <AiFlagBadge count={app.flagCount} t={t} />}
        {app.returnCount > 0 && !closed && (
          <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2">
            {t.app.returnCount(app.returnCount)}
          </span>
        )}
        {active && !actionable && (
          <span className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-muted">
            {t.dashboard.notYours}
          </span>
        )}
        <span className="ml-auto text-xs text-muted tabular-nums">
          {app.appNo}
          {closed && app.closedAt ? ` · ${formatDate(app.closedAt, lang)}` : ""}
        </span>
      </div>
    </Link>
  );
}
