CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"issue_date" date NOT NULL,
	"seller_name" text NOT NULL,
	"seller_nip" text,
	"buyer_name" text NOT NULL,
	"buyer_nip" text,
	"gross_amount" numeric(12, 2) NOT NULL,
	"net_amount" numeric(12, 2),
	"vat_amount" numeric(12, 2),
	"fee_rate" numeric(5, 2) NOT NULL,
	"fee_amount" numeric(12, 2) NOT NULL,
	"image_pathname" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"fee_rate" numeric(5, 2) DEFAULT '5.00' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
CREATE INDEX "invoices_issue_date_idx" ON "invoices" USING btree ("issue_date");--> statement-breakpoint
CREATE INDEX "invoices_number_seller_idx" ON "invoices" USING btree ("invoice_number","seller_name");