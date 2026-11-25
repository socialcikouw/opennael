-- Harian hanya 25 kali (keputusan pemilik 26 Nov 2026): pinjaman 24 kali di Supabase dev sudah
-- dihapus bersama data demo, jadi pengecualian 24 dari 0026 dicabut.
ALTER TABLE "pinjaman" DROP CONSTRAINT "pinjaman_tenor_check";--> statement-breakpoint
ALTER TABLE "pinjaman" ADD CONSTRAINT "pinjaman_tenor_check" CHECK (("pinjaman"."jenis" = 'harian' AND "pinjaman"."tenor" = 25)
        OR ("pinjaman"."jenis" = 'mingguan' AND "pinjaman"."tenor" IN (6, 8, 10))
        OR ("pinjaman"."jenis" = 'tempoan' AND "pinjaman"."tenor" IN (7, 10, 14)));