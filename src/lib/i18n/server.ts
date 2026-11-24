import "server-only";
import { cookies } from "next/headers";
import type { Lang } from "../types";
import { dictionaries } from "./dict";

export const LANG_COOKIE = "lang";

export async function getLang(): Promise<Lang> {
  const jar = await cookies();
  return jar.get(LANG_COOKIE)?.value === "en" ? "en" : "te";
}

export async function getDict() {
  const lang = await getLang();
  return { lang, t: dictionaries[lang] };
}
