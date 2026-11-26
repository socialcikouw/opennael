-- Mingguan: pokok paling sedikit Rp 500.000 (keputusan pemilik 26 Nov 2026, aturan-usaha A1).
ALTER TABLE "pinjaman" DROP CONSTRAINT "pinjaman_pokok_check";--> statement-breakpoint
ALTER TABLE "pinjaman" ADD CONSTRAINT "pinjaman_pokok_check" CHECK ("pinjaman"."pokok" > 0 AND "pinjaman"."pokok" % 100000 = 0 AND ("pinjaman"."jenis" <> 'mingguan' OR "pinjaman"."pokok" >= 500000));