import { dictionaries } from "./i18n/dict";
import { DOC_KINDS, type DocKind, type Lang, type ScrutinyAi } from "./types";

// Exact spelling check on names. flash-lite read "Fatima" vs "Fathima"
// correctly but still said "match", so don't leave this to the model.
// Latin only - Telugu OCR output varies too much and gives noisy flags.
const LATIN = /^[\p{Script=Latin}\s.'-]+$/u;
const normalise = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}]/gu, "");

export type NameDifference = { document: string; printed: string; onForm: string };

export function nameDifferences(applicantNameEn: string, extracted: ScrutinyAi["extracted"]): NameDifference[] {
  const onForm = normalise(applicantNameEn);
  const seen = new Set<string>();
  const out: NameDifference[] = [];
  for (const e of extracted) {
    const printed = e.name.trim();
    if (!printed || !LATIN.test(printed)) continue;
    const key = normalise(printed);
    if (!key || key === onForm || seen.has(key)) continue;
    seen.add(key);
    out.push({ document: e.document, printed, onForm: applicantNameEn });
  }
  return out;
}

// model returns "ration_card", "Ration card" or the file name
function docLabel(document: string, lang: Lang): string {
  const d = document.toLowerCase();
  const kind = DOC_KINDS.find((k): k is DocKind => k !== "other" && d.includes(k.split("_")[0]));
  return kind ? dictionaries[lang].docKinds[kind] : document;
}

export function withNameChecks(ai: ScrutinyAi, applicantNameEn: string, lang: Lang): ScrutinyAi {
  const diffs = nameDifferences(applicantNameEn, ai.extracted);
  if (diffs.length === 0) return ai;

  const flags = diffs.map(({ document, printed, onForm }) =>
    lang === "te"
      ? `పేరు స్పెల్లింగ్ తేడా: ${docLabel(document, lang)}లో "${printed}", దరఖాస్తులో "${onForm}". ఒకే వ్యక్తేనా అని సరిచూడండి.`
      : `Name spelled differently: "${printed}" on the ${docLabel(document, lang)}, "${onForm}" on the form. Check it is the same person.`,
  );
  const note =
    lang === "te"
      ? "పత్రాల్లో పేరు స్పెల్లింగ్ వేరుగా ఉంది (నియమ ఆధారిత తనిఖీ)."
      : "The name is spelled differently on a document (rule-based check).";

  const isApplicantName = (field: string) =>
    /name|పేరు/i.test(field) && !/father|husband|relation|తండ్రి|భర్త/i.test(field);
  let touched = false;
  const checks = ai.checks.map((c) => {
    if (!isApplicantName(c.field) || c.status !== "match") return c;
    touched = true;
    return { ...c, status: "unclear" as const, note };
  });
  if (!touched && !ai.checks.some((c) => isApplicantName(c.field) && c.status !== "match")) {
    checks.unshift({ field: lang === "te" ? "పేరు" : "name", status: "unclear", note });
  }

  return { ...ai, checks, flags: [...flags, ...ai.flags] };
}
