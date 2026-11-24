import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type {
  DecisionData,
  EnquiryData,
  EventDetails,
  EventKind,
  ScrutinyData,
} from "@/lib/types";
import { ROLES, STAGES } from "@/lib/types";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const roleEnum = pgEnum("role", ROLES);
export const stageEnum = pgEnum("stage", STAGES);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nameTe: text("name_te").notNull(),
  nameEn: text("name_en").notNull(),
  role: roleEnum("role").notNull(),
  mandal: text("mandal").notNull(),
  // null = whole mandal
  villages: text("villages").array(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

// id = sha256(cookie token), so a db leak doesn't give usable sessions
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256(token), hex
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    revokedAt: ts("revoked_at"),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull(),
    ip: text("ip").notNull(),
    success: boolean("success").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("login_attempts_user_idx").on(t.username, t.createdAt), index("login_attempts_ip_idx").on(t.ip, t.createdAt)],
);

export const applications = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    appNo: text("app_no").notNull().unique(),
    applicantNameTe: text("applicant_name_te").notNull(),
    applicantNameEn: text("applicant_name_en").notNull(),
    relationNameTe: text("relation_name_te").notNull(),
    gender: text("gender").notNull(), // M | F | O
    age: integer("age").notNull(),
    aadhaarLast4: text("aadhaar_last4").notNull(),
    phone: text("phone").notNull(),
    village: text("village").notNull(),
    mandal: text("mandal").notNull(),
    district: text("district").notNull(),
    address: text("address").notNull(),
    occupation: text("occupation").notNull(),
    declaredIncome: integer("declared_income").notNull(),
    purpose: text("purpose").notNull(),
    purposeDeadline: date("purpose_deadline", { mode: "string" }),
    stage: stageEnum("stage").notNull().default("scrutiny"),
    submittedAt: ts("submitted_at").notNull().defaultNow(),
    dueAt: ts("due_at").notNull(),
    closedAt: ts("closed_at"),
    returnCount: integer("return_count").notNull().default(0),
    scrutiny: jsonb("scrutiny").$type<ScrutinyData>().notNull().default({}),
    enquiry: jsonb("enquiry").$type<EnquiryData>().notNull().default({}),
    decision: jsonb("decision").$type<DecisionData>().notNull().default({}),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("applications_stage_due_idx").on(t.stage, t.dueAt)],
);

export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    data: bytea("data").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("documents_app_idx").on(t.applicationId)],
);

// append-only (trigger in 0002_audit_append_only.sql)
export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    actorId: integer("actor_id").references(() => users.id),
    actorName: text("actor_name").notNull(),
    actorRole: text("actor_role").notNull(), // role, "citizen" or "ai"
    kind: text("kind").$type<EventKind>().notNull(),
    stage: text("stage").notNull(), // stage when the event happened
    details: jsonb("details").$type<EventDetails>().notNull().default({}),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("events_app_idx").on(t.applicationId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type EventRow = typeof events.$inferSelect;
