CREATE TYPE "public"."akun_kas" AS ENUM('tunai', 'bank');--> statement-breakpoint
CREATE TYPE "public"."jenis_mutasi_kas" AS ENUM('setor_modal', 'tarik_modal', 'biaya_kantor', 'pindah_akun', 'lain_masuk', 'lain_keluar');--> statement-breakpoint
CREATE TABLE "buku_kas" (
	"kantor_id" uuid PRIMARY KEY NOT NULL,
	"tanggal_buka" date NOT NULL,
	"kas_awal_tunai" bigint DEFAULT 0 NOT NULL,
	"kas_awal_bank" bigint DEFAULT 0 NOT NULL,
	"dibuka_oleh" uuid NOT NULL,
	"dibuka_at" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buku_kas_nominal_check" CHECK ("buku_kas"."kas_awal_tunai" >= 0 AND "buku_kas"."kas_awal_bank" >= 0)
);
--> statement-breakpoint
CREATE TABLE "mutasi_kas_kantor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"tanggal" date NOT NULL,
	"jenis" "jenis_mutasi_kas" NOT NULL,
	"dari_akun" "akun_kas",
	"ke_akun" "akun_kas",
	"nominal" bigint NOT NULL,
	"keterangan" varchar(200) NOT NULL,
	"dibuat_oleh" uuid NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dibatalkan_at" timestamp with time zone,
	"dibatalkan_oleh" uuid,
	"alasan_batal" varchar(100),
	CONSTRAINT "mutasi_kas_kantor_nominal_check" CHECK ("mutasi_kas_kantor"."nominal" > 0),
	CONSTRAINT "mutasi_kas_kantor_keterangan_check" CHECK (length(btrim("mutasi_kas_kantor"."keterangan")) > 0),
	CONSTRAINT "mutasi_kas_kantor_akun_check" CHECK (("mutasi_kas_kantor"."jenis"::text IN ('setor_modal', 'lain_masuk')
          AND "mutasi_kas_kantor"."ke_akun" IS NOT NULL AND "mutasi_kas_kantor"."dari_akun" IS NULL)
        OR ("mutasi_kas_kantor"."jenis"::text IN ('tarik_modal', 'biaya_kantor', 'lain_keluar')
          AND "mutasi_kas_kantor"."dari_akun" IS NOT NULL AND "mutasi_kas_kantor"."ke_akun" IS NULL)
        OR ("mutasi_kas_kantor"."jenis"::text = 'pindah_akun'
          AND "mutasi_kas_kantor"."dari_akun" IS NOT NULL AND "mutasi_kas_kantor"."ke_akun" IS NOT NULL AND "mutasi_kas_kantor"."dari_akun" <> "mutasi_kas_kantor"."ke_akun")),
	CONSTRAINT "mutasi_kas_kantor_batal_check" CHECK (("mutasi_kas_kantor"."dibatalkan_at" IS NULL AND "mutasi_kas_kantor"."dibatalkan_oleh" IS NULL AND "mutasi_kas_kantor"."alasan_batal" IS NULL)
    OR ("mutasi_kas_kantor"."dibatalkan_at" IS NOT NULL AND "mutasi_kas_kantor"."dibatalkan_oleh" IS NOT NULL AND "mutasi_kas_kantor"."alasan_batal" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "pencocokan_kas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"tanggal" date NOT NULL,
	"akun" "akun_kas" NOT NULL,
	"saldo_buku" bigint NOT NULL,
	"saldo_nyata" bigint NOT NULL,
	"selisih" bigint GENERATED ALWAYS AS (saldo_nyata - saldo_buku) STORED NOT NULL,
	"keterangan" varchar(200),
	"dicocokkan_oleh" uuid NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dibatalkan_at" timestamp with time zone,
	"dibatalkan_oleh" uuid,
	"alasan_batal" varchar(100),
	CONSTRAINT "pencocokan_kas_nominal_check" CHECK ("pencocokan_kas"."saldo_nyata" >= 0),
	CONSTRAINT "pencocokan_kas_keterangan_check" CHECK ("pencocokan_kas"."saldo_nyata" = "pencocokan_kas"."saldo_buku"
        OR ("pencocokan_kas"."keterangan" IS NOT NULL AND length(btrim("pencocokan_kas"."keterangan")) > 0)),
	CONSTRAINT "pencocokan_kas_batal_check" CHECK (("pencocokan_kas"."dibatalkan_at" IS NULL AND "pencocokan_kas"."dibatalkan_oleh" IS NULL AND "pencocokan_kas"."alasan_batal" IS NULL)
    OR ("pencocokan_kas"."dibatalkan_at" IS NOT NULL AND "pencocokan_kas"."dibatalkan_oleh" IS NOT NULL AND "pencocokan_kas"."alasan_batal" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "koreksi_tabungan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"nasabah_id" uuid NOT NULL,
	"tanggal" date NOT NULL,
	"saldo_sebelum" bigint NOT NULL,
	"selisih" bigint NOT NULL,
	"alasan_koreksi" varchar(200) NOT NULL,
	"dibuat_oleh" uuid NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "koreksi_tabungan_nominal_check" CHECK ("koreksi_tabungan"."selisih" <> 0 AND "koreksi_tabungan"."saldo_sebelum" >= 0 AND "koreksi_tabungan"."saldo_sebelum" + "koreksi_tabungan"."selisih" >= 0),
	CONSTRAINT "koreksi_tabungan_alasan_check" CHECK (length(btrim("koreksi_tabungan"."alasan_koreksi")) > 0)
);
--> statement-breakpoint
CREATE TABLE "penarikan_tabungan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"nasabah_id" uuid NOT NULL,
	"tanggal" date NOT NULL,
	"nominal" bigint NOT NULL,
	"dari_akun" "akun_kas" NOT NULL,
	"saldo_sebelum" bigint NOT NULL,
	"alasan_penarikan" varchar(200) NOT NULL,
	"dibuat_oleh" uuid NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dibatalkan_at" timestamp with time zone,
	"dibatalkan_oleh" uuid,
	"alasan_batal" varchar(100),
	CONSTRAINT "penarikan_tabungan_nominal_check" CHECK ("penarikan_tabungan"."nominal" > 0 AND "penarikan_tabungan"."nominal" <= "penarikan_tabungan"."saldo_sebelum"),
	CONSTRAINT "penarikan_tabungan_alasan_check" CHECK (length(btrim("penarikan_tabungan"."alasan_penarikan")) > 0),
	CONSTRAINT "penarikan_tabungan_batal_check" CHECK (("penarikan_tabungan"."dibatalkan_at" IS NULL AND "penarikan_tabungan"."dibatalkan_oleh" IS NULL AND "penarikan_tabungan"."alasan_batal" IS NULL)
        OR ("penarikan_tabungan"."dibatalkan_at" IS NOT NULL AND "penarikan_tabungan"."dibatalkan_oleh" IS NOT NULL AND "penarikan_tabungan"."alasan_batal" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "buku_kas" ADD CONSTRAINT "buku_kas_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buku_kas" ADD CONSTRAINT "buku_kas_dibuka_oleh_fk" FOREIGN KEY ("dibuka_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutasi_kas_kantor" ADD CONSTRAINT "mutasi_kas_kantor_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."buku_kas"("kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutasi_kas_kantor" ADD CONSTRAINT "mutasi_kas_kantor_dibuat_oleh_fk" FOREIGN KEY ("dibuat_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutasi_kas_kantor" ADD CONSTRAINT "mutasi_kas_kantor_dibatalkan_oleh_fk" FOREIGN KEY ("dibatalkan_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pencocokan_kas" ADD CONSTRAINT "pencocokan_kas_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."buku_kas"("kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pencocokan_kas" ADD CONSTRAINT "pencocokan_kas_dicocokkan_oleh_fk" FOREIGN KEY ("dicocokkan_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pencocokan_kas" ADD CONSTRAINT "pencocokan_kas_dibatalkan_oleh_fk" FOREIGN KEY ("dibatalkan_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "koreksi_tabungan" ADD CONSTRAINT "koreksi_tabungan_nasabah_fk" FOREIGN KEY ("nasabah_id","kantor_id") REFERENCES "public"."nasabah"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "koreksi_tabungan" ADD CONSTRAINT "koreksi_tabungan_dibuat_oleh_fk" FOREIGN KEY ("dibuat_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penarikan_tabungan" ADD CONSTRAINT "penarikan_tabungan_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."buku_kas"("kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penarikan_tabungan" ADD CONSTRAINT "penarikan_tabungan_nasabah_fk" FOREIGN KEY ("nasabah_id","kantor_id") REFERENCES "public"."nasabah"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penarikan_tabungan" ADD CONSTRAINT "penarikan_tabungan_dibuat_oleh_fk" FOREIGN KEY ("dibuat_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penarikan_tabungan" ADD CONSTRAINT "penarikan_tabungan_dibatalkan_oleh_fk" FOREIGN KEY ("dibatalkan_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mutasi_kas_kantor_kantor_tanggal" ON "mutasi_kas_kantor" USING btree ("kantor_id","tanggal");--> statement-breakpoint
CREATE INDEX "idx_pencocokan_kas_kantor_tanggal" ON "pencocokan_kas" USING btree ("kantor_id","tanggal");--> statement-breakpoint
CREATE INDEX "idx_koreksi_tabungan_nasabah" ON "koreksi_tabungan" USING btree ("nasabah_id","dibuat_at");--> statement-breakpoint
CREATE INDEX "idx_penarikan_tabungan_nasabah" ON "penarikan_tabungan" USING btree ("nasabah_id","dibuat_at");--> statement-breakpoint
CREATE INDEX "idx_penarikan_tabungan_kantor_tanggal" ON "penarikan_tabungan" USING btree ("kantor_id","tanggal");