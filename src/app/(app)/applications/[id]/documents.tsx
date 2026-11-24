import { getDict } from "@/lib/i18n/server";
import type { DocumentMeta } from "@/lib/queries";
import type { DocKind } from "@/lib/types";
import { Card } from "@/components/ui";

export async function DocumentList({ docs }: { docs: DocumentMeta[] }) {
  const { t } = await getDict();
  return (
    <Card className="p-4">
      <h2 className="mb-3 font-semibold">
        {t.app.documents} <span className="text-sm font-normal text-muted">({docs.length})</span>
      </h2>
      {docs.length === 0 ? (
        <p className="text-sm text-muted">{t.app.noDocuments}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {docs.map((d) => (
            <li key={d.id}>
              <a
                href={`/api/documents/${d.id}`}
                target="_blank"
                rel="noreferrer"
                className="group block overflow-hidden rounded-xl border border-line hover:border-brand"
              >
                <div className="grid aspect-[4/3] place-items-center overflow-hidden bg-page">
                  {d.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element -- auth-protected bytes from our own route
                    <img
                      src={`/api/documents/${d.id}`}
                      alt={t.docKinds[d.kind as DocKind] ?? d.kind}
                      loading="lazy"
                      className="size-full object-cover object-top transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-muted">PDF</span>
                  )}
                </div>
                <div className="px-2 py-1.5 text-xs font-medium">{t.docKinds[d.kind as DocKind] ?? d.kind}</div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
