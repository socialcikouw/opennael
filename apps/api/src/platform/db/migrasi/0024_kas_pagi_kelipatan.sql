-- aturan-usaha I0 (2 Nov 2026): kas lapangan & uang jalan masuk kerja minimal 5.000, kelipatan 5.000.
-- NOT VALID: baris baru & yang diubah diperiksa; catatan lama (data uji, salinan aplikasi lama) tidak.
ALTER TABLE "hari_kolektor" ADD CONSTRAINT "hari_kolektor_kelipatan_check" CHECK ("hari_kolektor"."absensi" = 'tidak_kerja'
        OR ("hari_kolektor"."kas_lapangan" >= 5000 AND "hari_kolektor"."kas_lapangan" % 5000 = 0
          AND "hari_kolektor"."uang_jalan" >= 5000 AND "hari_kolektor"."uang_jalan" % 5000 = 0)) NOT VALID;