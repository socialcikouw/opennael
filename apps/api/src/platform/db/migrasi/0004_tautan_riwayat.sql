CREATE TYPE "public"."tabel_berjejak" AS ENUM('kantor', 'pekan_kerja', 'buku_kas', 'kebijakan', 'pengguna', 'wilayah', 'nasabah', 'pinjaman', 'hari_kolektor', 'libur_nasabah', 'libur_kantor', 'tarif_gaji', 'rute_kolektor', 'transaksi', 'biaya_tak_terduga', 'kebijakan_kantor', 'kebijakan_kolektor', 'perangkat');--> statement-breakpoint
CREATE TABLE "riwayat_perubahan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"tabel" "tabel_berjejak" NOT NULL,
	"baris_id" uuid NOT NULL,
	"aksi" varchar(40) NOT NULL,
	"sebelum" jsonb,
	"sesudah" jsonb,
	"alasan_perubahan" varchar(200),
	"pelaku_id" uuid NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "riwayat_perubahan_aksi_check" CHECK ("riwayat_perubahan"."aksi" ~ '^[a-z_]+$'),
	CONSTRAINT "riwayat_perubahan_isi_check" CHECK ("riwayat_perubahan"."sebelum" IS NOT NULL OR "riwayat_perubahan"."sesudah" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "tautan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kode" varchar(8) NOT NULL,
	"hash_klaim" varchar(64) NOT NULL,
	"nama" varchar(100),
	"platform" "platform_perangkat",
	"kedaluwarsa_at" timestamp with time zone NOT NULL,
	"kantor_id" uuid,
	"pengguna_id" uuid,
	"disetujui_at" timestamp with time zone,
	"disetujui_oleh" uuid,
	"perangkat_id" uuid,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_tautan_kode" UNIQUE("kode"),
	CONSTRAINT "tautan_setuju_check" CHECK (("tautan"."kantor_id" IS NULL AND "tautan"."pengguna_id" IS NULL AND "tautan"."disetujui_at" IS NULL AND "tautan"."disetujui_oleh" IS NULL)
        OR ("tautan"."kantor_id" IS NOT NULL AND "tautan"."pengguna_id" IS NOT NULL AND "tautan"."disetujui_at" IS NOT NULL AND "tautan"."disetujui_oleh" IS NOT NULL)),
	CONSTRAINT "tautan_pakai_check" CHECK ("tautan"."perangkat_id" IS NULL OR "tautan"."disetujui_at" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "riwayat_perubahan" ADD CONSTRAINT "riwayat_perubahan_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riwayat_perubahan" ADD CONSTRAINT "riwayat_perubahan_pelaku_fk" FOREIGN KEY ("pelaku_id","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tautan" ADD CONSTRAINT "tautan_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tautan" ADD CONSTRAINT "tautan_pengguna_fk" FOREIGN KEY ("pengguna_id","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tautan" ADD CONSTRAINT "tautan_disetujui_oleh_fk" FOREIGN KEY ("disetujui_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tautan" ADD CONSTRAINT "tautan_perangkat_fk" FOREIGN KEY ("perangkat_id") REFERENCES "public"."perangkat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_riwayat_perubahan_baris" ON "riwayat_perubahan" USING btree ("tabel","baris_id","dibuat_at");--> statement-breakpoint
CREATE INDEX "idx_riwayat_perubahan_kantor" ON "riwayat_perubahan" USING btree ("kantor_id","dibuat_at");--> statement-breakpoint
CREATE INDEX "idx_riwayat_perubahan_pelaku" ON "riwayat_perubahan" USING btree ("pelaku_id","dibuat_at");--> statement-breakpoint
CREATE INDEX "idx_tautan_kedaluwarsa" ON "tautan" USING btree ("kedaluwarsa_at");