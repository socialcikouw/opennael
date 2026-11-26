-- Tempoan 6 hari KERJA kolektor (keputusan pemilik 26 Nov 2026, aturan-usaha A4): jatuh tempo
-- tidak lagi tanggal_akad + tenor, tetapi dihitung dari absen (platform/db/tempo.ts) — kolom
-- turunan jatuh_tempo dibuang. Tenor tempoan hanya 6.
ALTER TABLE "pinjaman" DROP CONSTRAINT "pinjaman_tenor_check";--> statement-breakpoint
ALTER TABLE "pinjaman" DROP COLUMN "jatuh_tempo";--> statement-breakpoint
ALTER TABLE "pinjaman" ADD CONSTRAINT "pinjaman_tenor_check" CHECK (("pinjaman"."jenis" = 'harian' AND "pinjaman"."tenor" = 25)
        OR ("pinjaman"."jenis" = 'mingguan' AND "pinjaman"."tenor" = 8)
        OR ("pinjaman"."jenis" = 'tempoan' AND "pinjaman"."tenor" = 6));