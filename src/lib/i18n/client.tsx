"use client";

import { createContext, useContext } from "react";
import type { Lang } from "../types";
import { dictionaries, type Dict } from "./dict";

const I18nContext = createContext<{ lang: Lang; t: Dict }>({ lang: "te", t: dictionaries.te });

// dict has functions, so only pass lang across and look it up here
export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <I18nContext.Provider value={{ lang, t: dictionaries[lang] }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
