import type { EventRow } from "@/db/schema";
import { getDict } from "@/lib/i18n/server";
import { formatDateTime, rupees } from "@/lib/format";
import type { Role, Stage } from "@/lib/types";

export async function Timeline({ events }: { events: { event: EventRow; actorNameEn: string | null }[] }) {
  const { lang, t } = await getDict();

  const outcomeLabel = (rec: string) =>
    ({
      verify: t.scrutiny.recVerify,
      return: t.decision.outcome.return,
      approve: t.decision.outcome.approve,
      reject: t.decision.outcome.reject,
    })[rec] ?? rec;

  return (
    <ol className="relative space-y-4 border-l-2 border-line pl-4">
      {events.map(({ event: e, actorNameEn }) => {
        const isAi = e.actorRole === "ai";
        const d = e.details;
        const who = isAi
          ? t.eventMeta.ai
          : e.actorRole === "citizen"
            ? t.eventMeta.citizen
            : `${lang === "en" && actorNameEn ? actorNameEn : e.actorName} · ${t.roles[e.actorRole as Role] ?? e.actorRole}`;
        const dot =
          e.kind === "approved"
            ? "bg-good"
            : e.kind === "rejected"
              ? "bg-critical"
              : isAi
                ? "bg-ai"
                : e.kind === "returned" || e.kind === "sent_back"
                  ? "bg-warning"
                  : "bg-brand";

        return (
          <li key={e.id} className="relative">
            <span className={`absolute -left-[23px] top-1.5 size-3 rounded-full ring-4 ring-card ${dot}`} aria-hidden />
            <div className={`text-sm font-medium ${isAi ? "text-ai" : ""}`}>
              {isAi && <span aria-hidden>✦ </span>}
              {t.events[e.kind]}
            </div>
            <div className="text-xs text-muted">
              {who} · {formatDateTime(e.createdAt, lang)} · {t.stageShort[e.stage as Stage] ?? e.stage}
            </div>
            <div className="mt-1 space-y-0.5 text-xs text-ink-2">
              {isAi && d.flags !== undefined && d.flags > 0 && <p>{t.eventMeta.flags(d.flags)}</p>}
              {isAi && d.aiRecommendation && <p>{t.eventMeta.aiSaid(outcomeLabel(d.aiRecommendation))}</p>}
              {d.estimatedIncome !== undefined && <p>{t.eventMeta.income(rupees(d.estimatedIncome))}</p>}
              {!isAi && d.certifiedIncome !== undefined && <p>{t.eventMeta.income(rupees(d.certifiedIncome))}</p>}
              {d.remarks && <p className="rounded-lg bg-page px-2 py-1 text-ink">“{d.remarks}”</p>}
              {!isAi && d.followedAi !== undefined && (
                <p className={d.followedAi ? "text-good-text" : "font-medium text-ink"}>
                  {d.followedAi ? `✓ ${t.eventMeta.followed}` : `↺ ${t.eventMeta.overrode}`}
                  {d.aiRecommendation ? ` (${outcomeLabel(d.aiRecommendation)})` : ""}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
