ALTER TABLE "invoices" ADD COLUMN "cost_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payout_amount" numeric(12, 2);--> statement-breakpoint
UPDATE "invoices" SET "payout_amount" = round(("gross_amount" - "cost_amount") / 1.4637, 2);--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "payout_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN "fee_rate";--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN "fee_amount";--> statement-breakpoint
DROP TABLE "settings" CASCADE;
