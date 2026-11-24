import Link from "next/link";
import { getDict } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getDict();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-line bg-card p-6 text-center">
        <p className="text-lg font-semibold">{t.notFound}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-brand hover:underline">
          {t.app.back}
        </Link>
      </div>
    </div>
  );
}
