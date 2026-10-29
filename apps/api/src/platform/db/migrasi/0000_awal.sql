CREATE TYPE "public"."peran_pengguna" AS ENUM('bos', 'kasir', 'pengawas', 'kolektor');--> statement-breakpoint
CREATE TYPE "public"."zona_waktu" AS ENUM('WIB', 'WITA', 'WIT');--> statement-breakpoint
CREATE TABLE "kantor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" varchar(100) NOT NULL,
	"zona_waktu" "zona_waktu" DEFAULT 'WIB' NOT NULL,
	"jam_buka" time DEFAULT '07:00' NOT NULL,
	"jam_tutup" time DEFAULT '24:00' NOT NULL,
	"tanggal_tutup_terakhir" date,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kantor_jam_check" CHECK ("kantor"."jam_buka" < "kantor"."jam_tutup")
);
--> statement-breakpoint
CREATE TABLE "pekan_kerja" (
	"kantor_id" uuid NOT NULL,
	"berlaku_mulai" date NOT NULL,
	"hari_kerja" smallint NOT NULL,
	"dibuat_oleh" uuid NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pekan_kerja_pkey" PRIMARY KEY("kantor_id","berlaku_mulai"),
	CONSTRAINT "pekan_kerja_hari_check" CHECK ("pekan_kerja"."hari_kerja" BETWEEN 1 AND 127)
);
--> statement-breakpoint
CREATE TABLE "pengguna" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"peran" "peran_pengguna" NOT NULL,
	"nama" varchar(50) NOT NULL,
	"nomor_hp" varchar(16),
	"hash_sandi" varchar(255),
	"resort" varchar(50),
	"kolektor_kantor_id" uuid GENERATED ALWAYS AS (CASE WHEN peran = 'kolektor' THEN kantor_id END) STORED,
	"dinonaktifkan_at" timestamp with time zone,
	"dinonaktifkan_oleh" uuid,
	"alasan_nonaktif" varchar(200),
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_pengguna_id_kantor" UNIQUE("id","kantor_id"),
	CONSTRAINT "uniq_pengguna_id_kolektor_kantor" UNIQUE("id","kolektor_kantor_id"),
	CONSTRAINT "pengguna_peran_check" CHECK (("pengguna"."peran" = 'bos' AND "pengguna"."nomor_hp" IS NOT NULL AND "pengguna"."hash_sandi" IS NOT NULL)
        OR ("pengguna"."peran" <> 'bos' AND "pengguna"."hash_sandi" IS NULL)),
	CONSTRAINT "pengguna_resort_check" CHECK ("pengguna"."resort" IS NULL OR "pengguna"."peran" = 'kolektor'),
	CONSTRAINT "pengguna_nomor_hp_check" CHECK ("pengguna"."nomor_hp" IS NULL OR "pengguna"."nomor_hp" ~ '^\+[0-9]{8,15}$'),
	CONSTRAINT "pengguna_nonaktif_check" CHECK (("pengguna"."dinonaktifkan_at" IS NULL AND "pengguna"."dinonaktifkan_oleh" IS NULL AND "pengguna"."alasan_nonaktif" IS NULL)
        OR ("pengguna"."dinonaktifkan_at" IS NOT NULL AND "pengguna"."dinonaktifkan_oleh" IS NOT NULL AND "pengguna"."alasan_nonaktif" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "pekan_kerja" ADD CONSTRAINT "pekan_kerja_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pekan_kerja" ADD CONSTRAINT "pekan_kerja_dibuat_oleh_fk" FOREIGN KEY ("dibuat_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengguna" ADD CONSTRAINT "pengguna_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengguna" ADD CONSTRAINT "pengguna_dinonaktifkan_oleh_fk" FOREIGN KEY ("dinonaktifkan_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_pengguna_bos_kantor" ON "pengguna" USING btree ("kantor_id") WHERE "pengguna"."peran" = 'bos' AND "pengguna"."dinonaktifkan_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_pengguna_nomor_hp_bos" ON "pengguna" USING btree ("nomor_hp") WHERE "pengguna"."peran" = 'bos' AND "pengguna"."dinonaktifkan_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_pengguna_kantor_peran" ON "pengguna" USING btree ("kantor_id","peran");