import { requireUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { loadImpact } from "@/lib/queries";
import { SLA_DAYS } from "@/lib/workflow";
import { Card } from "@/components/ui";

export default async function ImpactPage() {
  const user = await requireUser();
  const { lang, t } = await getDict();
  const { metrics: m, pending } = await loadImpact(user);
  const fmt = (n: number, digits = 1) => n.toLocaleString(lang === "te" ? "te-IN" : "en-IN", { maximumFractionDigits: digits });
  const maxStage = Math.max(SLA_DAYS / 2, ...Object.values(m.avgStageDays));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">{t.impact.title}</h1>
        <p className="text-sm text-muted">{t.impact.intro}</p>
        <p className="mt-1 text-xs text-muted">{t.impact.basis(m.closed)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Tile label={t.impact.avgTurnaround} value={t.impact.days(fmt(m.avgTurnaroundDays))} sub={`SLA ${SLA_DAYS}`} />
        <Tile label={t.impact.withinSla} value={`${fmt(m.withinSlaPct, 0)}%`} />
        <Tile label={t.impact.returnRate} value={`${fmt(m.returnRatePct, 0)}%`} />
        <Tile label={t.impact.closed} value={fmt(m.closed, 0)} />
        <Tile label={t.impact.pending} value={fmt(pending, 0)} />
        <Tile
          label={t.impact.aiAgreement}
          value={m.aiAgreementPct === null ? "—" : `${fmt(m.aiAgreementPct, 0)}%`}
          sub={`${t.impact.overrides}: ${m.overrides}/${m.aiDecisions}`}
        />
      </div>

      <Card className="p-4">
        <h2 className="mb-4 font-semibold">{t.impact.stageTime}</h2>
        <ul className="space-y-3">
          {(["scrutiny", "field_enquiry", "decision"] as const).map((s) => {
            const v = m.avgStageDays[s];
            return (
              <li key={s} className="grid grid-cols-[120px_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[160px_1fr_auto]">
                <span className="text-ink-2">{t.stages[s]}</span>
                <span className="h-3 rounded-full bg-brand-soft" title={`${t.stages[s]}: ${t.impact.days(fmt(v))}`}>
                  <span
                    className="block h-3 rounded-full bg-brand"
                    style={{ width: `${Math.max(2, (v / maxStage) * 100)}%` }}
                  />
                </span>
                <span className="w-20 text-right font-semibold tabular-nums">{t.impact.days(fmt(v))}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <p className="rounded-2xl border border-dashed border-line bg-card p-4 text-sm text-ink-2">{t.impact.note}</p>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
