-- Mingguan hanya 8 kali (keputusan pemilik 26 Nov 2026, aturan-usaha A2/A3): kembali 120%,
-- admin 10% tanpa tabungan. Data pinjaman di Supabase dev dihapus lebih dulu.
ALTER TABLE "pinjaman" DROP CONSTRAINT "pinjaman_tenor_check";--> statement-breakpoint
ALTER TABLE "pinjaman" ADD CONSTRAINT "pinjaman_tenor_check" CHECK (("pinjaman"."jenis" = 'harian' AND "pinjaman"."tenor" = 25)
        OR ("pinjaman"."jenis" = 'mingguan' AND "pinjaman"."tenor" = 8)
        OR ("pinjaman"."jenis" = 'tempoan' AND "pinjaman"."tenor" IN (7, 10, 14)));