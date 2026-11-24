import type { Lang } from "./types";

const TZ = "Asia/Kolkata";
const locale = (lang: Lang) => (lang === "te" ? "te-IN" : "en-IN");

// en-IN grouping: ₹1,20,000
export function rupees(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function formatDate(d: Date | string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

export function formatDateTime(d: Date | string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));
}

export function applicantName(app: { applicantNameTe: string; applicantNameEn: string }, lang: Lang) {
  return lang === "te" ? app.applicantNameTe : app.applicantNameEn;
}
