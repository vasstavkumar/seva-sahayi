"use client";

import { useActionState } from "react";
import { login } from "../actions";
import { useI18n } from "@/lib/i18n/client";
import { Button, inputClass } from "@/components/ui";

export function LoginForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink-2">{t.login.username}</span>
        <input name="username" autoComplete="username" autoCapitalize="none" required className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink-2">{t.login.password}</span>
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </label>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical">
          {state.error === "locked" ? t.login.locked : t.login.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.saving : t.login.submit}
      </Button>
    </form>
  );
}
