CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"label" text,
	"radius_miles" double precision DEFAULT 5 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;