CREATE TYPE "public"."role" AS ENUM('field_officer', 'tahsildar', 'demo');--> statement-breakpoint
CREATE TYPE "public"."stage" AS ENUM('scrutiny', 'field_enquiry', 'decision', 'approved', 'rejected', 'returned');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_no" text NOT NULL,
	"applicant_name_te" text NOT NULL,
	"applicant_name_en" text NOT NULL,
	"relation_name_te" text NOT NULL,
	"gender" text NOT NULL,
	"age" integer NOT NULL,
	"aadhaar_last4" text NOT NULL,
	"phone" text NOT NULL,
	"village" text NOT NULL,
	"mandal" text NOT NULL,
	"district" text NOT NULL,
	"address" text NOT NULL,
	"occupation" text NOT NULL,
	"declared_income" integer NOT NULL,
	"purpose" text NOT NULL,
	"purpose_deadline" date,
	"stage" "stage" DEFAULT 'scrutiny' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"return_count" integer DEFAULT 0 NOT NULL,
	"scrutiny" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enquiry" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"decision" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_app_no_unique" UNIQUE("app_no")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"kind" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"actor_id" integer,
	"actor_name" text NOT NULL,
	"actor_role" text NOT NULL,
	"kind" text NOT NULL,
	"stage" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"name_te" text NOT NULL,
	"name_en" text NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_stage_due_idx" ON "applications" USING btree ("stage","due_at");--> statement-breakpoint
CREATE INDEX "documents_app_idx" ON "documents" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "events_app_idx" ON "events" USING btree ("application_id","created_at");