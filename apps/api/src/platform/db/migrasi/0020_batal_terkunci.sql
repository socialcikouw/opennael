-- BATAL TERKUNCI (24 Okt 2026) — aturan-usaha I4: sesudah kas kolektor
-- diterima, batal transaksi & batal akad hari itu ditolak. Hanya saat
-- penandaan batal; perubahan lain (sapuan macet, lunas, gulung) bebas.

CREATE OR REPLACE FUNCTION transaksi_terkunci() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF nael_jalan_pintas() OR OLD.dibatalkan_at IS NOT NULL OR NEW.dibatalkan_at IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM tolak_bila_kas_diterima(OLD.pencatat_id, OLD.tanggal, 'transaksi_terkunci');
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER transaksi_terkunci BEFORE UPDATE OF dibatalkan_at ON transaksi
  FOR EACH ROW EXECUTE FUNCTION transaksi_terkunci();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION pinjaman_terkunci() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF nael_jalan_pintas() OR OLD.status = 'batal' OR NEW.status <> 'batal' THEN
    RETURN NEW;
  END IF;
  PERFORM tolak_bila_kas_diterima(OLD.pencair_id, OLD.tanggal_akad, 'pinjaman_terkunci');
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER pinjaman_terkunci BEFORE UPDATE OF status ON pinjaman
  FOR EACH ROW EXECUTE FUNCTION pinjaman_terkunci();
