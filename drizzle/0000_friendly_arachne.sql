CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"receipt_id" text
);
--> statement-breakpoint
CREATE TABLE "item_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_id" text NOT NULL,
	"product_id" integer,
	"name_in_receipt" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"quantity" numeric(8, 3) DEFAULT '1' NOT NULL,
	"unit_price" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "product_classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"icon" text,
	CONSTRAINT "product_classes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"item_name" text NOT NULL,
	"brand" text,
	"size" text,
	"unit" text,
	"supermarket" text,
	"is_own_brand" boolean DEFAULT false NOT NULL,
	"base_price" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_to_product" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name_in_receipt" text NOT NULL,
	"supermarket_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"shop_id" integer NOT NULL,
	"purchased_at" timestamp with time zone NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"ocr_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_name" text NOT NULL,
	"supermarket_name" text NOT NULL,
	"brand" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"address" text,
	"city" text NOT NULL,
	"region" text NOT NULL,
	"postcode" text,
	"osm_id" text,
	"osm_type" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_prices" ADD CONSTRAINT "item_prices_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_prices" ADD CONSTRAINT "item_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_prices" ADD CONSTRAINT "item_prices_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_purchases" ADD CONSTRAINT "item_purchases_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_purchases" ADD CONSTRAINT "item_purchases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_class_id_product_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."product_classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_to_product" ADD CONSTRAINT "receipt_to_product_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "item_prices_shop_product_idx" ON "item_prices" USING btree ("shop_id","product_id");--> statement-breakpoint
CREATE INDEX "item_prices_product_idx" ON "item_prices" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "item_purchases_receipt_idx" ON "item_purchases" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "item_purchases_product_idx" ON "item_purchases" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_class_id_idx" ON "products" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "products_item_name_idx" ON "products" USING btree ("item_name");--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_alias_unique_idx" ON "receipt_to_product" USING btree ("supermarket_name","name_in_receipt");--> statement-breakpoint
CREATE INDEX "receipt_alias_product_idx" ON "receipt_to_product" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "receipts_user_date_idx" ON "receipts" USING btree ("user_id","purchased_at");--> statement-breakpoint
CREATE INDEX "receipts_shop_idx" ON "receipts" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shops_supermarket_idx" ON "shops" USING btree ("supermarket_name");--> statement-breakpoint
CREATE INDEX "shops_region_idx" ON "shops" USING btree ("region");--> statement-breakpoint
CREATE INDEX "shops_coords_idx" ON "shops" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");