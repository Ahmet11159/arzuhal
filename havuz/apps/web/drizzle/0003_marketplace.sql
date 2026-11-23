CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"number" text NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"amount" integer NOT NULL,
	"file_name" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"file_data" text NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_items" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"order_item_id" text,
	"supplier_id" text,
	"price" integer NOT NULL,
	"sub_merchant_key" text,
	"sub_merchant_price" integer,
	"provider_txn_id" text,
	"refunded_amount" integer DEFAULT 0 NOT NULL,
	"approved_at" timestamp with time zone,
	"approval_error" text,
	"approval_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_item_id" text NOT NULL,
	"payment_id" text NOT NULL,
	"org_id" text NOT NULL,
	"order_id" text,
	"order_item_id" text,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_refund_id" text,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "consent_version" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "released_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "charge_amount" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "issue_deduction" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "commission_amount" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "commission_vat" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "supplier_share" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "financing_bps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "sub_merchant_type" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "legal_title" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "tax_office" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "identity_number" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "sub_merchant_key" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "sub_merchant_error" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "sub_merchant_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "commission_vat" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "channel" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_supplier_id_organizations_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_supplier_id_organizations_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_item_id_payment_items_id_fk" FOREIGN KEY ("payment_item_id") REFERENCES "public"."payment_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_order_supplier_uq" ON "invoices" USING btree ("order_id","supplier_id");--> statement-breakpoint
CREATE INDEX "invoice_supplier_idx" ON "invoices" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "payment_item_payment_idx" ON "payment_items" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_item_order_item_idx" ON "payment_items" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "refund_status_idx" ON "refunds" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "refund_org_idx" ON "refunds" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "refund_order_idx" ON "refunds" USING btree ("order_id");--> statement-breakpoint
UPDATE "orders" SET "financing_bps" = CASE WHEN ("subtotal" + "vat" - "credit_applied") > 0 THEN round("financing_fee" * 10000.0 / ("subtotal" + "vat" - "credit_applied")) ELSE 0 END WHERE "financing_fee" > 0;--> statement-breakpoint
UPDATE "order_items" SET "released_at" = "delivered_at" WHERE "settlement_id" IS NOT NULL AND "released_at" IS NULL;
