CREATE TABLE "contractors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nip" text,
	"match_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "contractors_match_key_idx" ON "contractors" USING btree ("match_key");--> statement-breakpoint
CREATE INDEX "contractors_name_idx" ON "contractors" USING btree ("name");--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "seller_id" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "buyer_id" integer;--> statement-breakpoint
INSERT INTO "contractors" ("name", "nip", "match_key")
WITH parties AS (
	SELECT
		trim("seller_name") AS name,
		nullif(regexp_replace(coalesce("seller_nip", ''), '\D', '', 'g'), '') AS nip
	FROM "invoices"
	UNION ALL
	SELECT
		trim("buyer_name"),
		nullif(regexp_replace(coalesce("buyer_nip", ''), '\D', '', 'g'), '')
	FROM "invoices"
), keyed AS (
	SELECT
		name,
		nip,
		CASE
			WHEN nip ~ '^\d{10}$' THEN 'nip:' || nip
			ELSE 'name:' || regexp_replace(
				trim(lower(regexp_replace(
					translate(name, 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ', 'acelnoszzACELNOSZZ'),
					'[^a-zA-Z0-9]+', ' ', 'g'
				))),
				'\s+', ' ', 'g'
			)
		END AS match_key
	FROM parties
	WHERE name <> ''
)
SELECT DISTINCT ON (match_key) name, nip, match_key
FROM keyed
ORDER BY match_key, (nip IS NULL), name
ON CONFLICT ("match_key") DO NOTHING;--> statement-breakpoint
UPDATE "invoices" AS i SET "seller_id" = c."id"
FROM "contractors" AS c
WHERE c."match_key" = CASE
	WHEN nullif(regexp_replace(coalesce(i."seller_nip", ''), '\D', '', 'g'), '') ~ '^\d{10}$'
		THEN 'nip:' || regexp_replace(i."seller_nip", '\D', '', 'g')
	ELSE 'name:' || regexp_replace(
		trim(lower(regexp_replace(
			translate(i."seller_name", 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ', 'acelnoszzACELNOSZZ'),
			'[^a-zA-Z0-9]+', ' ', 'g'
		))),
		'\s+', ' ', 'g'
	)
END;--> statement-breakpoint
UPDATE "invoices" AS i SET "buyer_id" = c."id"
FROM "contractors" AS c
WHERE c."match_key" = CASE
	WHEN nullif(regexp_replace(coalesce(i."buyer_nip", ''), '\D', '', 'g'), '') ~ '^\d{10}$'
		THEN 'nip:' || regexp_replace(i."buyer_nip", '\D', '', 'g')
	ELSE 'name:' || regexp_replace(
		trim(lower(regexp_replace(
			translate(i."buyer_name", 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ', 'acelnoszzACELNOSZZ'),
			'[^a-zA-Z0-9]+', ' ', 'g'
		))),
		'\s+', ' ', 'g'
	)
END;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "seller_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "buyer_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_seller_id_contractors_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."contractors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_buyer_id_contractors_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."contractors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
DROP INDEX "invoices_number_seller_idx";--> statement-breakpoint
CREATE INDEX "invoices_number_seller_idx" ON "invoices" USING btree ("invoice_number","seller_id");--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN "seller_name";--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN "seller_nip";--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN "buyer_name";--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN "buyer_nip";
