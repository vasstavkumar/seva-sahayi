"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLanguage } from "@/app/actions";
import { useI18n } from "@/lib/i18n/client";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setLanguage(lang === "te" ? "en" : "te");
          router.refresh();
        })
      }
      className={`min-h-10 rounded-full border border-line bg-card px-3 text-sm font-medium text-ink-2 hover:bg-page disabled:opacity-50 ${className}`}
      aria-label={lang === "te" ? "Switch to English" : "తెలుగుకు మారండి"}
    >
      {t.langToggle}
    </button>
  );
}
