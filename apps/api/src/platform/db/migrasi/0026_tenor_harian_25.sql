-- Tenor harian 25 kali (keputusan pemilik 26 Nov 2026, aturan-usaha A2/A3). Harian 24 tetap
-- diterima hanya untuk pinjaman yang sudah tercatat (syarat dibekukan, A6); akad baru dijaga syaratAkad.
ALTER TABLE "pinjaman" DROP CONSTRAINT "pinjaman_tenor_check";--> statement-breakpoint
ALTER TABLE "pinjaman" ADD CONSTRAINT "pinjaman_tenor_check" CHECK (("pinjaman"."jenis" = 'harian' AND "pinjaman"."tenor" IN (24, 25))
        OR ("pinjaman"."jenis" = 'mingguan' AND "pinjaman"."tenor" IN (6, 8, 10))
        OR ("pinjaman"."jenis" = 'tempoan' AND "pinjaman"."tenor" IN (7, 10, 14)));