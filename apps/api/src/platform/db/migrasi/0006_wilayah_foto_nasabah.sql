CREATE TYPE "public"."jenis_foto" AS ENUM('serah_terima', 'ktp');--> statement-breakpoint
CREATE TABLE "foto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"jenis" "jenis_foto" NOT NULL,
	"kunci_berkas" varchar(200) NOT NULL,
	"sha256" char(64) NOT NULL,
	"ukuran_byte" integer NOT NULL,
	"tipe_mime" varchar(20) NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"akurasi_meter" smallint,
	"diambil_at" timestamp with time zone,
	"diunggah_oleh" uuid NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_foto_id_kantor" UNIQUE("id","kantor_id"),
	CONSTRAINT "uniq_foto_kantor_sha256" UNIQUE("kantor_id","sha256"),
	CONSTRAINT "foto_ukuran_check" CHECK ("foto"."ukuran_byte" > 0 AND "foto"."ukuran_byte" <= 2000000),
	CONSTRAINT "foto_sha256_check" CHECK ("foto"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "foto_lokasi_check" CHECK (("foto"."latitude" IS NULL AND "foto"."longitude" IS NULL AND "foto"."akurasi_meter" IS NULL)
    OR ("foto"."latitude" IS NOT NULL AND "foto"."longitude" IS NOT NULL AND "foto"."akurasi_meter" IS NOT NULL
      AND "foto"."latitude" BETWEEN -11 AND 6 AND "foto"."longitude" BETWEEN 95 AND 141
      AND "foto"."akurasi_meter" > 0))
);
--> statement-breakpoint
CREATE TABLE "nasabah" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"kolektor_id" uuid NOT NULL,
	"nama" varchar(50) NOT NULL,
	"wilayah_id" uuid NOT NULL,
	"nomor_hp" varchar(16),
	"nik" varchar(16),
	"latitude" double precision,
	"longitude" double precision,
	"akurasi_meter" smallint,
	"saldo_tabungan" bigint DEFAULT 0 NOT NULL,
	"foto_ktp_id" uuid,
	"diblokir_at" timestamp with time zone,
	"diblokir_oleh" uuid,
	"alasan_blokir" varchar(200),
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_nasabah_id_kantor" UNIQUE("id","kantor_id"),
	CONSTRAINT "nasabah_saldo_tabungan_check" CHECK ("nasabah"."saldo_tabungan" >= 0),
	CONSTRAINT "nasabah_nik_check" CHECK ("nasabah"."nik" IS NULL OR "nasabah"."nik" ~ '^[0-9]{16}$'),
	CONSTRAINT "nasabah_nomor_hp_check" CHECK ("nasabah"."nomor_hp" IS NULL OR "nasabah"."nomor_hp" ~ '^\+[0-9]{8,15}$'),
	CONSTRAINT "nasabah_lokasi_check" CHECK (("nasabah"."latitude" IS NULL AND "nasabah"."longitude" IS NULL AND "nasabah"."akurasi_meter" IS NULL)
    OR ("nasabah"."latitude" IS NOT NULL AND "nasabah"."longitude" IS NOT NULL AND "nasabah"."akurasi_meter" IS NOT NULL
      AND "nasabah"."latitude" BETWEEN -11 AND 6 AND "nasabah"."longitude" BETWEEN 95 AND 141
      AND "nasabah"."akurasi_meter" > 0)),
	CONSTRAINT "nasabah_blokir_check" CHECK (("nasabah"."diblokir_at" IS NULL AND "nasabah"."diblokir_oleh" IS NULL AND "nasabah"."alasan_blokir" IS NULL)
        OR ("nasabah"."diblokir_at" IS NOT NULL AND "nasabah"."diblokir_oleh" IS NOT NULL AND "nasabah"."alasan_blokir" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "wilayah" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"nama" varchar(50) NOT NULL,
	"kunci" text GENERATED ALWAYS AS (lower(btrim(regexp_replace(nama, '\s+', ' ', 'g')))) STORED NOT NULL,
	"dibuat_oleh" uuid NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_wilayah_kantor_kunci" UNIQUE("kantor_id","kunci"),
	CONSTRAINT "uniq_wilayah_id_kantor" UNIQUE("id","kantor_id"),
	CONSTRAINT "wilayah_nama_check" CHECK ("wilayah"."nama" <> '' AND "wilayah"."nama" = btrim(regexp_replace("wilayah"."nama", '\s+', ' ', 'g')))
);
--> statement-breakpoint
ALTER TABLE "foto" ADD CONSTRAINT "foto_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foto" ADD CONSTRAINT "foto_diunggah_oleh_fk" FOREIGN KEY ("diunggah_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nasabah" ADD CONSTRAINT "nasabah_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nasabah" ADD CONSTRAINT "nasabah_kolektor_fk" FOREIGN KEY ("kolektor_id","kantor_id") REFERENCES "public"."pengguna"("id","kolektor_kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nasabah" ADD CONSTRAINT "nasabah_wilayah_fk" FOREIGN KEY ("wilayah_id","kantor_id") REFERENCES "public"."wilayah"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nasabah" ADD CONSTRAINT "nasabah_diblokir_oleh_fk" FOREIGN KEY ("diblokir_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nasabah" ADD CONSTRAINT "nasabah_foto_ktp_fk" FOREIGN KEY ("foto_ktp_id","kantor_id") REFERENCES "public"."foto"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wilayah" ADD CONSTRAINT "wilayah_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wilayah" ADD CONSTRAINT "wilayah_dibuat_oleh_fk" FOREIGN KEY ("dibuat_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_foto_dibuat" ON "foto" USING btree ("dibuat_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_nasabah_kantor_nik" ON "nasabah" USING btree ("kantor_id","nik") WHERE "nasabah"."nik" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_nasabah_kolektor_nama" ON "nasabah" USING btree ("kolektor_id","nama");--> statement-breakpoint
CREATE INDEX "idx_nasabah_kantor_nama" ON "nasabah" USING btree ("kantor_id","nama");--> statement-breakpoint
CREATE INDEX "idx_nasabah_wilayah" ON "nasabah" USING btree ("wilayah_id");--> statement-breakpoint
CREATE INDEX "idx_nasabah_kunci_nama" ON "nasabah" USING btree ("kantor_id","wilayah_id",lower(btrim(regexp_replace("nama", '\s+', ' ', 'g'))));