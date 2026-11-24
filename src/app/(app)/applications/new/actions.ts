"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { applications, documents } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { safeFileName, sniffMime, type AllowedMime } from "@/lib/files";
import { canView } from "@/lib/jurisdiction";
import { DEMO_VILLAGES } from "@/lib/places";
import { DOC_KINDS, PURPOSES } from "@/lib/types";
import { SLA_DAYS } from "@/lib/workflow";

const MAX_FILE = 4 * 1024 * 1024;
const DISTRICT = "రంగారెడ్డి";

const name = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[\p{L}\p{M}\u200C\u200D\s.'-]+$/u); // ZWNJ/ZWJ appear in Telugu spellings
const freeText = (max: number) =>
  z
    .string()
    .trim()
    .min(2)
    .max(max)
    .regex(/^[^<>\p{Cc}]+$/u);

const formSchema = z.object({
  applicantNameTe: name,
  applicantNameEn: name,
  relationNameTe: name,
  gender: z.enum(["M", "F", "O"]),
  age: z.coerce.number().int().min(1).max(120),
  aadhaarLast4: z.string().regex(/^\d{4}$/),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  village: z.enum(DEMO_VILLAGES as [string, ...string[]]),
  address: freeText(200),
  occupation: freeText(100),
  declaredIncome: z.coerce.number().int().min(0).max(100_000_000),
  purpose: z.enum(PURPOSES),
  purposeDeadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export async function createApplication(_prev: { error?: string } | undefined, form: FormData) {
  const user = await requireUser();
  const parsed = formSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "required" };
  const v = parsed.data;
  const mandal = user.mandal;
  if (!canView(user, { mandal, village: v.village })) return { error: "required" };

  const files: { kind: string; mime: AllowedMime; data: Buffer }[] = [];
  for (const kind of DOC_KINDS) {
    const f = form.get(`doc_${kind}`);
    if (f instanceof File && f.size > 0) {
      if (f.size > MAX_FILE) return { error: "fileTooLarge" };
      const data = Buffer.from(await f.arrayBuffer());
      const mime = sniffMime(data);
      if (!mime) return { error: "fileType" };
      files.push({ kind, mime, data });
    }
  }

  const now = new Date();
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(applications)
      .values({
        ...v,
        purposeDeadline: v.purposeDeadline ?? null,
        appNo: `tmp-${crypto.randomUUID()}`,
        mandal,
        district: DISTRICT,
        submittedAt: now,
        dueAt: new Date(now.getTime() + SLA_DAYS * 86_400_000),
      })
      .returning({ id: applications.id });
    await tx
      .update(applications)
      .set({ appNo: `MS-INC-${now.getFullYear()}-${String(row.id).padStart(6, "0")}` })
      .where(eq(applications.id, row.id));

    for (const { kind, mime, data } of files) {
      await tx.insert(documents).values({
        applicationId: row.id,
        kind,
        fileName: safeFileName(kind, mime),
        mimeType: mime, // what the bytes actually are, not what the browser claimed
        size: data.length,
        data,
      });
    }
    await logEvent(tx, { applicationId: row.id, actor: "citizen", kind: "submitted", stage: "scrutiny" });
    return row.id;
  });

  redirect(`/applications/${id}`);
}
