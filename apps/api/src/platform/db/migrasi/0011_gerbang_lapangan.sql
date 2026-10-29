CREATE TYPE "public"."status_absensi" AS ENUM('masuk_kerja', 'tidak_kerja');--> statement-breakpoint
CREATE TABLE "hari_kolektor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"kolektor_id" uuid NOT NULL,
	"tanggal" date NOT NULL,
	"absensi" "status_absensi" NOT NULL,
	"alasan_tidak_kerja" varchar(100),
	"kas_lapangan" bigint DEFAULT 0 NOT NULL,
	"uang_jalan" bigint DEFAULT 0 NOT NULL,
	"laporan_dibuka_at" timestamp with time zone,
	"transfer_lama" bigint,
	"tekor_lama" bigint,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_hari_kolektor_kolektor_tanggal" UNIQUE("kolektor_id","tanggal"),
	CONSTRAINT "uniq_hari_kolektor_id_kantor" UNIQUE("id","kantor_id"),
	CONSTRAINT "hari_kolektor_absensi_check" CHECK (("hari_kolektor"."absensi" = 'masuk_kerja' AND "hari_kolektor"."alasan_tidak_kerja" IS NULL)
        OR ("hari_kolektor"."absensi" = 'tidak_kerja' AND "hari_kolektor"."alasan_tidak_kerja" IS NOT NULL
          AND "hari_kolektor"."kas_lapangan" = 0 AND "hari_kolektor"."uang_jalan" = 0
          AND "hari_kolektor"."laporan_dibuka_at" IS NULL AND "hari_kolektor"."transfer_lama" IS NULL)),
	CONSTRAINT "hari_kolektor_nominal_check" CHECK ("hari_kolektor"."kas_lapangan" >= 0 AND "hari_kolektor"."uang_jalan" >= 0
        AND ("hari_kolektor"."transfer_lama" IS NULL OR "hari_kolektor"."transfer_lama" >= 0)
        AND ("hari_kolektor"."tekor_lama" IS NULL OR "hari_kolektor"."tekor_lama" > 0))
);
--> statement-breakpoint
CREATE TABLE "kebijakan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"kolektor_id" uuid,
	"nasabah_id" uuid,
	"pinjaman_baru_dikunci" boolean DEFAULT false NOT NULL,
	"naik_pinjaman_dikunci" boolean DEFAULT false NOT NULL,
	"gulung_pinjaman_dikunci" boolean DEFAULT false NOT NULL,
	"alasan_kunci" varchar(100),
	"diubah_oleh" uuid NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kebijakan_sasaran_check" CHECK (num_nonnulls("kebijakan"."kolektor_id", "kebijakan"."nasabah_id") <= 1),
	CONSTRAINT "kebijakan_lapis_nasabah_check" CHECK ("kebijakan"."nasabah_id" IS NULL OR "kebijakan"."pinjaman_baru_dikunci" = false),
	CONSTRAINT "kebijakan_menyala_check" CHECK ("kebijakan"."pinjaman_baru_dikunci" OR "kebijakan"."naik_pinjaman_dikunci" OR "kebijakan"."gulung_pinjaman_dikunci")
);
--> statement-breakpoint
CREATE TABLE "libur_kantor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"tanggal" date NOT NULL,
	"alasan_libur" varchar(100) NOT NULL,
	"dibuat_oleh" uuid NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_libur_kantor_kantor_tanggal" UNIQUE("kantor_id","tanggal"),
	CONSTRAINT "libur_kantor_alasan_check" CHECK (length(btrim("libur_kantor"."alasan_libur")) > 0)
);
--> statement-breakpoint
CREATE TABLE "libur_nasabah" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"pencatat_id" uuid NOT NULL,
	"pinjaman_id" uuid NOT NULL,
	"tanggal" date NOT NULL,
	"alasan_libur" varchar(100),
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_libur_nasabah_pinjaman_tanggal" UNIQUE("pinjaman_id","tanggal")
);
--> statement-breakpoint
ALTER TABLE "hari_kolektor" ADD CONSTRAINT "hari_kolektor_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hari_kolektor" ADD CONSTRAINT "hari_kolektor_kolektor_fk" FOREIGN KEY ("kolektor_id","kantor_id") REFERENCES "public"."pengguna"("id","kolektor_kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kebijakan" ADD CONSTRAINT "kebijakan_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kebijakan" ADD CONSTRAINT "kebijakan_kolektor_fk" FOREIGN KEY ("kolektor_id","kantor_id") REFERENCES "public"."pengguna"("id","kolektor_kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kebijakan" ADD CONSTRAINT "kebijakan_nasabah_fk" FOREIGN KEY ("nasabah_id","kantor_id") REFERENCES "public"."nasabah"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kebijakan" ADD CONSTRAINT "kebijakan_diubah_oleh_fk" FOREIGN KEY ("diubah_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libur_kantor" ADD CONSTRAINT "libur_kantor_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libur_kantor" ADD CONSTRAINT "libur_kantor_dibuat_oleh_fk" FOREIGN KEY ("dibuat_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libur_nasabah" ADD CONSTRAINT "libur_nasabah_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libur_nasabah" ADD CONSTRAINT "libur_nasabah_pencatat_fk" FOREIGN KEY ("pencatat_id","kantor_id") REFERENCES "public"."pengguna"("id","kolektor_kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libur_nasabah" ADD CONSTRAINT "libur_nasabah_pinjaman_fk" FOREIGN KEY ("pinjaman_id","kantor_id") REFERENCES "public"."pinjaman"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_hari_kolektor_kantor_tanggal" ON "hari_kolektor" USING btree ("kantor_id","tanggal");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_kebijakan_kantor" ON "kebijakan" USING btree ("kantor_id") WHERE "kebijakan"."kolektor_id" IS NULL AND "kebijakan"."nasabah_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_kebijakan_kolektor" ON "kebijakan" USING btree ("kolektor_id") WHERE "kebijakan"."kolektor_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_kebijakan_nasabah" ON "kebijakan" USING btree ("nasabah_id") WHERE "kebijakan"."nasabah_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_libur_nasabah_pencatat_tanggal" ON "libur_nasabah" USING btree ("pencatat_id","tanggal");--> statement-breakpoint
CREATE INDEX "idx_libur_nasabah_kantor_tanggal" ON "libur_nasabah" USING btree ("kantor_id","tanggal");