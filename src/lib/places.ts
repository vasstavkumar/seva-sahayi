import type { Lang } from "./types";

// places are stored in Telugu; this is just for the English UI
const EN: Record<string, string> = {
  "రంగారెడ్డి": "Ranga Reddy",
  "చేవెళ్ల": "Chevella",
  "ఆలూరు": "Alur",
  "కందవాడ": "Kandawada",
  "ముడిమ్యాల": "Mudimyal",
  "దేవుని ఎర్రవల్లి": "Devuni Erravalli",
  "గొల్లపల్లి": "Gollapalli",
  "ఇబ్రహీంపల్లి": "Ibrahimpalli",
  "దామరగిద్ద": "Damaragidda",
};

export function place(name: string, lang: Lang): string {
  return lang === "en" ? (EN[name] ?? name) : name;
}

export const DEMO_VILLAGES = Object.keys(EN).slice(2);
