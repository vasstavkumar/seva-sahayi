"use client";

import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-card p-6 text-center">
      <p className="text-lg font-semibold">{t.errors.generic}</p>
      {error.digest && <p className="mt-1 font-mono text-xs text-muted">ref: {error.digest}</p>}
      <Button className="mt-4" onClick={reset}>
        {t.retry}
      </Button>
    </div>
  );
}
