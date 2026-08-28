CREATE TABLE "inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_name" text NOT NULL,
	"manufacturer" text NOT NULL,
	"category" text NOT NULL,
	"score" integer NOT NULL,
	"status" text NOT NULL,
	"date" date NOT NULL,
	"state" text NOT NULL,
	"batch_number" text NOT NULL,
	"inspector_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"image" text,
	"product_link" text,
	"notes" text DEFAULT '' NOT NULL,
	"fields" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"product" text NOT NULL,
	"inspector" text NOT NULL,
	"date" date NOT NULL,
	"score" integer NOT NULL,
	"status" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"district" text NOT NULL,
	"state" text NOT NULL,
	"password_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_inspector_id_users_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE cascade ON UPDATE no action;