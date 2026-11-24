/**
 * Demo data: officers, ~13 hand-written applications across all stages
 * (some with planted document problems) and ~24 closed ones for the Impact page.
 * Everything is fictional. AI output on later-stage apps is hand-written.
 *
 *   npm run db:reset      # migrate + seed (wipes data)
 */
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { applications, documents, events, users, type User } from "../src/db/schema";
import type {
  DecisionData,
  EnquiryData,
  EventDetails,
  EventKind,
  Purpose,
  ScrutinyData,
  Stage,
} from "../src/lib/types";
import { SLA_DAYS } from "../src/lib/workflow";

const DAY = 86_400_000;
const NOW = Date.now();
const at = (daysAgo: number, hour = 11) => {
  // IST wall-clock hour on the given day
  const d = new Date(NOW - daysAgo * DAY);
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  ist.setUTCHours(hour, (daysAgo * 37) % 60, 0, 0);
  // clamp to now
  return new Date(Math.min(ist.getTime() - 5.5 * 3600_000, NOW - 60_000));
};
const exact = (daysAgo: number) => new Date(NOW - daysAgo * DAY);
const dateOnly = (daysAhead: number) => new Date(NOW + daysAhead * DAY + 5.5 * 3600_000).toISOString().slice(0, 10);
const meta = (daysAgo: number) => ({ model: "gemini-3.8-flash", ms: 6200, at: at(daysAgo).toISOString(), lang: "te" as const });

type Ev = { kind: EventKind; at: Date; by: "gpo" | "tahsildar" | "ai" | "citizen"; stage: Stage; details?: EventDetails };

type Story = {
  key: string;
  nameTe: string;
  nameEn: string;
  relation: string;
  gender: "M" | "F";
  age: number;
  last4: string;
  phone: string;
  village: string;
  address: string;
  occupation: string;
  income: number;
  purpose: Purpose;
  purposeDeadline?: string;
  stage: Stage;
  returnCount?: number;
  docs: [kind: string, file: string][];
  scrutiny?: ScrutinyData;
  enquiry?: EnquiryData;
  decision?: DecisionData;
  events: Ev[];
};

// --- story applications ---

const verified = (summary: string, flags: string[] = [], daysAgo = 3): ScrutinyData => ({
  ai: {
    extracted: [],
    checks: [
      { field: "పేరు", status: "match", note: "ఆధార్, రేషన్ కార్డు, దరఖాస్తులో పేరు ఒకటే." },
      { field: "చిరునామా", status: "match", note: "గ్రామం అన్ని పత్రాల్లో సరిపోతుంది." },
    ],
    missingDocuments: [],
    flags,
    recommendation: "verify",
    summary,
    returnReasonDraft: "",
  },
  aiMeta: meta(daysAgo),
  verifiedAt: at(daysAgo, 15).toISOString(),
});

const STORIES: Story[] = [
  {
    key: "lakshmi",
    nameTe: "పి. లక్ష్మి",
    nameEn: "P. Lakshmi",
    relation: "పి. వెంకటయ్య",
    gender: "F",
    age: 19,
    last4: "4821",
    phone: "9849012345",
    village: "ఆలూరు",
    address: "ఇం.నం. 2-41, ఆలూరు",
    occupation: "విద్యార్థిని (తండ్రి వ్యవసాయ కూలి)",
    income: 72000,
    purpose: "scholarship",
    purposeDeadline: dateOnly(3),
    stage: "scrutiny",
    docs: [["aadhaar", "lakshmi-id"], ["ration_card", "lakshmi-ration"], ["income_proof", "lakshmi-income"]],
    events: [{ kind: "submitted", at: at(2, 10), by: "citizen", stage: "scrutiny" }],
  },
  {
    key: "srinivas",
    nameTe: "జి. శ్రీనివాస్",
    nameEn: "G. Srinivas",
    relation: "జి. నర్సింహులు",
    gender: "M",
    age: 42,
    last4: "7315",
    phone: "9908123456",
    village: "ఆలూరు",
    address: "ఇం.నం. 5-12, ఆలూరు",
    occupation: "ఆటో డ్రైవర్",
    income: 110000,
    purpose: "bank_loan",
    stage: "scrutiny",
    docs: [["aadhaar", "srinivas-id"], ["ration_card", "srinivas-ration"], ["income_proof", "srinivas-income"]],
    events: [{ kind: "submitted", at: at(8, 12), by: "citizen", stage: "scrutiny" }],
  },
  {
    key: "fathima",
    nameTe: "ఎస్. ఫాతిమా బేగం",
    nameEn: "S. Fathima Begum",
    relation: "ఎస్. ఖాజా మియా",
    gender: "F",
    age: 35,
    last4: "2290",
    phone: "7702345678",
    village: "ముడిమ్యాల",
    address: "ఇం.నం. 1-77, ముడిమ్యాల",
    occupation: "టైలరింగ్",
    income: 60000,
    purpose: "govt_scheme",
    stage: "scrutiny",
    docs: [["aadhaar", "fathima-id"], ["ration_card", "fathima-ration"], ["income_proof", "fathima-income"]],
    events: [{ kind: "submitted", at: at(1, 16), by: "citizen", stage: "scrutiny" }],
  },
  {
    key: "raju",
    nameTe: "బి. రాజు",
    nameEn: "B. Raju",
    relation: "బి. యాదయ్య",
    gender: "M",
    age: 23,
    last4: "6604",
    phone: "8919234567",
    village: "కందవాడ",
    address: "ఇం.నం. 3-9, కందవాడ",
    occupation: "ప్రైవేట్ ఉద్యోగం (మెషిన్ ఆపరేటర్)",
    income: 180000,
    purpose: "employment",
    stage: "scrutiny",
    docs: [["aadhaar", "raju-id"], ["ration_card", "raju-ration"], ["income_proof", "raju-income"]],
    events: [{ kind: "submitted", at: at(5, 11), by: "citizen", stage: "scrutiny" }],
  },
  {
    key: "anitha",
    nameTe: "కె. అనిత",
    nameEn: "K. Anitha",
    relation: "కె. మల్లేష్",
    gender: "F",
    age: 17,
    last4: "1187",
    phone: "9963345678",
    village: "దేవుని ఎర్రవల్లి",
    address: "ఇం.నం. 4-20, దేవుని ఎర్రవల్లి",
    occupation: "విద్యార్థిని (తండ్రి రైతు)",
    income: 95000,
    purpose: "fee_reimbursement",
    purposeDeadline: dateOnly(5),
    stage: "scrutiny",
    docs: [["aadhaar", "anitha-id"], ["ration_card", "anitha-ration"]],
    events: [{ kind: "submitted", at: at(0, 9), by: "citizen", stage: "scrutiny" }],
  },
  {
    key: "narasimha",
    nameTe: "ఎం. నరసింహ",
    nameEn: "M. Narasimha",
    relation: "ఎం. బాలయ్య",
    gender: "M",
    age: 48,
    last4: "3349",
    phone: "9848456789",
    village: "గొల్లపల్లి",
    address: "ఇం.నం. 6-3, గొల్లపల్లి",
    occupation: "రైతు (3 ఎకరాలు)",
    income: 120000,
    purpose: "scholarship",
    purposeDeadline: dateOnly(12),
    stage: "field_enquiry",
    docs: [["aadhaar", "narasimha-id"], ["income_proof", "narasimha-income"]],
    scrutiny: {
      ...verified(
        "ఆధార్, స్వీయ ప్రకటన దరఖాస్తుతో సరిపోతున్నాయి. రేషన్ కార్డు జత చేయలేదు కానీ ఆధార్‌లో చిరునామా ఉంది. భూమి నుండి వచ్చే ఆదాయం విచారణలో నిర్ధారించాలి.",
        ["3 ఎకరాల భూమి పేర్కొన్నారు, కానీ పంట, దిగుబడి వివరాలు లేవు — క్షేత్ర విచారణలో నిర్ధారించాలి", "రేషన్ కార్డు జత చేయలేదు"],
        3,
      ),
      officerNotes: "రేషన్ కార్డు నంబర్ ఆన్‌లైన్‌లో సరిచూశాను. విచారణకు పంపుతున్నాను.",
    },
    events: [
      { kind: "submitted", at: at(4, 10), by: "citizen", stage: "scrutiny" },
      { kind: "ai_scrutiny", at: at(3, 11), by: "ai", stage: "scrutiny", details: { aiRecommendation: "verify", flags: 2 } },
      {
        kind: "documents_verified",
        at: at(3, 12),
        by: "gpo",
        stage: "scrutiny",
        details: { remarks: "రేషన్ కార్డు నంబర్ ఆన్‌లైన్‌లో సరిచూశాను. విచారణకు పంపుతున్నాను.", aiRecommendation: "verify", followedAi: true },
      },
    ],
  },
  {
    key: "saroja",
    nameTe: "డి. సరోజ",
    nameEn: "D. Saroja",
    relation: "కీ.శే. డి. ఎల్లయ్య",
    gender: "F",
    age: 52,
    last4: "9052",
    phone: "9701567890",
    village: "ఇబ్రహీంపల్లి",
    address: "ఇం.నం. 2-115, ఇబ్రహీంపల్లి",
    occupation: "వ్యవసాయ కూలి (వితంతువు)",
    income: 48000,
    purpose: "govt_scheme",
    stage: "field_enquiry",
    docs: [["aadhaar", "saroja-id"], ["income_proof", "saroja-income"]],
    scrutiny: verified("పత్రాలు దరఖాస్తుతో సరిపోతున్నాయి. దరఖాస్తుదారు వితంతువు, కూలి పని ద్వారా ఆదాయం.", [], 5),
    enquiry: {
      checklist: {
        focusAreas: ["కుటుంబంలో సంపాదించే ఇతర సభ్యులు ఉన్నారా", "కూలి పని రోజులు, రోజువారీ కూలి", "వితంతు పింఛను వస్తుందా"],
        questions: [
          "ఇంట్లో ఎవరెవరు ఉంటున్నారు? కుమారులు సంపాదిస్తున్నారా, వేరుగా ఉంటున్నారా?",
          "నెలకు ఎన్ని రోజులు కూలి పని దొరుకుతుంది? రోజుకు ఎంత?",
          "చేయూత / వితంతు పింఛను వస్తుందా? నెలకు ఎంత?",
          "సొంత భూమి లేదా కౌలు భూమి ఉందా?",
          "ఇల్లు సొంతమా, అద్దెదా? ఇంటి రకం (పక్కా/కచ్చా) గమనించండి.",
          "పశువులు, వాహనాలు ఏమైనా ఉన్నాయా?",
        ],
      },
      checklistMeta: meta(1),
    },
    events: [
      { kind: "submitted", at: at(6, 11), by: "citizen", stage: "scrutiny" },
      { kind: "ai_scrutiny", at: at(5, 10), by: "ai", stage: "scrutiny", details: { aiRecommendation: "verify", flags: 0 } },
      { kind: "documents_verified", at: at(5, 10), by: "gpo", stage: "scrutiny", details: { aiRecommendation: "verify", followedAi: true } },
      { kind: "ai_checklist", at: at(1, 9), by: "ai", stage: "field_enquiry" },
    ],
  },
  {
    key: "mahesh",
    nameTe: "ఆర్. మహేష్",
    nameEn: "R. Mahesh",
    relation: "ఆర్. కిష్టయ్య",
    gender: "M",
    age: 31,
    last4: "4410",
    phone: "9866678901",
    village: "దామరగిద్ద",
    address: "ఇం.నం. 7-2, దామరగిద్ద",
    occupation: "కిరాణా దుకాణం",
    income: 150000,
    purpose: "bank_loan",
    stage: "field_enquiry",
    returnCount: 1,
    docs: [],
    scrutiny: verified("మళ్ళీ సమర్పించిన దరఖాస్తులో రేషన్ కార్డు జత చేశారు. పత్రాలు సరిపోతున్నాయి.", ["దుకాణం ఆదాయం స్వీయ ప్రకటన మాత్రమే — విచారణలో అమ్మకాలు అంచనా వేయాలి"], 8),
    events: [
      { kind: "submitted", at: at(13, 10), by: "citizen", stage: "scrutiny" },
      {
        kind: "returned",
        at: at(11, 15),
        by: "gpo",
        stage: "scrutiny",
        details: { remarks: "రేషన్ కార్డు జత చేయలేదు. రేషన్ కార్డు కాపీతో మీసేవలో మళ్ళీ సమర్పించండి." },
      },
      { kind: "resubmitted", at: at(9, 11), by: "citizen", stage: "returned" },
      { kind: "ai_scrutiny", at: at(8, 10), by: "ai", stage: "scrutiny", details: { aiRecommendation: "verify", flags: 1 } },
      { kind: "documents_verified", at: at(8, 11), by: "gpo", stage: "scrutiny", details: { aiRecommendation: "verify", followedAi: true } },
    ],
  },
  {
    key: "padma",
    nameTe: "వై. పద్మ",
    nameEn: "Y. Padma",
    relation: "వై. శ్రీశైలం",
    gender: "F",
    age: 20,
    last4: "5518",
    phone: "9989789012",
    village: "ఆలూరు",
    address: "ఇం.నం. 1-30, ఆలూరు",
    occupation: "విద్యార్థిని (తండ్రి తాపీ మేస్త్రీ)",
    income: 84000,
    purpose: "scholarship",
    purposeDeadline: dateOnly(2),
    stage: "decision",
    docs: [["aadhaar", "padma-id"]],
    scrutiny: verified("ఆధార్ సరిపోతుంది. తండ్రి తాపీ మేస్త్రీగా పని చేస్తారని స్వీయ ప్రకటన. విచారణలో పని రోజులు నిర్ధారించాలి.", ["ఆదాయ రుజువు స్వీయ ప్రకటన మాత్రమే"], 4),
    enquiry: {
      notes:
        "ఇంటికి వెళ్ళాను. తండ్రి శ్రీశైలం తాపీ మేస్త్రీ, రోజుకు 600, నెలకు సుమారు 12-13 రోజులు పని దొరుకుతుంది. తల్లి గృహిణి. తమ్ముడు 9వ తరగతి. సొంత భూమి లేదు. చిన్న పెంకుటిల్లు, సొంతం. వాహనం లేదు, ఒక సైకిల్ ఉంది. పక్కింటి వారు కూడా అదే చెప్పారు.",
      report: {
        occupation: "తాపీ మేస్త్రీ (తండ్రి)",
        earningMembers: [{ relation: "తండ్రి", occupation: "తాపీ మేస్త్రీ", annualIncome: 90000 }],
        landAcres: 0,
        assets: "చిన్న సొంత పెంకుటిల్లు, సైకిల్",
        estimatedAnnualIncome: 90000,
        consistentWithDeclared: true,
        discrepancies: [],
        summary:
          "తండ్రి తాపీ మేస్త్రీగా రోజుకు ₹600 చొప్పున నెలకు సుమారు 12-13 రోజులు పని చేస్తారు (₹600 × 12.5 × 12 ≈ ₹90,000). ఇతర సంపాదించే సభ్యులు, భూమి లేవు. ప్రకటించిన ఆదాయానికి దగ్గరగా ఉంది. ఇరుగుపొరుగు వారి ధృవీకరణ ఉంది.",
      },
      reportMeta: meta(1),
      officerEstimatedIncome: 90000,
      submittedAt: at(1, 17).toISOString(),
    },
    events: [
      { kind: "submitted", at: at(5, 10), by: "citizen", stage: "scrutiny" },
      { kind: "ai_scrutiny", at: at(4, 10), by: "ai", stage: "scrutiny", details: { aiRecommendation: "verify", flags: 1 } },
      { kind: "documents_verified", at: at(4, 11), by: "gpo", stage: "scrutiny", details: { aiRecommendation: "verify", followedAi: true } },
      { kind: "ai_checklist", at: at(2, 9), by: "ai", stage: "field_enquiry" },
      { kind: "ai_report", at: at(1, 16), by: "ai", stage: "field_enquiry", details: { estimatedIncome: 90000 } },
      { kind: "enquiry_submitted", at: at(1, 17), by: "gpo", stage: "field_enquiry", details: { estimatedIncome: 90000 } },
    ],
  },
  {
    key: "krishna",
    nameTe: "టి. కృష్ణ",
    nameEn: "T. Krishna",
    relation: "టి. రాములు",
    gender: "M",
    age: 45,
    last4: "8876",
    phone: "9440890123",
    village: "కందవాడ",
    address: "ఇం.నం. 8-1, కందవాడ",
    occupation: "రైతు",
    income: 100000,
    purpose: "bank_loan",
    stage: "decision",
    docs: [["aadhaar", "krishna-id"], ["income_proof", "krishna-income"]],
    scrutiny: verified("పత్రాలు సరిపోతున్నాయి. స్వీయ ప్రకటనలో 'వ్యవసాయం' అని మాత్రమే ఉంది, భూమి విస్తీర్ణం లేదు.", ["భూమి విస్తీర్ణం, పంట వివరాలు ప్రకటనలో లేవు"], 6),
    enquiry: {
      notes:
        "కృష్ణ గారి ఇంటికి వెళ్ళాను. ధరణి ప్రకారం 8 ఎకరాల పట్టా భూమి, బోరు బావి ఉంది. ఈ ఏడాది వరి, పత్తి వేశారు. సొంత ట్రాక్టర్ ఉంది, ఖాళీ సమయంలో కిరాయికి ఇస్తారు. పక్కా ఇల్లు. రైతు చెప్పిన దాని ప్రకారం ఖర్చులు పోను సుమారు 3.5 లక్షలు వ్యవసాయం నుండి, ట్రాక్టర్ కిరాయి సుమారు లక్ష.",
      report: {
        occupation: "రైతు, ట్రాక్టర్ కిరాయి",
        earningMembers: [
          { relation: "స్వయం", occupation: "వ్యవసాయం (8 ఎకరాలు, వరి/పత్తి)", annualIncome: 350000 },
          { relation: "స్వయం", occupation: "ట్రాక్టర్ కిరాయి", annualIncome: 100000 },
        ],
        landAcres: 8,
        assets: "పక్కా ఇల్లు, సొంత ట్రాక్టర్, బోరు బావి",
        estimatedAnnualIncome: 450000,
        consistentWithDeclared: false,
        discrepancies: ["ప్రకటించిన ఆదాయం ₹1,00,000 — విచారణలో ₹4,50,000 (4.5 రెట్లు ఎక్కువ)", "స్వీయ ప్రకటనలో భూమి, ట్రాక్టర్ వివరాలు చూపలేదు"],
        summary:
          "దరఖాస్తుదారుకు 8 ఎకరాల పట్టా భూమి, సొంత ట్రాక్టర్ ఉన్నాయి. వ్యవసాయం నుండి సుమారు ₹3.5 లక్షలు, ట్రాక్టర్ కిరాయి నుండి సుమారు ₹1 లక్ష — మొత్తం సుమారు ₹4.5 లక్షలు. ప్రకటించిన ₹1 లక్షకు చాలా ఎక్కువ.",
      },
      reportMeta: meta(1),
      officerEstimatedIncome: 450000,
      submittedAt: at(1, 18).toISOString(),
    },
    decision: {
      ai: {
        caseSummary:
          "టి. కృష్ణ, కందవాడ, బ్యాంక్ రుణం కోసం ₹1,00,000 ఆదాయం ప్రకటించారు. గుర్తింపు, నివాసం ధృవీకరించబడ్డాయి. క్షేత్ర విచారణలో 8 ఎకరాల భూమి, ట్రాక్టర్ ద్వారా సుమారు ₹4,50,000 ఆదాయం తేలింది. ప్రకటన తక్కువగా చూపినప్పటికీ, విచారణలో తేలిన వాస్తవ ఆదాయాన్ని ధృవీకరించవచ్చు.",
        suggestedOutcome: "approve",
        reasons: [
          "గుర్తింపు, నివాసం పత్రాలతో, విచారణతో ధృవీకరించబడ్డాయి",
          "విచారణ అధికారి ఆదాయాన్ని స్పష్టమైన వివరాలతో ₹4,50,000 గా నిర్ధారించారు",
          "ఎక్కువ ఆదాయం తిరస్కరణకు కారణం కాదు — వాస్తవ ఆదాయంతో పత్రం జారీ చేయాలి",
        ],
        certifiedIncome: 450000,
        draftRemarks:
          "క్షేత్ర విచారణ నివేదిక ఆధారంగా దరఖాస్తుదారు కుటుంబ వార్షిక ఆదాయం ₹4,50,000 గా నిర్ధారించడమైనది. ప్రకటించిన ఆదాయం (₹1,00,000) కాకుండా విచారణలో తేలిన ఆదాయంతో పత్రం జారీ చేయడమైనది.",
        confidence: "high",
      },
      aiMeta: meta(0),
    },
    events: [
      { kind: "submitted", at: at(7, 12), by: "citizen", stage: "scrutiny" },
      { kind: "ai_scrutiny", at: at(6, 10), by: "ai", stage: "scrutiny", details: { aiRecommendation: "verify", flags: 1 } },
      { kind: "documents_verified", at: at(6, 11), by: "gpo", stage: "scrutiny", details: { aiRecommendation: "verify", followedAi: true } },
      { kind: "ai_checklist", at: at(3, 9), by: "ai", stage: "field_enquiry" },
      { kind: "ai_report", at: at(1, 17), by: "ai", stage: "field_enquiry", details: { estimatedIncome: 450000 } },
      { kind: "enquiry_submitted", at: at(1, 18), by: "gpo", stage: "field_enquiry", details: { estimatedIncome: 450000 } },
      { kind: "ai_decision", at: at(0, 9), by: "ai", stage: "decision", details: { aiRecommendation: "approve", certifiedIncome: 450000 } },
    ],
  },
  {
    key: "bhagya",
    nameTe: "సి. భాగ్య",
    nameEn: "C. Bhagya",
    relation: "సి. అంజయ్య",
    gender: "F",
    age: 18,
    last4: "6721",
    phone: "9603901234",
    village: "గొల్లపల్లి",
    address: "ఇం.నం. 3-56, గొల్లపల్లి",
    occupation: "విద్యార్థిని (తండ్రి పాల వ్యాపారం)",
    income: 96000,
    purpose: "scholarship",
    stage: "approved",
    docs: [],
    scrutiny: verified("పత్రాలు సరిపోతున్నాయి.", [], 9),
    enquiry: {
      notes: "తండ్రి అంజయ్య 3 గేదెలు, రోజుకు 10 లీటర్ల పాలు డెయిరీకి. ఖర్చులు పోను నెలకు సుమారు 8000. తల్లి గృహిణి.",
      officerEstimatedIncome: 96000,
      submittedAt: at(6, 16).toISOString(),
    },
    decision: {
      outcome: "approved",
      certifiedIncome: 96000,
      certificateNo: `TS-CVL-INC-${new Date().getFullYear()}-00011`,
      remarks: "విచారణ నివేదిక ఆధారంగా కుటుంబ వార్షిక ఆదాయం ₹96,000 గా ధృవీకరించడమైనది.",
      decidedAt: at(4, 12).toISOString(),
    },
    events: [
      { kind: "submitted", at: at(10, 10), by: "citizen", stage: "scrutiny" },
      { kind: "ai_scrutiny", at: at(9, 10), by: "ai", stage: "scrutiny", details: { aiRecommendation: "verify", flags: 0 } },
      { kind: "documents_verified", at: at(9, 11), by: "gpo", stage: "scrutiny", details: { aiRecommendation: "verify", followedAi: true } },
      { kind: "enquiry_submitted", at: at(6, 16), by: "gpo", stage: "field_enquiry", details: { estimatedIncome: 96000 } },
      { kind: "ai_decision", at: at(4, 11), by: "ai", stage: "decision", details: { aiRecommendation: "approve", certifiedIncome: 96000 } },
      {
        kind: "approved",
        at: at(4, 12),
        by: "tahsildar",
        stage: "decision",
        details: {
          remarks: "విచారణ నివేదిక ఆధారంగా కుటుంబ వార్షిక ఆదాయం ₹96,000 గా ధృవీకరించడమైనది.",
          aiRecommendation: "approve",
          followedAi: true,
          certifiedIncome: 96000,
        },
      },
    ],
  },
  {
    key: "shekar",
    nameTe: "ఎన్. శేఖర్",
    nameEn: "N. Shekar",
    relation: "ఎన్. పెంటయ్య",
    gender: "M",
    age: 34,
    last4: "3017",
    phone: "9177012345",
    village: "ముడిమ్యాల",
    address: "ఇం.నం. 9-14, ముడిమ్యాల",
    occupation: "ప్రైవేట్ ఉద్యోగం",
    income: 90000,
    purpose: "govt_scheme",
    stage: "rejected",
    docs: [],
    scrutiny: verified("పత్రాల్లో ముడిమ్యాల చిరునామా ఉంది.", ["ఫోన్‌లో సంప్రదించినప్పుడు హైదరాబాద్‌లో ఉన్నానని చెప్పారు"], 11),
    enquiry: {
      notes:
        "ముడిమ్యాల ఇంటికి వెళ్ళాను. ఇల్లు 2 సంవత్సరాలుగా తాళం వేసి ఉంది. శేఖర్ కుటుంబంతో హైదరాబాద్ కూకట్‌పల్లిలో ఉంటూ సాఫ్ట్‌వేర్ కంపెనీలో పని చేస్తున్నారని గ్రామ కార్యదర్శి, ఇరుగుపొరుగు చెప్పారు.",
      officerEstimatedIncome: 600000,
      submittedAt: at(5, 15).toISOString(),
    },
    decision: {
      outcome: "rejected",
      remarks: "దరఖాస్తుదారు ఈ మండలంలో నివసించడం లేదు; హైదరాబాద్‌లో స్థిరపడ్డారు. నివాస మండలంలో దరఖాస్తు చేసుకోవాలి.",
      decidedAt: at(3, 11).toISOString(),
    },
    events: [
      { kind: "submitted", at: at(12, 10), by: "citizen", stage: "scrutiny" },
      { kind: "ai_scrutiny", at: at(11, 10), by: "ai", stage: "scrutiny", details: { aiRecommendation: "verify", flags: 1 } },
      { kind: "documents_verified", at: at(11, 12), by: "gpo", stage: "scrutiny", details: { aiRecommendation: "verify", followedAi: true } },
      { kind: "enquiry_submitted", at: at(5, 15), by: "gpo", stage: "field_enquiry", details: { estimatedIncome: 600000 } },
      { kind: "ai_decision", at: at(3, 10), by: "ai", stage: "decision", details: { aiRecommendation: "reject" } },
      {
        kind: "rejected",
        at: at(3, 11),
        by: "tahsildar",
        stage: "decision",
        details: {
          remarks: "దరఖాస్తుదారు ఈ మండలంలో నివసించడం లేదు; హైదరాబాద్‌లో స్థిరపడ్డారు. నివాస మండలంలో దరఖాస్తు చేసుకోవాలి.",
          aiRecommendation: "reject",
          followedAi: true,
        },
      },
    ],
  },
  {
    key: "swapna",
    nameTe: "వి. స్వప్న",
    nameEn: "V. Swapna",
    relation: "వి. రవి",
    gender: "F",
    age: 29,
    last4: "7790",
    phone: "8500123456",
    village: "కందవాడ",
    address: "ఇం.నం. 2-88, కందవాడ",
    occupation: "అంగన్‌వాడీ సహాయకురాలు",
    income: 78000,
    purpose: "govt_scheme",
    stage: "returned",
    returnCount: 1,
    docs: [],
    scrutiny: {
      ai: {
        extracted: [],
        checks: [{ field: "రేషన్ కార్డు", status: "missing", note: "రేషన్ కార్డు జత చేయలేదు." }],
        missingDocuments: ["ఆహార భద్రత (రేషన్) కార్డు"],
        flags: [],
        recommendation: "return",
        summary: "ఆధార్, ఆదాయ రుజువు ఉన్నాయి కానీ రేషన్ కార్డు లేదు.",
        returnReasonDraft: "మీ దరఖాస్తులో రేషన్ కార్డు జత చేయలేదు. దయచేసి రేషన్ కార్డు కాపీతో మీసేవలో మళ్ళీ సమర్పించండి.",
      },
      aiMeta: meta(2),
    },
    events: [
      { kind: "submitted", at: at(3, 15), by: "citizen", stage: "scrutiny" },
      { kind: "ai_scrutiny", at: at(2, 10), by: "ai", stage: "scrutiny", details: { aiRecommendation: "return", flags: 1 } },
      {
        kind: "returned",
        at: at(2, 11),
        by: "gpo",
        stage: "scrutiny",
        details: {
          remarks: "మీ దరఖాస్తులో రేషన్ కార్డు జత చేయలేదు. దయచేసి రేషన్ కార్డు కాపీతో మీసేవలో మళ్ళీ సమర్పించండి.",
          aiRecommendation: "return",
          followedAi: true,
        },
      },
    ],
  },
];

// --- closed history for the Impact page ---

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HIST_NAMES: [string, string, "M" | "F"][] = [
  ["ఎ. రమాదేవి", "A. Ramadevi", "F"], ["బి. సురేష్", "B. Suresh", "M"], ["సి. మంజుల", "C. Manjula", "F"],
  ["డి. ప్రవీణ్", "D. Praveen", "M"], ["ఇ. కవిత", "E. Kavitha", "F"], ["జి. నవీన్", "G. Naveen", "M"],
  ["హెచ్. శారద", "H. Sharada", "F"], ["కె. వెంకటేష్", "K. Venkatesh", "M"], ["ఎల్. పావని", "L. Pavani", "F"],
  ["ఎం. రాజేందర్", "M. Rajender", "M"], ["ఎన్. సుధ", "N. Sudha", "F"], ["పి. శ్రీకాంత్", "P. Srikanth", "M"],
  ["ఆర్. జ్యోతి", "R. Jyothi", "F"], ["ఎస్. అనిల్", "S. Anil", "M"], ["టి. రేఖ", "T. Rekha", "F"],
  ["వి. కిరణ్", "V. Kiran", "M"], ["వై. సంధ్య", "Y. Sandhya", "F"], ["ఎ. మధు", "A. Madhu", "M"],
  ["బి. స్రవంతి", "B. Sravanthi", "F"], ["సి. రాఘవేందర్", "C. Raghavender", "M"], ["డి. మమత", "D. Mamatha", "F"],
  ["జి. బాలరాజు", "G. Balaraju", "M"], ["కె. ఉమ", "K. Uma", "F"], ["ఎం. యాదగిరి", "M. Yadagiri", "M"],
];
const HIST_VILLAGES = ["ఆలూరు", "కందవాడ", "ముడిమ్యాల", "దేవుని ఎర్రవల్లి", "గొల్లపల్లి", "ఇబ్రహీంపల్లి", "దామరగిద్ద"];
const HIST_PURPOSES: Purpose[] = ["scholarship", "scholarship", "fee_reimbursement", "bank_loan", "govt_scheme", "employment"];
const HIST_OCC = ["వ్యవసాయ కూలి", "రైతు", "ఆటో డ్రైవర్", "టైలరింగ్", "కిరాణా దుకాణం", "తాపీ మేస్త్రీ", "పాల వ్యాపారం"];

function historical(): Story[] {
  const r = rng(2026);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  return HIST_NAMES.map(([nameTe, nameEn, gender], i) => {
    const submitted = 58 - i * 1.8 - r() * 2;
    const returned = r() < 0.2;
    const rejected = r() < 0.1;
    const followed = r() < 0.86;
    const income = Math.round((40 + r() * 140) * 1000 / 1000) * 1000;

    // exact times, otherwise steps can end up out of order
    let tCursor = submitted;
    const evs: Ev[] = [{ kind: "submitted", at: exact(tCursor), by: "citizen", stage: "scrutiny" }];
    if (returned) {
      tCursor -= 0.5 + r() * 1.5;
      evs.push({ kind: "returned", at: exact(tCursor), by: "gpo", stage: "scrutiny", details: { remarks: "ఆదాయ రుజువు స్పష్టంగా లేదు." } });
      tCursor -= 2 + r() * 3;
      evs.push({ kind: "resubmitted", at: exact(tCursor), by: "citizen", stage: "returned" });
    }
    tCursor -= 0.4 + r() * 1.6;
    evs.push({ kind: "ai_scrutiny", at: exact(tCursor + 0.02), by: "ai", stage: "scrutiny", details: { aiRecommendation: "verify", flags: Math.floor(r() * 2) } });
    evs.push({ kind: "documents_verified", at: exact(tCursor), by: "gpo", stage: "scrutiny", details: { aiRecommendation: "verify", followedAi: true } });
    tCursor -= 1 + r() * 3.2;
    evs.push({ kind: "ai_report", at: exact(tCursor + 0.02), by: "ai", stage: "field_enquiry", details: { estimatedIncome: income } });
    evs.push({ kind: "enquiry_submitted", at: exact(tCursor), by: "gpo", stage: "field_enquiry", details: { estimatedIncome: income } });
    tCursor -= 0.3 + r() * 1.4;
    const aiRec = rejected ? (followed ? "reject" : "approve") : followed ? "approve" : "return";
    evs.push({ kind: "ai_decision", at: exact(tCursor + 0.02), by: "ai", stage: "decision", details: { aiRecommendation: aiRec } });
    evs.push({
      kind: rejected ? "rejected" : "approved",
      at: exact(tCursor),
      by: "tahsildar",
      stage: "decision",
      details: {
        aiRecommendation: aiRec,
        followedAi: followed,
        certifiedIncome: rejected ? undefined : income,
        remarks: rejected ? "దరఖాస్తుదారు నివాసం నిర్ధారణ కాలేదు." : undefined,
      },
    });

    return {
      key: `hist-${i}`,
      nameTe,
      nameEn,
      relation: "—",
      gender,
      age: 18 + Math.floor(r() * 40),
      last4: String(1000 + Math.floor(r() * 9000)),
      phone: `9${String(Math.floor(r() * 1e9)).padStart(9, "0")}`,
      village: pick(HIST_VILLAGES),
      address: "—",
      occupation: pick(HIST_OCC),
      income,
      purpose: pick(HIST_PURPOSES),
      stage: rejected ? "rejected" : "approved",
      returnCount: returned ? 1 : 0,
      docs: [],
      decision: rejected
        ? { outcome: "rejected", remarks: "దరఖాస్తుదారు నివాసం నిర్ధారణ కాలేదు." }
        : { outcome: "approved", certifiedIncome: income, certificateNo: `TS-CVL-INC-H-${String(i + 1).padStart(4, "0")}` },
      events: evs,
    } satisfies Story;
  });
}

// ---------------------------------------------------------------------------

const GPO1_VILLAGES = ["ఆలూరు", "కందవాడ", "ముడిమ్యాల", "దేవుని ఎర్రవల్లి"];
const GPO2_VILLAGES = ["గొల్లపల్లి", "ఇబ్రహీంపల్లి", "దామరగిద్ద"];

async function main() {
  // --if-empty: used by vercel-build, only seeds a fresh db
  if (process.argv.includes("--if-empty") && (await db.$count(users)) > 0) {
    console.log("Database already has data; skipping seed.");
    process.exit(0);
  }
  // don't wipe a remote db by accident
  const host = new URL(process.env.DATABASE_URL ?? "postgres://localhost").hostname;
  const local = ["localhost", "127.0.0.1", "::1", ""].includes(host);
  if (!process.argv.includes("--if-empty") && !local && process.env.ALLOW_REMOTE_RESET !== "yes") {
    console.error(`Refusing to wipe the database on ${host}. Set ALLOW_REMOTE_RESET=yes if you really mean it.`);
    process.exit(1);
  }

  console.log("Resetting tables…");
  await db.execute(
    sql`TRUNCATE events, documents, applications, sessions, login_attempts, users RESTART IDENTITY CASCADE`,
  );

  const MANDAL = "చేవెళ్ల";
  const mk = async (
    username: string,
    password: string,
    nameTe: string,
    nameEn: string,
    role: User["role"],
    villages: string[] | null,
  ) =>
    (
      await db
        .insert(users)
        .values({ username, passwordHash: await bcrypt.hash(password, 12), nameTe, nameEn, role, mandal: MANDAL, villages })
        .returning()
    )[0];
  const people = {
    demo: await mk("demo", "Demo@2026", "డెమో అధికారి", "Demo Officer", "demo", null),
    gpo: await mk("gpo", "Gpo@2026", "ఎం. రమేష్", "M. Ramesh", "field_officer", GPO1_VILLAGES),
    gpo2: await mk("gpo2", "Gpo2@2026", "బి. శ్రీలత", "B. Srilatha", "field_officer", GPO2_VILLAGES),
    tahsildar: await mk("tahsildar", "Tahsildar@2026", "కె. సుజాత", "K. Sujatha", "tahsildar", null),
  };
  const fieldOfficer = (village: string) => (GPO1_VILLAGES.includes(village) ? people.gpo : people.gpo2);

  const all = [...historical(), ...STORIES];
  let seq = 1;
  for (const s of all) {
    // derive dates from events so they always match
    const submittedAt = s.events.find((e) => e.kind === "submitted")!.at;
    const clockStart = s.events.findLast((e) => e.kind === "submitted" || e.kind === "resubmitted")!.at;
    const dueAt = new Date(clockStart.getTime() + SLA_DAYS * DAY);
    const closedAt = s.events.find((e) => e.kind === "approved" || e.kind === "rejected")?.at ?? null;
    const [row] = await db
      .insert(applications)
      .values({
        appNo: `MS-INC-${new Date().getFullYear()}-${String(seq++).padStart(6, "0")}`,
        applicantNameTe: s.nameTe,
        applicantNameEn: s.nameEn,
        relationNameTe: s.relation,
        gender: s.gender,
        age: s.age,
        aadhaarLast4: s.last4,
        phone: s.phone,
        village: s.village,
        mandal: "చేవెళ్ల",
        district: "రంగారెడ్డి",
        address: s.address,
        occupation: s.occupation,
        declaredIncome: s.income,
        purpose: s.purpose,
        purposeDeadline: s.purposeDeadline ?? null,
        stage: s.stage,
        submittedAt,
        dueAt,
        closedAt,
        returnCount: s.returnCount ?? 0,
        scrutiny: s.scrutiny ?? {},
        enquiry: s.enquiry ?? {},
        decision: s.decision ?? {},
        updatedAt: new Date(),
      })
      .returning({ id: applications.id });

    for (const [kind, file] of s.docs) {
      const data = readFileSync(new URL(`../seed/docs/${file}.png`, import.meta.url));
      await db.insert(documents).values({
        applicationId: row.id,
        kind,
        fileName: `${file}.png`,
        mimeType: "image/png",
        size: data.length,
        data,
      });
    }

    for (const e of s.events) {
      const actor =
        e.by === "ai"
          ? { actorId: null, actorName: "Gemini", actorRole: "ai" }
          : e.by === "citizen"
            ? { actorId: null, actorName: "citizen", actorRole: "citizen" }
            : (() => {
                const p = e.by === "gpo" ? fieldOfficer(s.village) : people[e.by];
                return { actorId: p.id, actorName: p.nameTe, actorRole: p.role };
              })();
      await db.insert(events).values({
        applicationId: row.id,
        kind: e.kind,
        stage: e.stage,
        details: e.details ?? {},
        createdAt: e.at,
        ...actor,
      });
    }
  }

  console.log(`Seeded ${Object.keys(people).length} users and ${all.length} applications.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
