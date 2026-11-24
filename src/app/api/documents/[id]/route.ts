import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, documents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { canView } from "@/lib/jurisdiction";

export async function GET(_req: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Not found", { status: 404 });

  const [row] = await db
    .select({ doc: documents, mandal: applications.mandal, village: applications.village })
    .from(documents)
    .innerJoin(applications, eq(applications.id, documents.applicationId))
    .where(eq(documents.id, id))
    .limit(1);
  // 404 for both missing and out-of-jurisdiction
  if (!row || !canView(user, row)) return new Response("Not found", { status: 404 });

  const { doc } = row;
  const isImage = doc.mimeType.startsWith("image/");
  return new Response(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/[^\w.-]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": isImage
        ? "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"
        : // A stricter policy would also block the browser's own PDF viewer.
          "frame-ancestors 'self'",
    },
  });
}
