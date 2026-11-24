import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import { findVisibleApplication } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { formatDate, rupees } from "@/lib/format";
import { place } from "@/lib/places";
import { PrintButton } from "./print-button";

export default async function CertificatePage({ params }: PageProps<"/certificate/[id]">) {
  const user = await requireUser();
  const { lang, t } = await getDict();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const app = await findVisibleApplication(id, user);
  if (!app || app.stage !== "approved" || !app.decision.certifiedIncome) notFound();
  // signer = whoever approved it
  const [approval] = await db
    .select({ nameTe: users.nameTe, nameEn: users.nameEn, role: users.role })
    .from(events)
    .innerJoin(users, eq(users.id, events.actorId))
    .where(and(eq(events.applicationId, app.id), eq(events.kind, "approved")))
    .orderBy(desc(events.createdAt))
    .limit(1);
  const tahsildar = approval;
  const name = lang === "te" ? app.applicantNameTe : app.applicantNameEn;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href={`/applications/${app.id}`} className="text-sm text-brand hover:underline">
          ← {app.appNo}
        </Link>
        <PrintButton label={t.certificate.print} />
      </div>

      <article className="relative overflow-hidden rounded-lg border-4 border-double border-brand bg-white p-8 sm:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center text-6xl font-black tracking-widest text-critical/10 [transform:rotate(-24deg)]"
        >
          {t.certificate.demoWatermark}
        </div>

        <header className="text-center">
          <p className="text-sm font-semibold text-ink-2">{t.certificate.govt}</p>
          <p className="text-sm text-muted">{t.officeName}</p>
          <h1 className="mt-4 text-3xl font-bold text-brand">{t.certificate.title}</h1>
        </header>

        <div className="mt-6 flex justify-between text-sm">
          <span>
            {t.certificate.certNo}: <strong className="tabular-nums">{app.decision.certificateNo}</strong>
          </span>
          <span>{formatDate(app.decision.decidedAt ?? app.closedAt ?? new Date(), lang)}</span>
        </div>

        <p className="mt-6 text-lg leading-loose">
          {t.certificate.body(
            name,
            app.relationNameTe,
            place(app.village, lang),
            place(app.mandal, lang),
            place(app.district, lang),
          )}
        </p>

        <div className="my-8 rounded-xl border border-line bg-page px-6 py-5 text-center">
          <div className="text-sm text-muted">{t.certificate.annualIncome}</div>
          <div className="text-4xl font-bold tabular-nums">{rupees(app.decision.certifiedIncome)}/-</div>
        </div>

        <p className="text-sm text-ink-2">
          {t.app.purpose}: {t.purposes[app.purpose as keyof typeof t.purposes]} · {t.app.applicationNo}: {app.appNo}
        </p>
        <p className="mt-1 text-sm text-ink-2">{t.certificate.validity}</p>

        <footer className="mt-12 text-right">
          <div className="font-semibold">{tahsildar ? (lang === "te" ? tahsildar.nameTe : tahsildar.nameEn) : ""}</div>
          <div className="text-sm text-muted">
            {tahsildar ? t.roles[tahsildar.role] : t.certificate.signedBy}, {place(app.mandal, lang)}
          </div>
        </footer>
      </article>
    </main>
  );
}
