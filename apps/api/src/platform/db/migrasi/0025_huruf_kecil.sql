-- KONVENSI #10 (2 Nov 2026, docs/tampilan.md): teks isian disimpan huruf kecil.
-- 1) Kecilkan data yang sudah ada. Tabel "hanya bertambah" menolak UPDATE, jadi
--    pemicu pengguna tiap tabel dimatikan sesaat di transaksi migrasi ini saja
--    (ikut menjaga diubah_at tak tersentuh), lalu dinyalakan lagi.
-- 2) Pasang CHECK <tabel>_huruf_kecil_check (sah untuk semua baris).
ALTER TABLE "biaya_tak_terduga" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "biaya_tak_terduga" SET "keterangan" = lower("keterangan"), "alasan_batal" = lower("alasan_batal") WHERE "keterangan" <> lower("keterangan") OR "alasan_batal" <> lower("alasan_batal");--> statement-breakpoint
ALTER TABLE "biaya_tak_terduga" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "hari_kolektor" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "hari_kolektor" SET "alasan_tidak_kerja" = lower("alasan_tidak_kerja") WHERE "alasan_tidak_kerja" <> lower("alasan_tidak_kerja");--> statement-breakpoint
ALTER TABLE "hari_kolektor" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "kantor" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "kantor" SET "nama" = lower("nama") WHERE "nama" <> lower("nama");--> statement-breakpoint
ALTER TABLE "kantor" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "kebijakan" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "kebijakan" SET "alasan_kunci" = lower("alasan_kunci") WHERE "alasan_kunci" <> lower("alasan_kunci");--> statement-breakpoint
ALTER TABLE "kebijakan" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "koreksi_tabungan" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "koreksi_tabungan" SET "alasan_koreksi" = lower("alasan_koreksi") WHERE "alasan_koreksi" <> lower("alasan_koreksi");--> statement-breakpoint
ALTER TABLE "koreksi_tabungan" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "libur_kantor" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "libur_kantor" SET "alasan_libur" = lower("alasan_libur") WHERE "alasan_libur" <> lower("alasan_libur");--> statement-breakpoint
ALTER TABLE "libur_kantor" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "libur_nasabah" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "libur_nasabah" SET "alasan_libur" = lower("alasan_libur") WHERE "alasan_libur" <> lower("alasan_libur");--> statement-breakpoint
ALTER TABLE "libur_nasabah" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "mutasi_kas_kantor" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "mutasi_kas_kantor" SET "keterangan" = lower("keterangan"), "alasan_batal" = lower("alasan_batal") WHERE "keterangan" <> lower("keterangan") OR "alasan_batal" <> lower("alasan_batal");--> statement-breakpoint
ALTER TABLE "mutasi_kas_kantor" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "nasabah" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "nasabah" SET "nama" = lower("nama"), "alasan_blokir" = lower("alasan_blokir") WHERE "nama" <> lower("nama") OR "alasan_blokir" <> lower("alasan_blokir");--> statement-breakpoint
ALTER TABLE "nasabah" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "pembayaran_gaji" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "pembayaran_gaji" SET "keterangan" = lower("keterangan"), "alasan_batal" = lower("alasan_batal") WHERE "keterangan" <> lower("keterangan") OR "alasan_batal" <> lower("alasan_batal");--> statement-breakpoint
ALTER TABLE "pembayaran_gaji" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "penarikan_tabungan" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "penarikan_tabungan" SET "alasan_penarikan" = lower("alasan_penarikan"), "alasan_batal" = lower("alasan_batal") WHERE "alasan_penarikan" <> lower("alasan_penarikan") OR "alasan_batal" <> lower("alasan_batal");--> statement-breakpoint
ALTER TABLE "penarikan_tabungan" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "pencocokan_kas" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "pencocokan_kas" SET "keterangan" = lower("keterangan"), "alasan_batal" = lower("alasan_batal") WHERE "keterangan" <> lower("keterangan") OR "alasan_batal" <> lower("alasan_batal");--> statement-breakpoint
ALTER TABLE "pencocokan_kas" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "pengguna" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "pengguna" SET "nama" = lower("nama"), "resort" = lower("resort"), "alasan_nonaktif" = lower("alasan_nonaktif") WHERE "nama" <> lower("nama") OR "resort" <> lower("resort") OR "alasan_nonaktif" <> lower("alasan_nonaktif");--> statement-breakpoint
ALTER TABLE "pengguna" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "perangkat" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "perangkat" SET "nama" = lower("nama") WHERE "nama" <> lower("nama");--> statement-breakpoint
ALTER TABLE "perangkat" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "pinjaman" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "pinjaman" SET "alasan_batal" = lower("alasan_batal"), "keterangan_pemutihan" = lower("keterangan_pemutihan") WHERE "alasan_batal" <> lower("alasan_batal") OR "keterangan_pemutihan" <> lower("keterangan_pemutihan");--> statement-breakpoint
ALTER TABLE "pinjaman" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "riwayat_perubahan" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "riwayat_perubahan" SET "alasan_perubahan" = lower("alasan_perubahan") WHERE "alasan_perubahan" <> lower("alasan_perubahan");--> statement-breakpoint
ALTER TABLE "riwayat_perubahan" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "serah_terima_kas" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "serah_terima_kas" SET "alasan_batal" = lower("alasan_batal") WHERE "alasan_batal" <> lower("alasan_batal");--> statement-breakpoint
ALTER TABLE "serah_terima_kas" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "tautan" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "tautan" SET "nama" = lower("nama") WHERE "nama" <> lower("nama");--> statement-breakpoint
ALTER TABLE "tautan" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "transaksi" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "transaksi" SET "alasan_batal" = lower("alasan_batal") WHERE "alasan_batal" <> lower("alasan_batal");--> statement-breakpoint
ALTER TABLE "transaksi" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "transfer_setoran" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "transfer_setoran" SET "alasan_batal" = lower("alasan_batal") WHERE "alasan_batal" <> lower("alasan_batal");--> statement-breakpoint
ALTER TABLE "transfer_setoran" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "wilayah" DISABLE TRIGGER USER;--> statement-breakpoint
UPDATE "wilayah" SET "nama" = lower("nama") WHERE "nama" <> lower("nama");--> statement-breakpoint
ALTER TABLE "wilayah" ENABLE TRIGGER USER;--> statement-breakpoint
ALTER TABLE "biaya_tak_terduga" ADD CONSTRAINT "biaya_tak_terduga_huruf_kecil_check" CHECK ("biaya_tak_terduga"."keterangan" = lower("biaya_tak_terduga"."keterangan") AND ("biaya_tak_terduga"."alasan_batal" IS NULL OR "biaya_tak_terduga"."alasan_batal" = lower("biaya_tak_terduga"."alasan_batal")));--> statement-breakpoint
ALTER TABLE "hari_kolektor" ADD CONSTRAINT "hari_kolektor_huruf_kecil_check" CHECK (("hari_kolektor"."alasan_tidak_kerja" IS NULL OR "hari_kolektor"."alasan_tidak_kerja" = lower("hari_kolektor"."alasan_tidak_kerja")));--> statement-breakpoint
ALTER TABLE "kantor" ADD CONSTRAINT "kantor_huruf_kecil_check" CHECK ("kantor"."nama" = lower("kantor"."nama"));--> statement-breakpoint
ALTER TABLE "kebijakan" ADD CONSTRAINT "kebijakan_huruf_kecil_check" CHECK (("kebijakan"."alasan_kunci" IS NULL OR "kebijakan"."alasan_kunci" = lower("kebijakan"."alasan_kunci")));--> statement-breakpoint
ALTER TABLE "koreksi_tabungan" ADD CONSTRAINT "koreksi_tabungan_huruf_kecil_check" CHECK ("koreksi_tabungan"."alasan_koreksi" = lower("koreksi_tabungan"."alasan_koreksi"));--> statement-breakpoint
ALTER TABLE "libur_kantor" ADD CONSTRAINT "libur_kantor_huruf_kecil_check" CHECK ("libur_kantor"."alasan_libur" = lower("libur_kantor"."alasan_libur"));--> statement-breakpoint
ALTER TABLE "libur_nasabah" ADD CONSTRAINT "libur_nasabah_huruf_kecil_check" CHECK (("libur_nasabah"."alasan_libur" IS NULL OR "libur_nasabah"."alasan_libur" = lower("libur_nasabah"."alasan_libur")));--> statement-breakpoint
ALTER TABLE "mutasi_kas_kantor" ADD CONSTRAINT "mutasi_kas_kantor_huruf_kecil_check" CHECK ("mutasi_kas_kantor"."keterangan" = lower("mutasi_kas_kantor"."keterangan") AND ("mutasi_kas_kantor"."alasan_batal" IS NULL OR "mutasi_kas_kantor"."alasan_batal" = lower("mutasi_kas_kantor"."alasan_batal")));--> statement-breakpoint
ALTER TABLE "nasabah" ADD CONSTRAINT "nasabah_huruf_kecil_check" CHECK ("nasabah"."nama" = lower("nasabah"."nama") AND ("nasabah"."alasan_blokir" IS NULL OR "nasabah"."alasan_blokir" = lower("nasabah"."alasan_blokir")));--> statement-breakpoint
ALTER TABLE "pembayaran_gaji" ADD CONSTRAINT "pembayaran_gaji_huruf_kecil_check" CHECK (("pembayaran_gaji"."keterangan" IS NULL OR "pembayaran_gaji"."keterangan" = lower("pembayaran_gaji"."keterangan")) AND ("pembayaran_gaji"."alasan_batal" IS NULL OR "pembayaran_gaji"."alasan_batal" = lower("pembayaran_gaji"."alasan_batal")));--> statement-breakpoint
ALTER TABLE "penarikan_tabungan" ADD CONSTRAINT "penarikan_tabungan_huruf_kecil_check" CHECK ("penarikan_tabungan"."alasan_penarikan" = lower("penarikan_tabungan"."alasan_penarikan") AND ("penarikan_tabungan"."alasan_batal" IS NULL OR "penarikan_tabungan"."alasan_batal" = lower("penarikan_tabungan"."alasan_batal")));--> statement-breakpoint
ALTER TABLE "pencocokan_kas" ADD CONSTRAINT "pencocokan_kas_huruf_kecil_check" CHECK (("pencocokan_kas"."keterangan" IS NULL OR "pencocokan_kas"."keterangan" = lower("pencocokan_kas"."keterangan")) AND ("pencocokan_kas"."alasan_batal" IS NULL OR "pencocokan_kas"."alasan_batal" = lower("pencocokan_kas"."alasan_batal")));--> statement-breakpoint
ALTER TABLE "pengguna" ADD CONSTRAINT "pengguna_huruf_kecil_check" CHECK ("pengguna"."nama" = lower("pengguna"."nama") AND ("pengguna"."resort" IS NULL OR "pengguna"."resort" = lower("pengguna"."resort")) AND ("pengguna"."alasan_nonaktif" IS NULL OR "pengguna"."alasan_nonaktif" = lower("pengguna"."alasan_nonaktif")));--> statement-breakpoint
ALTER TABLE "perangkat" ADD CONSTRAINT "perangkat_huruf_kecil_check" CHECK (("perangkat"."nama" IS NULL OR "perangkat"."nama" = lower("perangkat"."nama")));--> statement-breakpoint
ALTER TABLE "pinjaman" ADD CONSTRAINT "pinjaman_huruf_kecil_check" CHECK (("pinjaman"."alasan_batal" IS NULL OR "pinjaman"."alasan_batal" = lower("pinjaman"."alasan_batal")) AND ("pinjaman"."keterangan_pemutihan" IS NULL OR "pinjaman"."keterangan_pemutihan" = lower("pinjaman"."keterangan_pemutihan")));--> statement-breakpoint
ALTER TABLE "riwayat_perubahan" ADD CONSTRAINT "riwayat_perubahan_huruf_kecil_check" CHECK (("riwayat_perubahan"."alasan_perubahan" IS NULL OR "riwayat_perubahan"."alasan_perubahan" = lower("riwayat_perubahan"."alasan_perubahan")));--> statement-breakpoint
ALTER TABLE "serah_terima_kas" ADD CONSTRAINT "serah_terima_kas_huruf_kecil_check" CHECK (("serah_terima_kas"."alasan_batal" IS NULL OR "serah_terima_kas"."alasan_batal" = lower("serah_terima_kas"."alasan_batal")));--> statement-breakpoint
ALTER TABLE "tautan" ADD CONSTRAINT "tautan_huruf_kecil_check" CHECK (("tautan"."nama" IS NULL OR "tautan"."nama" = lower("tautan"."nama")));--> statement-breakpoint
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_huruf_kecil_check" CHECK (("transaksi"."alasan_batal" IS NULL OR "transaksi"."alasan_batal" = lower("transaksi"."alasan_batal")));--> statement-breakpoint
ALTER TABLE "transfer_setoran" ADD CONSTRAINT "transfer_setoran_huruf_kecil_check" CHECK (("transfer_setoran"."alasan_batal" IS NULL OR "transfer_setoran"."alasan_batal" = lower("transfer_setoran"."alasan_batal")));--> statement-breakpoint
ALTER TABLE "wilayah" ADD CONSTRAINT "wilayah_huruf_kecil_check" CHECK ("wilayah"."nama" = lower("wilayah"."nama"));