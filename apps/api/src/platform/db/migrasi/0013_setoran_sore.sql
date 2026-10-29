CREATE TABLE "biaya_tak_terduga" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"kolektor_id" uuid NOT NULL,
	"tanggal" date NOT NULL,
	"nominal" bigint NOT NULL,
	"keterangan" varchar(100) NOT NULL,
	"dibuat_oleh" uuid NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dibatalkan_at" timestamp with time zone,
	"dibatalkan_oleh" uuid,
	"alasan_batal" varchar(100),
	CONSTRAINT "biaya_tak_terduga_nominal_check" CHECK ("biaya_tak_terduga"."nominal" > 0),
	CONSTRAINT "biaya_tak_terduga_keterangan_check" CHECK (length(btrim("biaya_tak_terduga"."keterangan")) > 0),
	CONSTRAINT "biaya_tak_terduga_batal_check" CHECK (("biaya_tak_terduga"."dibatalkan_at" IS NULL AND "biaya_tak_terduga"."dibatalkan_oleh" IS NULL AND "biaya_tak_terduga"."alasan_batal" IS NULL)
        OR ("biaya_tak_terduga"."dibatalkan_at" IS NOT NULL AND "biaya_tak_terduga"."dibatalkan_oleh" IS NOT NULL AND "biaya_tak_terduga"."alasan_batal" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "serah_terima_kas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"hari_kolektor_id" uuid NOT NULL,
	"tunai_seharusnya" bigint NOT NULL,
	"tunai_diterima" bigint NOT NULL,
	"selisih_setor" bigint GENERATED ALWAYS AS (tunai_diterima - tunai_seharusnya) STORED NOT NULL,
	"diterima_oleh" uuid NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dibatalkan_at" timestamp with time zone,
	"dibatalkan_oleh" uuid,
	"alasan_batal" varchar(100),
	CONSTRAINT "serah_terima_kas_nominal_check" CHECK ("serah_terima_kas"."tunai_diterima" >= 0),
	CONSTRAINT "serah_terima_kas_batal_check" CHECK (("serah_terima_kas"."dibatalkan_at" IS NULL AND "serah_terima_kas"."dibatalkan_oleh" IS NULL AND "serah_terima_kas"."alasan_batal" IS NULL)
        OR ("serah_terima_kas"."dibatalkan_at" IS NOT NULL AND "serah_terima_kas"."dibatalkan_oleh" IS NOT NULL AND "serah_terima_kas"."alasan_batal" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "transfer_setoran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"transaksi_id" uuid NOT NULL,
	"nominal" bigint NOT NULL,
	"dibuat_oleh" uuid NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dibatalkan_at" timestamp with time zone,
	"dibatalkan_oleh" uuid,
	"alasan_batal" varchar(100),
	CONSTRAINT "transfer_setoran_nominal_check" CHECK ("transfer_setoran"."nominal" > 0),
	CONSTRAINT "transfer_setoran_batal_check" CHECK (("transfer_setoran"."dibatalkan_at" IS NULL AND "transfer_setoran"."dibatalkan_oleh" IS NULL AND "transfer_setoran"."alasan_batal" IS NULL)
        OR ("transfer_setoran"."dibatalkan_at" IS NOT NULL AND "transfer_setoran"."dibatalkan_oleh" IS NOT NULL AND "transfer_setoran"."alasan_batal" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "biaya_tak_terduga" ADD CONSTRAINT "biaya_tak_terduga_kolektor_fk" FOREIGN KEY ("kolektor_id","kantor_id") REFERENCES "public"."pengguna"("id","kolektor_kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biaya_tak_terduga" ADD CONSTRAINT "biaya_tak_terduga_dibuat_oleh_fk" FOREIGN KEY ("dibuat_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biaya_tak_terduga" ADD CONSTRAINT "biaya_tak_terduga_dibatalkan_oleh_fk" FOREIGN KEY ("dibatalkan_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serah_terima_kas" ADD CONSTRAINT "serah_terima_kas_hari_fk" FOREIGN KEY ("hari_kolektor_id","kantor_id") REFERENCES "public"."hari_kolektor"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serah_terima_kas" ADD CONSTRAINT "serah_terima_kas_diterima_oleh_fk" FOREIGN KEY ("diterima_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serah_terima_kas" ADD CONSTRAINT "serah_terima_kas_dibatalkan_oleh_fk" FOREIGN KEY ("dibatalkan_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_setoran" ADD CONSTRAINT "transfer_setoran_transaksi_fk" FOREIGN KEY ("transaksi_id","kantor_id") REFERENCES "public"."transaksi"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_setoran" ADD CONSTRAINT "transfer_setoran_dibuat_oleh_fk" FOREIGN KEY ("dibuat_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_setoran" ADD CONSTRAINT "transfer_setoran_dibatalkan_oleh_fk" FOREIGN KEY ("dibatalkan_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_biaya_tak_terduga_kolektor_tanggal" ON "biaya_tak_terduga" USING btree ("kolektor_id","tanggal");--> statement-breakpoint
CREATE INDEX "idx_biaya_tak_terduga_kantor_tanggal" ON "biaya_tak_terduga" USING btree ("kantor_id","tanggal");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_serah_terima_kas_hari" ON "serah_terima_kas" USING btree ("hari_kolektor_id") WHERE "serah_terima_kas"."dibatalkan_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_transfer_setoran_transaksi" ON "transfer_setoran" USING btree ("transaksi_id") WHERE "transfer_setoran"."dibatalkan_at" IS NULL;