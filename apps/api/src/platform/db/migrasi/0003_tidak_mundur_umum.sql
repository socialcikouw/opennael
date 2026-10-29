-- ATURAN "TIDAK BOLEH MUNDUR" UMUM (23 Okt 2026). Satu fungsi untuk setiap
-- tabel bertanggal `berlaku_mulai` milik satu kantor (pekan kerja, tarif gaji;
-- kelak yang lain): baris baru hanya berlaku mulai hari ini atau ke depan
-- (kalender kantor); baris yang sudah berlaku tak boleh diubah atau dihapus.
-- Nama constraint di galat = `<tabel>_tidak_mundur`. Jalan pintas:
-- `nael_jalan_pintas()` (migrasi data lama, skrip data uji).
CREATE OR REPLACE FUNCTION berlaku_tidak_mundur() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  nama_constraint text := TG_TABLE_NAME || '_tidak_mundur';
BEGIN
  IF nael_jalan_pintas() THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE')
     AND OLD.berlaku_mulai < kantor_hari_ini(OLD.kantor_id) THEN
    RAISE EXCEPTION '% yang sudah berlaku tidak boleh diubah atau dihapus', TG_TABLE_NAME
      USING ERRCODE = 'check_violation', CONSTRAINT = nama_constraint;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE')
     AND NEW.berlaku_mulai < kantor_hari_ini(NEW.kantor_id) THEN
    RAISE EXCEPTION '% tidak bisa diberlakukan mundur', TG_TABLE_NAME
      USING ERRCODE = 'check_violation', CONSTRAINT = nama_constraint;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
--> statement-breakpoint

-- Pekan kerja pindah ke fungsi umum (perilaku sama dengan migrasi 0001).
DROP TRIGGER pekan_kerja_tidak_mundur ON pekan_kerja;
--> statement-breakpoint
DROP FUNCTION pekan_kerja_tidak_mundur();
--> statement-breakpoint
CREATE TRIGGER pekan_kerja_tidak_mundur BEFORE INSERT OR UPDATE OR DELETE ON pekan_kerja
  FOR EACH ROW EXECUTE FUNCTION berlaku_tidak_mundur();
--> statement-breakpoint

CREATE TRIGGER tarif_gaji_tidak_mundur BEFORE INSERT OR UPDATE OR DELETE ON tarif_gaji
  FOR EACH ROW EXECUTE FUNCTION berlaku_tidak_mundur();
--> statement-breakpoint
CREATE TRIGGER tarif_gaji_atur_diubah_at BEFORE UPDATE ON tarif_gaji
  FOR EACH ROW EXECUTE FUNCTION atur_diubah_at();
