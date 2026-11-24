import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { LanguageToggle } from "@/components/language-toggle";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const { t } = await getDict();
  const showDemoLogins = process.env.DEMO_MODE !== "false";
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-brand text-lg font-bold text-white">స</span>
              <h1 className="text-2xl font-bold text-brand">{t.appName}</h1>
            </div>
            <p className="mt-1 text-sm text-muted">{t.appTagline}</p>
          </div>
          <LanguageToggle />
        </div>

        <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">{t.login.title}</h2>
          <LoginForm />
        </div>

        {showDemoLogins && (
          <div className="mt-4 rounded-xl border border-dashed border-line bg-card/60 p-4 text-sm text-ink-2">
            <p className="mb-2 font-medium">{t.login.demoHint}</p>
            <ul className="space-y-1 font-mono text-[13px]">
              <li>demo / Demo@2026 <span className="font-sans text-muted">— {t.roles.demo}</span></li>
              <li>gpo / Gpo@2026 <span className="font-sans text-muted">— {t.roles.field_officer} 1</span></li>
              <li>gpo2 / Gpo2@2026 <span className="font-sans text-muted">— {t.roles.field_officer} 2</span></li>
              <li>tahsildar / Tahsildar@2026 <span className="font-sans text-muted">— {t.roles.tahsildar}</span></li>
            </ul>
          </div>
        )}
        <p className="mt-6 text-center text-xs text-muted">{t.officeName}</p>
      </div>
    </main>
  );
}
