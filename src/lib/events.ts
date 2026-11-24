import "server-only";
import type { User } from "@/db/schema";
import { events } from "@/db/schema";
import type { db } from "@/db";
import type { EventDetails, EventKind, Stage } from "./types";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

export async function logEvent(
  tx: Tx,
  e: {
    applicationId: number;
    actor: User | "ai" | "citizen";
    kind: EventKind;
    stage: Stage;
    details?: EventDetails;
  },
) {
  const actor =
    e.actor === "ai"
      ? { actorId: null, actorName: "Gemini", actorRole: "ai" }
      : e.actor === "citizen"
        ? { actorId: null, actorName: "citizen", actorRole: "citizen" }
        : { actorId: e.actor.id, actorName: e.actor.nameTe, actorRole: e.actor.role };
  await tx.insert(events).values({
    applicationId: e.applicationId,
    kind: e.kind,
    stage: e.stage,
    details: e.details ?? {},
    ...actor,
  });
}
