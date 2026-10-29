CREATE TYPE "public"."alasan_putus" AS ENUM('keluar', 'diputus', 'ganti_sandi', 'tautan_baru', 'dinonaktifkan', 'pakai_ulang', 'kedaluwarsa');--> statement-breakpoint
CREATE TYPE "public"."platform_perangkat" AS ENUM('android', 'ios', 'web');--> statement-breakpoint
CREATE TABLE "perangkat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pengguna_id" uuid NOT NULL,
	"kantor_id" uuid NOT NULL,
	"nama" varchar(100),
	"platform" "platform_perangkat",
	"putaran" integer DEFAULT 1 NOT NULL,
	"kedaluwarsa_at" timestamp with time zone NOT NULL,
	"terakhir_aktif_at" timestamp with time zone DEFAULT now() NOT NULL,
	"diputus_at" timestamp with time zone,
	"diputus_oleh" uuid,
	"alasan_putus" "alasan_putus",
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "perangkat_putaran_check" CHECK ("perangkat"."putaran" >= 1),
	CONSTRAINT "perangkat_putus_check" CHECK (("perangkat"."diputus_at" IS NULL AND "perangkat"."diputus_oleh" IS NULL AND "perangkat"."alasan_putus" IS NULL)
        OR ("perangkat"."diputus_at" IS NOT NULL AND "perangkat"."alasan_putus" IS NOT NULL
          AND ("perangkat"."alasan_putus" IN ('pakai_ulang', 'kedaluwarsa')) = ("perangkat"."diputus_oleh" IS NULL)))
);
--> statement-breakpoint
CREATE TABLE "tarif_gaji" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"kolektor_id" uuid,
	"tarif_bp" integer,
	"berlaku_mulai" date NOT NULL,
	"dibuat_oleh" uuid NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tarif_gaji_tarif_check" CHECK (("tarif_gaji"."tarif_bp" IS NULL AND "tarif_gaji"."kolektor_id" IS NOT NULL)
        OR ("tarif_gaji"."tarif_bp" IS NOT NULL AND "tarif_gaji"."tarif_bp" BETWEEN 0 AND 10000))
);
--> statement-breakpoint
ALTER TABLE "perangkat" ADD CONSTRAINT "perangkat_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perangkat" ADD CONSTRAINT "perangkat_pengguna_fk" FOREIGN KEY ("pengguna_id","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perangkat" ADD CONSTRAINT "perangkat_diputus_oleh_fk" FOREIGN KEY ("diputus_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarif_gaji" ADD CONSTRAINT "tarif_gaji_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarif_gaji" ADD CONSTRAINT "tarif_gaji_kolektor_fk" FOREIGN KEY ("kolektor_id","kantor_id") REFERENCES "public"."pengguna"("id","kolektor_kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarif_gaji" ADD CONSTRAINT "tarif_gaji_dibuat_oleh_fk" FOREIGN KEY ("dibuat_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_perangkat_pengguna_aktif" ON "perangkat" USING btree ("pengguna_id") WHERE "perangkat"."diputus_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_perangkat_kantor_aktif" ON "perangkat" USING btree ("kantor_id") WHERE "perangkat"."diputus_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tarif_gaji_kantor" ON "tarif_gaji" USING btree ("kantor_id","berlaku_mulai") WHERE "tarif_gaji"."kolektor_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tarif_gaji_kolektor" ON "tarif_gaji" USING btree ("kolektor_id","berlaku_mulai") WHERE "tarif_gaji"."kolektor_id" IS NOT NULL;