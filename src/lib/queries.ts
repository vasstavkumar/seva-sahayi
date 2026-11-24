import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { applications, documents, events, users, type Application } from "@/db/schema";
import { computePriority, type Priority } from "./priority";
import { computeImpact } from "./metrics";
import { canView, type Jurisdiction } from "./jurisdiction";

export type RankedApplication = Application & { priority: Priority; flagCount: number };

export function flagCount(app: Application): number {
  const ai = app.scrutiny.ai;
  return ai ? ai.flags.length + ai.missingDocuments.length : 0;
}

export function rank(app: Application, now = new Date()): RankedApplication {
  const flags = flagCount(app);
  return {
    ...app,
    flagCount: flags,
    priority: computePriority(
      {
        stage: app.stage,
        dueAt: app.dueAt,
        purposeDeadline: app.purposeDeadline,
        flagCount: flags,
        returnCount: app.returnCount,
      },
      now,
    ),
  };
}

// keep in sync with canView()
function inJurisdiction(user: Jurisdiction): SQL {
  const mandal = eq(applications.mandal, user.mandal);
  return user.villages === null ? mandal : and(mandal, inArray(applications.village, user.villages))!;
}

export async function findVisibleApplication(id: number, user: Jurisdiction): Promise<Application | undefined> {
  const app = await db.query.applications.findFirst({ where: eq(applications.id, id) });
  return app && canView(user, app) ? app : undefined;
}

// open + closed in last 14 days
export async function listWorkload(user: Jurisdiction): Promise<RankedApplication[]> {
  const since = new Date(Date.now() - 14 * 86_400_000);
  const rows = await db
    .select()
    .from(applications)
    .where(
      and(
        inJurisdiction(user),
        or(
          inArray(applications.stage, ["scrutiny", "field_enquiry", "decision", "returned"]),
          gte(applications.closedAt, since),
        ),
      ),
    )
    .orderBy(asc(applications.dueAt));
  const now = new Date();
  return rows.map((r) => rank(r, now));
}

export async function getApplicationDetail(id: number, user: Jurisdiction) {
  const app = await findVisibleApplication(id, user);
  if (!app) return null;
  const [docs, history] = await Promise.all([
    db
      .select({
        id: documents.id,
        kind: documents.kind,
        fileName: documents.fileName,
        mimeType: documents.mimeType,
        size: documents.size,
      })
      .from(documents)
      .where(eq(documents.applicationId, id))
      .orderBy(asc(documents.id)),
    db
      .select({ event: events, actorNameEn: users.nameEn })
      .from(events)
      .leftJoin(users, eq(users.id, events.actorId))
      .where(eq(events.applicationId, id))
      .orderBy(desc(events.createdAt), desc(events.id)),
  ]);
  return { app: rank(app), docs, history };
}

export type DocumentMeta = { id: number; kind: string; fileName: string; mimeType: string; size: number };

export async function loadImpact(user: Jurisdiction) {
  const since = new Date(Date.now() - 60 * 86_400_000);
  const closed = await db
    .select({
      id: applications.id,
      submittedAt: applications.submittedAt,
      closedAt: applications.closedAt,
      dueAt: applications.dueAt,
      returnCount: applications.returnCount,
    })
    .from(applications)
    .where(and(inJurisdiction(user), isNotNull(applications.closedAt), gte(applications.closedAt, since)));
  const ids = closed.map((c) => c.id);
  const history = ids.length ? await db.select().from(events).where(inArray(events.applicationId, ids)) : [];
  const pending = await db.$count(
    applications,
    and(inJurisdiction(user), inArray(applications.stage, ["scrutiny", "field_enquiry", "decision"])),
  );
  const metrics = computeImpact(
    closed.map((c) => ({ ...c, closedAt: c.closedAt! })),
    history,
  );
  return { metrics, pending };
}
