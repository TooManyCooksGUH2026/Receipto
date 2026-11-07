ALTER TABLE "receipts" ADD COLUMN "subtotal" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "discount_total" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "area" text;