CREATE TABLE "posisi_harian" (
	"kantor_id" uuid NOT NULL,
	"kolektor_id" uuid NOT NULL,
	"tanggal" date NOT NULL,
	"jenis" "jenis_pinjaman" NOT NULL,
	"jumlah_berjalan" integer DEFAULT 0 NOT NULL,
	"jumlah_macet" integer DEFAULT 0 NOT NULL,
	"saldo_berjalan" bigint DEFAULT 0 NOT NULL,
	"saldo_macet" bigint DEFAULT 0 NOT NULL,
	"angsuran_berjalan" bigint DEFAULT 0 NOT NULL,
	"angsuran_macet" bigint DEFAULT 0 NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posisi_harian_pkey" PRIMARY KEY("kolektor_id","tanggal","jenis"),
	CONSTRAINT "posisi_harian_nominal_check" CHECK ("posisi_harian"."jumlah_berjalan" >= 0 AND "posisi_harian"."jumlah_macet" >= 0
        AND "posisi_harian"."saldo_berjalan" >= 0 AND "posisi_harian"."saldo_macet" >= 0
        AND "posisi_harian"."angsuran_berjalan" >= 0 AND "posisi_harian"."angsuran_macet" >= 0)
);
--> statement-breakpoint
ALTER TABLE "posisi_harian" ADD CONSTRAINT "posisi_harian_kolektor_fk" FOREIGN KEY ("kolektor_id","kantor_id") REFERENCES "public"."pengguna"("id","kolektor_kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_posisi_harian_kantor_tanggal" ON "posisi_harian" USING btree ("kantor_id","tanggal");