import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { logout } from "../actions";
import { LanguageToggle } from "@/components/language-toggle";
import { NavLinks } from "@/components/nav-links";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const { lang, t } = await getDict();

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-brand text-base font-bold text-white">స</span>
            <span className="whitespace-nowrap leading-tight">
              <span className="block font-bold text-brand">{t.appName}</span>
              <span className="hidden text-xs text-muted lg:block">{t.appTagline}</span>
            </span>
          </Link>
          <NavLinks className="ml-4 hidden gap-1 sm:flex" />
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden whitespace-nowrap text-right leading-tight lg:block">
              <div className="text-sm font-semibold">{lang === "te" ? user.nameTe : user.nameEn}</div>
              <div className="text-xs text-muted">{t.roles[user.role]}</div>
            </div>
            <LanguageToggle />
            <form action={logout}>
              <button className="min-h-10 whitespace-nowrap rounded-full px-3 text-sm text-muted hover:bg-page">{t.nav.logout}</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>

      {/* Bottom tab bar on phones: thumbs, not mouse pointers */}
      <NavLinks
        mobile
        className="no-print fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-card sm:hidden"
      />
    </div>
  );
}
