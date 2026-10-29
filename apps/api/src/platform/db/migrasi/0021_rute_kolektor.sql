CREATE TABLE "rute_kolektor" (
	"kolektor_id" uuid PRIMARY KEY NOT NULL,
	"kantor_id" uuid NOT NULL,
	"versi" integer DEFAULT 1 NOT NULL,
	"diubah_oleh" uuid,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_rute_kolektor_kolektor_kantor" UNIQUE("kolektor_id","kantor_id"),
	CONSTRAINT "rute_kolektor_versi_check" CHECK ("rute_kolektor"."versi" >= 1)
);
--> statement-breakpoint
CREATE TABLE "rute_wilayah" (
	"kolektor_id" uuid NOT NULL,
	"kantor_id" uuid NOT NULL,
	"wilayah_id" uuid NOT NULL,
	"urutan" smallint NOT NULL,
	CONSTRAINT "rute_wilayah_pkey" PRIMARY KEY("kolektor_id","wilayah_id"),
	CONSTRAINT "uniq_rute_wilayah_urutan" UNIQUE("kolektor_id","urutan"),
	CONSTRAINT "rute_wilayah_urutan_check" CHECK ("rute_wilayah"."urutan" >= 1)
);
--> statement-breakpoint
ALTER TABLE "rute_kolektor" ADD CONSTRAINT "rute_kolektor_kolektor_fk" FOREIGN KEY ("kolektor_id","kantor_id") REFERENCES "public"."pengguna"("id","kolektor_kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rute_kolektor" ADD CONSTRAINT "rute_kolektor_diubah_oleh_fk" FOREIGN KEY ("diubah_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rute_wilayah" ADD CONSTRAINT "rute_wilayah_rute_fk" FOREIGN KEY ("kolektor_id","kantor_id") REFERENCES "public"."rute_kolektor"("kolektor_id","kantor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rute_wilayah" ADD CONSTRAINT "rute_wilayah_wilayah_fk" FOREIGN KEY ("wilayah_id","kantor_id") REFERENCES "public"."wilayah"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_rute_wilayah_wilayah" ON "rute_wilayah" USING btree ("wilayah_id");