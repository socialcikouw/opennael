CREATE TABLE "operasi_idempoten" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"pengguna_id" uuid NOT NULL,
	"kunci" uuid NOT NULL,
	"operasi" varchar(120) NOT NULL,
	"sidik_isi" varchar(64) NOT NULL,
	"hasil" jsonb NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_operasi_idempoten_pelaku_kunci" UNIQUE("kantor_id","pengguna_id","kunci"),
	CONSTRAINT "operasi_idempoten_operasi_check" CHECK (length(trim("operasi_idempoten"."operasi")) > 0),
	CONSTRAINT "operasi_idempoten_sidik_isi_check" CHECK ("operasi_idempoten"."sidik_isi" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "operasi_idempoten" ADD CONSTRAINT "operasi_idempoten_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operasi_idempoten" ADD CONSTRAINT "operasi_idempoten_pengguna_kantor_fk" FOREIGN KEY ("pengguna_id","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;