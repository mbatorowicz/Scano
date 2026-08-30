CREATE TABLE "settlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"settled_on" date NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "settlements_settled_on_idx" ON "settlements" USING btree ("settled_on");