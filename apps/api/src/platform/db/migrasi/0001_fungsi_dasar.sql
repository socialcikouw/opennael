-- FUNGSI & TRIGGER DASAR (23 Okt 2026). drizzle-kit tidak mengelola fungsi
-- dan trigger, jadi ditulis di migrasi SQL kustom ini.

-- `diubah_at` disentuh database pada setiap UPDATE — tidak bergantung pada
-- kode aplikasi yang bisa lupa.
CREATE OR REPLACE FUNCTION atur_diubah_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.diubah_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER kantor_atur_diubah_at BEFORE UPDATE ON kantor
  FOR EACH ROW EXECUTE FUNCTION atur_diubah_at();
--> statement-breakpoint
CREATE TRIGGER pengguna_atur_diubah_at BEFORE UPDATE ON pengguna
  FOR EACH ROW EXECUTE FUNCTION atur_diubah_at();
--> statement-breakpoint
CREATE TRIGGER pekan_kerja_atur_diubah_at BEFORE UPDATE ON pekan_kerja
  FOR EACH ROW EXECUTE FUNCTION atur_diubah_at();
--> statement-breakpoint

-- "Hari ini" menurut kalender kantor (WIB/WITA/WIT, offset tetap). Dipakai
-- trigger yang melarang perubahan mundur (pekan kerja; kelak tarif gaji,
-- libur kantor). NULL bila kantor tidak ada — FK yang menolak barisnya.
CREATE OR REPLACE FUNCTION kantor_hari_ini(p_kantor_id uuid) RETURNS date
LANGUAGE sql STABLE AS $$
  SELECT (now() AT TIME ZONE CASE k.zona_waktu
            WHEN 'WIB'  THEN 'Asia/Jakarta'
            WHEN 'WITA' THEN 'Asia/Makassar'
            WHEN 'WIT'  THEN 'Asia/Jayapura'
          END)::date
  FROM kantor k
  WHERE k.id = p_kantor_id
$$;
--> statement-breakpoint

-- Jalan pintas yang sah untuk aturan "tidak boleh mundur": transaksi
-- migrasi data lama (`nael.migrasi_data`) dan skrip data uji
-- (`nael.hapus_data_uji`), keduanya dipasang `set_config(..., true)` hanya
-- untuk transaksinya sendiri.
CREATE OR REPLACE FUNCTION nael_jalan_pintas() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('nael.migrasi_data', true), '') = 'ya'
      OR coalesce(current_setting('nael.hapus_data_uji', true), '') = 'ya'
$$;
--> statement-breakpoint

-- PEKAN KERJA TIDAK MUNDUR: pola baru hanya berlaku mulai hari ini atau ke
-- depan; pola yang sudah berlaku (sebelum hari ini) tak boleh diubah atau
-- dihapus — jadwal & tunggakan hari lampau tidak bergeser.
CREATE OR REPLACE FUNCTION pekan_kerja_tidak_mundur() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  hari_ini date;
BEGIN
  IF nael_jalan_pintas() THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    hari_ini := kantor_hari_ini(OLD.kantor_id);
    IF OLD.berlaku_mulai < hari_ini THEN
      RAISE EXCEPTION 'Pekan kerja yang sudah berlaku tidak boleh diubah atau dihapus'
        USING ERRCODE = 'check_violation', CONSTRAINT = 'pekan_kerja_tidak_mundur';
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    hari_ini := kantor_hari_ini(NEW.kantor_id);
    IF NEW.berlaku_mulai < hari_ini THEN
      RAISE EXCEPTION 'Pekan kerja tidak bisa diberlakukan mundur'
        USING ERRCODE = 'check_violation', CONSTRAINT = 'pekan_kerja_tidak_mundur';
    END IF;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER pekan_kerja_tidak_mundur BEFORE INSERT OR UPDATE OR DELETE ON pekan_kerja
  FOR EACH ROW EXECUTE FUNCTION pekan_kerja_tidak_mundur();
