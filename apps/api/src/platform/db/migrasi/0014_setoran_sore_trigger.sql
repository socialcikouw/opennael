-- SETORAN SORE — trigger serah_terima_kas, transfer_setoran, biaya_tak_terduga
-- (24 Okt 2026). Lihat docs/skema/schema-serah-terima-kas.md.

-- HANYA BERTAMBAH: ketiganya tabel uang — UPDATE hanya menandai batal.
CREATE TRIGGER serah_terima_kas_append_only BEFORE UPDATE OR DELETE ON serah_terima_kas
  FOR EACH ROW EXECUTE FUNCTION uang_hanya_batal();
--> statement-breakpoint
CREATE TRIGGER transfer_setoran_append_only BEFORE UPDATE OR DELETE ON transfer_setoran
  FOR EACH ROW EXECUTE FUNCTION uang_hanya_batal();
--> statement-breakpoint
CREATE TRIGGER biaya_tak_terduga_append_only BEFORE UPDATE OR DELETE ON biaya_tak_terduga
  FOR EACH ROW EXECUTE FUNCTION uang_hanya_batal();
--> statement-breakpoint

-- KAS DITERIMA SESUDAH LAPORAN DIBUKA. Mengunci baris hari_kolektor (FOR
-- UPDATE): transfer & biaya yang dikirim bersamaan (FOR SHARE) jadi berurutan.
-- Hari yang tak ditemukan dibiarkan — FK serah_terima_kas_hari_fk menolaknya.
CREATE OR REPLACE FUNCTION serah_terima_kas_syarat() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  h record;
BEGIN
  IF nael_jalan_pintas() THEN
    RETURN NEW;
  END IF;
  SELECT absensi, laporan_dibuka_at INTO h
  FROM hari_kolektor
  WHERE id = NEW.hari_kolektor_id AND kantor_id = NEW.kantor_id
  FOR UPDATE;
  IF FOUND AND (h.absensi <> 'masuk_kerja' OR h.laporan_dibuka_at IS NULL) THEN
    RAISE EXCEPTION 'Kas hanya diterima sesudah kolektor masuk kerja dan membuka laporan'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'serah_terima_kas_syarat';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER serah_terima_kas_syarat BEFORE INSERT ON serah_terima_kas
  FOR EACH ROW EXECUTE FUNCTION serah_terima_kas_syarat();
--> statement-breakpoint

-- Kunci bersama untuk trigger *_terkunci: hari kolektor (kolektor, tanggal)
-- dikunci FOR SHARE, lalu ditolak bila sudah punya serah terima berlaku.
CREATE OR REPLACE FUNCTION tolak_bila_kas_diterima(p_kolektor uuid, p_tanggal date, p_constraint text)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  hari_id uuid;
BEGIN
  SELECT id INTO hari_id FROM hari_kolektor
  WHERE kolektor_id = p_kolektor AND tanggal = p_tanggal
  FOR SHARE;
  IF hari_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM serah_terima_kas WHERE hari_kolektor_id = hari_id AND dibatalkan_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Kas kolektor hari itu sudah diterima — bos membatalkan penerimaannya lebih dulu'
      USING ERRCODE = 'check_violation', CONSTRAINT = p_constraint;
  END IF;
END;
$$;
--> statement-breakpoint

-- HARI TERKUNCI: angka hari & laporan tak berubah selama kas diterima.
CREATE OR REPLACE FUNCTION hari_kolektor_terkunci() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF nael_jalan_pintas() THEN
    RETURN NEW;
  END IF;
  IF (OLD.kas_lapangan, OLD.uang_jalan, OLD.laporan_dibuka_at)
       IS DISTINCT FROM (NEW.kas_lapangan, NEW.uang_jalan, NEW.laporan_dibuka_at)
     AND EXISTS (
       SELECT 1 FROM serah_terima_kas WHERE hari_kolektor_id = OLD.id AND dibatalkan_at IS NULL
     ) THEN
    RAISE EXCEPTION 'Kas kolektor hari itu sudah diterima — bos membatalkan penerimaannya lebih dulu'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'hari_kolektor_terkunci';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER hari_kolektor_terkunci BEFORE UPDATE ON hari_kolektor
  FOR EACH ROW EXECUTE FUNCTION hari_kolektor_terkunci();
--> statement-breakpoint

-- BATAS TRANSFER (aturan-usaha I3): paling banyak uang yang benar-benar
-- dibayar nasabah. Transaksi hanya bertambah → batas yang lolos tetap benar.
CREATE OR REPLACE FUNCTION transfer_setoran_batas() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  t record;
  batas bigint;
BEGIN
  SELECT jenis, setoran_murni, setoran_pelunasan, dibatalkan_at INTO t
  FROM transaksi WHERE id = NEW.transaksi_id AND kantor_id = NEW.kantor_id;
  IF NOT FOUND THEN
    RETURN NEW;  -- FK transfer_setoran_transaksi_fk yang menolak
  END IF;
  IF t.dibatalkan_at IS NOT NULL THEN
    RAISE EXCEPTION 'Setoran yang sudah batal tidak bisa ditransfer'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'transfer_setoran_batas';
  END IF;
  batas := CASE t.jenis
    WHEN 'angsuran' THEN t.setoran_murni + t.setoran_pelunasan
    WHEN 'pelunasan' THEN t.setoran_murni
    ELSE 0
  END;
  IF NEW.nominal > batas THEN
    RAISE EXCEPTION 'Transfer melebihi uang yang dibayar nasabah (paling banyak %)', batas
      USING ERRCODE = 'check_violation', CONSTRAINT = 'transfer_setoran_batas';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER transfer_setoran_batas BEFORE INSERT ON transfer_setoran
  FOR EACH ROW EXECUTE FUNCTION transfer_setoran_batas();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION transfer_setoran_terkunci() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  t record;
BEGIN
  IF nael_jalan_pintas() THEN
    RETURN NEW;
  END IF;
  SELECT pencatat_id, tanggal INTO t
  FROM transaksi WHERE id = NEW.transaksi_id AND kantor_id = NEW.kantor_id;
  IF FOUND THEN
    PERFORM tolak_bila_kas_diterima(t.pencatat_id, t.tanggal, 'transfer_setoran_terkunci');
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER transfer_setoran_terkunci BEFORE INSERT OR UPDATE ON transfer_setoran
  FOR EACH ROW EXECUTE FUNCTION transfer_setoran_terkunci();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION biaya_tak_terduga_terkunci() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF nael_jalan_pintas() THEN
    RETURN NEW;
  END IF;
  PERFORM tolak_bila_kas_diterima(NEW.kolektor_id, NEW.tanggal, 'biaya_tak_terduga_terkunci');
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER biaya_tak_terduga_terkunci BEFORE INSERT OR UPDATE ON biaya_tak_terduga
  FOR EACH ROW EXECUTE FUNCTION biaya_tak_terduga_terkunci();
