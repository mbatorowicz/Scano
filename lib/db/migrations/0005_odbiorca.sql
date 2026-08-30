ALTER TABLE "invoices" ADD COLUMN "recipient_id" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_recipient_id_contractors_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."contractors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_recipient_id_idx" ON "invoices" USING btree ("recipient_id");