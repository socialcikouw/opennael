CREATE TABLE "pembayaran_gaji" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"kolektor_id" uuid NOT NULL,
	"periode_mulai" date NOT NULL,
	"periode_selesai" date NOT NULL,
	"gaji_kotor" bigint NOT NULL,
	"potongan_tekor" bigint NOT NULL,
	"gaji_bersih" bigint GENERATED ALWAYS AS (gaji_kotor - potongan_tekor) STORED NOT NULL,
	"dari_akun" "akun_kas" NOT NULL,
	"tanggal_bayar" date NOT NULL,
	"keterangan" varchar(200),
	"dibuat_oleh" uuid NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dibatalkan_at" timestamp with time zone,
	"dibatalkan_oleh" uuid,
	"alasan_batal" varchar(100),
	CONSTRAINT "pembayaran_gaji_periode_check" CHECK ("pembayaran_gaji"."periode_mulai" <= "pembayaran_gaji"."periode_selesai" AND "pembayaran_gaji"."periode_selesai" < "pembayaran_gaji"."tanggal_bayar"),
	CONSTRAINT "pembayaran_gaji_nominal_check" CHECK ("pembayaran_gaji"."gaji_kotor" >= 0 AND "pembayaran_gaji"."potongan_tekor" >= 0 AND "pembayaran_gaji"."potongan_tekor" <= "pembayaran_gaji"."gaji_kotor"),
	CONSTRAINT "pembayaran_gaji_batal_check" CHECK (("pembayaran_gaji"."dibatalkan_at" IS NULL AND "pembayaran_gaji"."dibatalkan_oleh" IS NULL AND "pembayaran_gaji"."alasan_batal" IS NULL)
        OR ("pembayaran_gaji"."dibatalkan_at" IS NOT NULL AND "pembayaran_gaji"."dibatalkan_oleh" IS NOT NULL AND "pembayaran_gaji"."alasan_batal" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "pembayaran_gaji" ADD CONSTRAINT "pembayaran_gaji_kolektor_fk" FOREIGN KEY ("kolektor_id","kantor_id") REFERENCES "public"."pengguna"("id","kolektor_kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran_gaji" ADD CONSTRAINT "pembayaran_gaji_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."buku_kas"("kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran_gaji" ADD CONSTRAINT "pembayaran_gaji_dibuat_oleh_fk" FOREIGN KEY ("dibuat_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran_gaji" ADD CONSTRAINT "pembayaran_gaji_dibatalkan_oleh_fk" FOREIGN KEY ("dibatalkan_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pembayaran_gaji_kolektor" ON "pembayaran_gaji" USING btree ("kolektor_id","periode_mulai");--> statement-breakpoint
CREATE INDEX "idx_pembayaran_gaji_kantor_tanggal" ON "pembayaran_gaji" USING btree ("kantor_id","tanggal_bayar");