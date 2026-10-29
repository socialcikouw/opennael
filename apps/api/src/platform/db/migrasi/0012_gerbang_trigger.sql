-- GERBANG LAPANGAN — trigger hari_kolektor, kebijakan, libur (23 Okt 2026).

CREATE TRIGGER hari_kolektor_atur_diubah_at BEFORE UPDATE ON hari_kolektor
  FOR EACH ROW EXECUTE FUNCTION atur_diubah_at();
--> statement-breakpoint
CREATE TRIGGER kebijakan_atur_diubah_at BEFORE UPDATE ON kebijakan
  FOR EACH ROW EXECUTE FUNCTION atur_diubah_at();
--> statement-breakpoint

-- SATU PERISTIWA PER PINJAMAN PER HARI: libur dan transaksi berlaku saling
-- menolak (jaring pengaman; service memegang kunci baris pinjaman supaya dua
-- pencatatan bersamaan tak sama-sama lolos).
CREATE OR REPLACE FUNCTION libur_nasabah_bentrok() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM transaksi
    WHERE pinjaman_id = NEW.pinjaman_id AND tanggal = NEW.tanggal AND dibatalkan_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Pinjaman ini sudah punya setoran hari itu — tidak bisa diliburkan'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'libur_nasabah_bentrok';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER libur_nasabah_bentrok BEFORE INSERT ON libur_nasabah
  FOR EACH ROW EXECUTE FUNCTION libur_nasabah_bentrok();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION transaksi_bentrok_libur() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM libur_nasabah WHERE pinjaman_id = NEW.pinjaman_id AND tanggal = NEW.tanggal
  ) THEN
    RAISE EXCEPTION 'Pinjaman ini ditandai libur hari itu — hapus liburnya lebih dulu'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'transaksi_bentrok_libur';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER transaksi_bentrok_libur BEFORE INSERT ON transaksi
  FOR EACH ROW EXECUTE FUNCTION transaksi_bentrok_libur();
--> statement-breakpoint

-- LIBUR KANTOR TIDAK MENGUBAH SEJARAH: deklarasi hanya hari ini atau ke depan;
-- pembatalan hanya untuk tanggal yang belum tiba; tidak pernah disunting.
CREATE OR REPLACE FUNCTION libur_kantor_tidak_mundur() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF nael_jalan_pintas() THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Libur kantor tidak disunting — hapus lalu deklarasikan ulang'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'libur_kantor_tidak_mundur';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.tanggal < kantor_hari_ini(NEW.kantor_id) THEN
    RAISE EXCEPTION 'Libur kantor tidak bisa dideklarasikan untuk tanggal yang sudah lewat'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'libur_kantor_tidak_mundur';
  END IF;
  IF TG_OP = 'DELETE' AND OLD.tanggal <= kantor_hari_ini(OLD.kantor_id) THEN
    RAISE EXCEPTION 'Hanya libur kantor yang belum tiba yang bisa dibatalkan'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'libur_kantor_tidak_mundur';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER libur_kantor_tidak_mundur BEFORE INSERT OR UPDATE OR DELETE ON libur_kantor
  FOR EACH ROW EXECUTE FUNCTION libur_kantor_tidak_mundur();
