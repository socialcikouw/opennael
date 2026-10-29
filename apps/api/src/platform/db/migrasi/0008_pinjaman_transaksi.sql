CREATE TYPE "public"."alasan_pemutihan" AS ENUM('macet_lama', 'meninggal', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."asal_pinjaman" AS ENUM('baru', 'gulung', 'migrasi');--> statement-breakpoint
CREATE TYPE "public"."jenis_gulung" AS ENUM('tetap', 'naik', 'turun');--> statement-breakpoint
CREATE TYPE "public"."jenis_pinjaman" AS ENUM('harian', 'mingguan', 'tempoan');--> statement-breakpoint
CREATE TYPE "public"."status_pinjaman" AS ENUM('berjalan', 'macet', 'lunas', 'digulung', 'batal', 'diputihkan');--> statement-breakpoint
CREATE TYPE "public"."jenis_transaksi" AS ENUM('angsuran', 'pelunasan', 'gulung');--> statement-breakpoint
CREATE TABLE "pinjaman" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"pencair_id" uuid NOT NULL,
	"nasabah_id" uuid NOT NULL,
	"pinjaman_ke" integer NOT NULL,
	"jenis" "jenis_pinjaman" NOT NULL,
	"tenor" integer NOT NULL,
	"asal" "asal_pinjaman" NOT NULL,
	"pinjaman_asal_id" uuid,
	"jenis_gulung" "jenis_gulung",
	"dibuat_oleh" uuid NOT NULL,
	"foto_serah_terima_id" uuid,
	"tanggal_akad" date NOT NULL,
	"tanggal_disalin" date,
	"jatuh_tempo" date GENERATED ALWAYS AS (CASE WHEN jenis = 'tempoan' THEN tanggal_akad + tenor END) STORED,
	"tanggal_macet" date,
	"tanggal_selesai" date,
	"pokok" bigint NOT NULL,
	"potongan_admin" bigint NOT NULL,
	"tabungan_masuk" bigint NOT NULL,
	"saldo_lama" bigint DEFAULT 0 NOT NULL,
	"pencairan" bigint NOT NULL,
	"total_kembali" bigint NOT NULL,
	"angsuran" bigint NOT NULL,
	"saldo_awal" bigint NOT NULL,
	"drop_baru" bigint NOT NULL,
	"drop_gulung" bigint DEFAULT 0 NOT NULL,
	"droping" bigint GENERATED ALWAYS AS (drop_baru + drop_gulung) STORED NOT NULL,
	"pokok_berkurang" bigint DEFAULT 0 NOT NULL,
	"status" "status_pinjaman" DEFAULT 'berjalan' NOT NULL,
	"saldo" bigint NOT NULL,
	"angsuran_ke" integer GENERATED ALWAYS AS (((total_kembali - saldo) / angsuran)::integer) STORED NOT NULL,
	"diputihkan_at" timestamp with time zone,
	"diputihkan_oleh" uuid,
	"alasan_pemutihan" "alasan_pemutihan",
	"keterangan_pemutihan" varchar(200),
	"dibatalkan_at" timestamp with time zone,
	"dibatalkan_oleh" uuid,
	"alasan_batal" varchar(100),
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_pinjaman_id_kantor" UNIQUE("id","kantor_id"),
	CONSTRAINT "uniq_pinjaman_id_nasabah" UNIQUE("id","nasabah_id"),
	CONSTRAINT "pinjaman_ke_check" CHECK ("pinjaman"."pinjaman_ke" >= 1),
	CONSTRAINT "pinjaman_pokok_check" CHECK ("pinjaman"."pokok" > 0 AND "pinjaman"."pokok" % 100000 = 0),
	CONSTRAINT "pinjaman_tenor_check" CHECK (("pinjaman"."jenis" = 'harian' AND "pinjaman"."tenor" = 24)
        OR ("pinjaman"."jenis" = 'mingguan' AND "pinjaman"."tenor" IN (6, 8, 10))
        OR ("pinjaman"."jenis" = 'tempoan' AND "pinjaman"."tenor" IN (7, 10, 14))),
	CONSTRAINT "pinjaman_nominal_check" CHECK ("pinjaman"."potongan_admin" >= 0 AND "pinjaman"."tabungan_masuk" >= 0 AND "pinjaman"."saldo_lama" >= 0
        AND "pinjaman"."pencairan" >= 0 AND "pinjaman"."drop_baru" >= 0 AND "pinjaman"."drop_gulung" >= 0
        AND "pinjaman"."pokok_berkurang" >= 0 AND "pinjaman"."total_kembali" >= "pinjaman"."pokok"),
	CONSTRAINT "pinjaman_angsuran_check" CHECK ("pinjaman"."angsuran" > 0 AND (
        ("pinjaman"."jenis" = 'tempoan' AND "pinjaman"."angsuran" = "pinjaman"."total_kembali")
        OR ("pinjaman"."jenis" <> 'tempoan' AND "pinjaman"."angsuran" * "pinjaman"."tenor" = "pinjaman"."total_kembali"))),
	CONSTRAINT "pinjaman_saldo_check" CHECK (0 <= "pinjaman"."saldo" AND "pinjaman"."saldo" <= "pinjaman"."saldo_awal" AND "pinjaman"."saldo_awal" <= "pinjaman"."total_kembali"),
	CONSTRAINT "pinjaman_pencairan_check" CHECK (("pinjaman"."asal" = 'migrasi' AND "pinjaman"."pencairan" = 0 AND "pinjaman"."potongan_admin" = 0
          AND "pinjaman"."drop_baru" = 0 AND "pinjaman"."drop_gulung" = 0)
        OR ("pinjaman"."asal" <> 'migrasi' AND "pinjaman"."saldo_awal" = "pinjaman"."total_kembali" AND "pinjaman"."pencairan" > 0
          AND "pinjaman"."pencairan" = "pinjaman"."pokok" - "pinjaman"."potongan_admin" - "pinjaman"."tabungan_masuk" - "pinjaman"."saldo_lama"
          AND "pinjaman"."drop_baru" + "pinjaman"."drop_gulung" = "pinjaman"."pokok")),
	CONSTRAINT "pinjaman_disalin_check" CHECK (("pinjaman"."asal" = 'migrasi' AND "pinjaman"."tanggal_disalin" IS NOT NULL AND "pinjaman"."tanggal_disalin" >= "pinjaman"."tanggal_akad")
        OR ("pinjaman"."asal" <> 'migrasi' AND "pinjaman"."tanggal_disalin" IS NULL)),
	CONSTRAINT "pinjaman_gulung_check" CHECK (("pinjaman"."asal" = 'gulung' AND "pinjaman"."pinjaman_asal_id" IS NOT NULL AND "pinjaman"."jenis_gulung" IS NOT NULL)
        OR ("pinjaman"."asal" <> 'gulung' AND "pinjaman"."pinjaman_asal_id" IS NULL AND "pinjaman"."jenis_gulung" IS NULL
          AND "pinjaman"."saldo_lama" = 0 AND "pinjaman"."drop_gulung" = 0 AND "pinjaman"."pokok_berkurang" = 0)),
	CONSTRAINT "pinjaman_status_check" CHECK (("pinjaman"."status" IN ('berjalan', 'macet') AND "pinjaman"."saldo" > 0 AND "pinjaman"."tanggal_selesai" IS NULL)
        OR ("pinjaman"."status" IN ('lunas', 'digulung') AND "pinjaman"."saldo" = 0 AND "pinjaman"."tanggal_selesai" IS NOT NULL)
        OR ("pinjaman"."status" = 'batal' AND "pinjaman"."tanggal_selesai" IS NOT NULL)
        OR ("pinjaman"."status" = 'diputihkan' AND "pinjaman"."saldo" > 0 AND "pinjaman"."tanggal_selesai" IS NOT NULL)),
	CONSTRAINT "pinjaman_macet_check" CHECK (("pinjaman"."status" = 'macet' AND "pinjaman"."tanggal_macet" IS NOT NULL)
        OR ("pinjaman"."status" <> 'macet' AND ("pinjaman"."tanggal_macet" IS NULL OR "pinjaman"."status" = 'diputihkan'))),
	CONSTRAINT "pinjaman_pemutihan_check" CHECK (("pinjaman"."status" = 'diputihkan' AND "pinjaman"."diputihkan_at" IS NOT NULL AND "pinjaman"."diputihkan_oleh" IS NOT NULL
          AND "pinjaman"."alasan_pemutihan" IS NOT NULL AND "pinjaman"."keterangan_pemutihan" IS NOT NULL)
        OR ("pinjaman"."status" <> 'diputihkan' AND "pinjaman"."diputihkan_at" IS NULL AND "pinjaman"."diputihkan_oleh" IS NULL
          AND "pinjaman"."alasan_pemutihan" IS NULL AND "pinjaman"."keterangan_pemutihan" IS NULL)),
	CONSTRAINT "pinjaman_batal_check" CHECK (("pinjaman"."status" = 'batal' AND "pinjaman"."dibatalkan_at" IS NOT NULL AND "pinjaman"."dibatalkan_oleh" IS NOT NULL
          AND "pinjaman"."alasan_batal" IS NOT NULL)
        OR ("pinjaman"."status" <> 'batal' AND "pinjaman"."dibatalkan_at" IS NULL AND "pinjaman"."dibatalkan_oleh" IS NULL
          AND "pinjaman"."alasan_batal" IS NULL)),
	CONSTRAINT "pinjaman_foto_check" CHECK ("pinjaman"."asal" = 'migrasi' OR "pinjaman"."foto_serah_terima_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "riwayat_status_pinjaman" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"pinjaman_id" uuid NOT NULL,
	"status_sebelum" "status_pinjaman",
	"status_sesudah" "status_pinjaman" NOT NULL,
	"tanggal" date NOT NULL,
	"dibuat_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "riwayat_status_pinjaman_urutan_check" CHECK (("riwayat_status_pinjaman"."status_sebelum" IS NULL AND "riwayat_status_pinjaman"."status_sesudah" = 'berjalan')
        OR ("riwayat_status_pinjaman"."status_sebelum" IS NOT NULL AND "riwayat_status_pinjaman"."status_sebelum" <> "riwayat_status_pinjaman"."status_sesudah"))
);
--> statement-breakpoint
CREATE TABLE "transaksi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kantor_id" uuid NOT NULL,
	"pencatat_id" uuid NOT NULL,
	"pinjaman_id" uuid NOT NULL,
	"tanggal" date NOT NULL,
	"jenis" "jenis_transaksi" NOT NULL,
	"setoran_murni" bigint DEFAULT 0 NOT NULL,
	"setoran_pelunasan" bigint DEFAULT 0 NOT NULL,
	"tabungan_keluar" bigint DEFAULT 0 NOT NULL,
	"storting" bigint GENERATED ALWAYS AS (setoran_murni + setoran_pelunasan - tabungan_keluar) STORED NOT NULL,
	"saldo_sesudah" bigint NOT NULL,
	"dibatalkan_at" timestamp with time zone,
	"dibatalkan_oleh" uuid,
	"alasan_batal" varchar(100),
	"dibuat_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_transaksi_id_kantor" UNIQUE("id","kantor_id"),
	CONSTRAINT "transaksi_nominal_check" CHECK ("transaksi"."setoran_murni" >= 0 AND "transaksi"."setoran_pelunasan" >= 0 AND "transaksi"."tabungan_keluar" >= 0
        AND "transaksi"."saldo_sesudah" >= 0 AND "transaksi"."setoran_murni" + "transaksi"."setoran_pelunasan" > 0),
	CONSTRAINT "transaksi_jenis_check" CHECK (("transaksi"."jenis" = 'angsuran' AND "transaksi"."tabungan_keluar" = 0 AND "transaksi"."saldo_sesudah" > 0)
        OR ("transaksi"."jenis" = 'pelunasan' AND "transaksi"."saldo_sesudah" = 0 AND "transaksi"."setoran_pelunasan" <= "transaksi"."tabungan_keluar")
        OR ("transaksi"."jenis" = 'gulung' AND "transaksi"."setoran_murni" = 0 AND "transaksi"."tabungan_keluar" = 0 AND "transaksi"."saldo_sesudah" = 0)),
	CONSTRAINT "transaksi_batal_check" CHECK (("transaksi"."dibatalkan_at" IS NULL AND "transaksi"."dibatalkan_oleh" IS NULL AND "transaksi"."alasan_batal" IS NULL)
        OR ("transaksi"."dibatalkan_at" IS NOT NULL AND "transaksi"."dibatalkan_oleh" IS NOT NULL AND "transaksi"."alasan_batal" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "pinjaman" ADD CONSTRAINT "pinjaman_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinjaman" ADD CONSTRAINT "pinjaman_pencair_fk" FOREIGN KEY ("pencair_id","kantor_id") REFERENCES "public"."pengguna"("id","kolektor_kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinjaman" ADD CONSTRAINT "pinjaman_nasabah_fk" FOREIGN KEY ("nasabah_id","kantor_id") REFERENCES "public"."nasabah"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinjaman" ADD CONSTRAINT "pinjaman_asal_fk" FOREIGN KEY ("pinjaman_asal_id","nasabah_id") REFERENCES "public"."pinjaman"("id","nasabah_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinjaman" ADD CONSTRAINT "pinjaman_dibuat_oleh_fk" FOREIGN KEY ("dibuat_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinjaman" ADD CONSTRAINT "pinjaman_diputihkan_oleh_fk" FOREIGN KEY ("diputihkan_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinjaman" ADD CONSTRAINT "pinjaman_dibatalkan_oleh_fk" FOREIGN KEY ("dibatalkan_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinjaman" ADD CONSTRAINT "pinjaman_foto_fk" FOREIGN KEY ("foto_serah_terima_id","kantor_id") REFERENCES "public"."foto"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riwayat_status_pinjaman" ADD CONSTRAINT "riwayat_status_pinjaman_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riwayat_status_pinjaman" ADD CONSTRAINT "riwayat_status_pinjaman_pinjaman_fk" FOREIGN KEY ("pinjaman_id","kantor_id") REFERENCES "public"."pinjaman"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_kantor_fk" FOREIGN KEY ("kantor_id") REFERENCES "public"."kantor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_pencatat_fk" FOREIGN KEY ("pencatat_id","kantor_id") REFERENCES "public"."pengguna"("id","kolektor_kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_pinjaman_fk" FOREIGN KEY ("pinjaman_id","kantor_id") REFERENCES "public"."pinjaman"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_dibatalkan_oleh_fk" FOREIGN KEY ("dibatalkan_oleh","kantor_id") REFERENCES "public"."pengguna"("id","kantor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_pinjaman_aktif_nasabah" ON "pinjaman" USING btree ("nasabah_id") WHERE "pinjaman"."status" IN ('berjalan', 'macet');--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_pinjaman_nasabah_ke" ON "pinjaman" USING btree ("nasabah_id","pinjaman_ke") WHERE "pinjaman"."status" <> 'batal';--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_pinjaman_asal" ON "pinjaman" USING btree ("pinjaman_asal_id") WHERE "pinjaman"."pinjaman_asal_id" IS NOT NULL AND "pinjaman"."status" <> 'batal';--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_pinjaman_foto" ON "pinjaman" USING btree ("foto_serah_terima_id") WHERE "pinjaman"."foto_serah_terima_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_pinjaman_kantor_status" ON "pinjaman" USING btree ("kantor_id","status");--> statement-breakpoint
CREATE INDEX "idx_pinjaman_pencair_akad" ON "pinjaman" USING btree ("pencair_id","tanggal_akad");--> statement-breakpoint
CREATE INDEX "idx_pinjaman_kantor_akad" ON "pinjaman" USING btree ("kantor_id","tanggal_akad");--> statement-breakpoint
CREATE INDEX "idx_pinjaman_kantor_selesai" ON "pinjaman" USING btree ("kantor_id","tanggal_selesai") WHERE "pinjaman"."tanggal_selesai" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_riwayat_status_pinjaman_lahir" ON "riwayat_status_pinjaman" USING btree ("pinjaman_id") WHERE "riwayat_status_pinjaman"."status_sebelum" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_riwayat_status_pinjaman_pinjaman" ON "riwayat_status_pinjaman" USING btree ("pinjaman_id","dibuat_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_transaksi_pinjaman_tanggal" ON "transaksi" USING btree ("pinjaman_id","tanggal") WHERE "transaksi"."dibatalkan_at" IS NULL;