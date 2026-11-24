import { z } from "zod";

export const ROLES = ["field_officer", "tahsildar", "demo"] as const;
export type Role = (typeof ROLES)[number];

export const STAGES = [
  "scrutiny",
  "field_enquiry",
  "decision",
  "approved",
  "rejected",
  "returned",
] as const;
export type Stage = (typeof STAGES)[number];

export const ACTIVE_STAGES = ["scrutiny", "field_enquiry", "decision"] as const;
export type ActiveStage = (typeof ACTIVE_STAGES)[number];

export const PURPOSES = [
  "scholarship",
  "fee_reimbursement",
  "bank_loan",
  "govt_scheme",
  "employment",
  "other",
] as const;
export type Purpose = (typeof PURPOSES)[number];

export const DOC_KINDS = ["aadhaar", "ration_card", "income_proof", "other"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export type Lang = "te" | "en";

// AI output schemas. Same schema goes to Gemini as responseJsonSchema and
// validates the reply. No nullables - not every Gemini model accepts them.

export const scrutinyAiSchema = z.object({
  extracted: z
    .array(
      z.object({
        document: z.string().describe("Document kind it came from: aadhaar, ration_card, income_proof or other"),
        name: z.string().describe("Name as printed, or empty string"),
        relationName: z.string().describe("Father/husband name as printed, or empty string"),
        address: z.string().describe("Address/village as printed, or empty string"),
        annualIncome: z.number().describe("Annual income stated or implied in rupees, 0 if none"),
      }),
    )
    .describe("Key fields read from each document"),
  checks: z
    .array(
      z.object({
        field: z.string().describe("What was compared, e.g. name, father name, address, income"),
        status: z.enum(["match", "mismatch", "missing", "unclear"]),
        note: z.string().describe("One short sentence for the officer"),
      }),
    )
    .describe("Cross-checks between the application form and the documents"),
  missingDocuments: z.array(z.string()),
  flags: z.array(z.string()).describe("Issues the officer must look at; empty if none"),
  recommendation: z.enum(["verify", "return"]),
  summary: z.string().describe("2-3 sentence summary for the officer"),
  returnReasonDraft: z
    .string()
    .describe("Polite message to the citizen listing what to correct; empty if recommendation is verify"),
});
export type ScrutinyAi = z.infer<typeof scrutinyAiSchema>;

export const checklistAiSchema = z.object({
  focusAreas: z.array(z.string()).describe("What this particular visit must confirm"),
  questions: z.array(z.string()).describe("Questions/observations for the household visit, 5-8 items"),
});
export type ChecklistAi = z.infer<typeof checklistAiSchema>;

export const enquiryReportSchema = z.object({
  occupation: z.string(),
  earningMembers: z.array(
    z.object({
      relation: z.string(),
      occupation: z.string(),
      annualIncome: z.number(),
    }),
  ),
  landAcres: z.number().describe("Agricultural land owned by the family in acres, 0 if none"),
  assets: z.string().describe("Notable assets observed (house type, vehicles, livestock)"),
  estimatedAnnualIncome: z.number().describe("Total family annual income in rupees"),
  consistentWithDeclared: z.boolean(),
  discrepancies: z.array(z.string()),
  summary: z.string().describe("3-4 sentence enquiry report in officer's language"),
});
export type EnquiryReport = z.infer<typeof enquiryReportSchema>;

export const decisionAiSchema = z.object({
  caseSummary: z.string(),
  suggestedOutcome: z.enum(["approve", "reject", "return"]),
  reasons: z.array(z.string()),
  certifiedIncome: z.number().describe("Income to certify in rupees if approving, else 0"),
  draftRemarks: z.string().describe("Draft proceedings / remarks text for the order"),
  confidence: z.enum(["high", "medium", "low"]),
});
export type DecisionAi = z.infer<typeof decisionAiSchema>;

// per-stage jsonb columns on applications

export type AiMeta = { model: string; ms: number; at: string; lang: Lang };

export type ScrutinyData = {
  ai?: ScrutinyAi;
  aiMeta?: AiMeta;
  officerNotes?: string;
  verifiedAt?: string;
};

export type EnquiryData = {
  checklist?: ChecklistAi;
  checklistMeta?: AiMeta;
  notes?: string;
  report?: EnquiryReport;
  reportMeta?: AiMeta;
  officerEstimatedIncome?: number;
  submittedAt?: string;
};

export type DecisionData = {
  ai?: DecisionAi;
  aiMeta?: AiMeta;
  outcome?: "approved" | "rejected";
  remarks?: string;
  certifiedIncome?: number;
  certificateNo?: string;
  decidedAt?: string;
};

export const EVENT_KINDS = [
  "submitted",
  "ai_scrutiny",
  "ai_checklist",
  "ai_report",
  "ai_decision",
  "documents_verified",
  "enquiry_submitted",
  "returned",
  "sent_back",
  "resubmitted",
  "approved",
  "rejected",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export type EventDetails = {
  remarks?: string;
  aiRecommendation?: string;
  followedAi?: boolean;
  flags?: number;
  estimatedIncome?: number;
  certifiedIncome?: number;
  certificateNo?: string;
  model?: string;
  requestedBy?: number;
};
