CREATE TABLE IF NOT EXISTS "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_thought_id" uuid NOT NULL,
	"to_thought_id" uuid NOT NULL,
	"similarity" real NOT NULL,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "thoughts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "connections" ADD CONSTRAINT "connections_from_thought_id_thoughts_id_fk" FOREIGN KEY ("from_thought_id") REFERENCES "public"."thoughts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "connections" ADD CONSTRAINT "connections_to_thought_id_thoughts_id_fk" FOREIGN KEY ("to_thought_id") REFERENCES "public"."thoughts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "thoughts" ADD CONSTRAINT "thoughts_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "connections_from_idx" ON "connections" USING btree ("from_thought_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "connections_to_idx" ON "connections" USING btree ("to_thought_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "connections_pair_uq" ON "connections" USING btree ("from_thought_id","to_thought_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "thoughts_thread_idx" ON "thoughts" USING btree ("thread_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "thoughts_thread_ordinal_uq" ON "thoughts" USING btree ("thread_id","ordinal");