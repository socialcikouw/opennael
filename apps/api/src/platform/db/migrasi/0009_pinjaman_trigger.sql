-- PINJAMAN, TRANSAKSI, RIWAYAT STATUS — bagian yang tak dikelola drizzle-kit
-- (23 Okt 2026): fillfactor, index INCLUDE, trigger.

-- Setiap setoran mengubah `pinjaman.saldo` (tak di-index): dengan ruang sisa
-- di halaman, Postgres memakai HOT update — index tak disentuh.
ALTER TABLE pinjaman SET (fillfactor = 90);
--> statement-breakpoint
CREATE TRIGGER pinjaman_atur_diubah_at BEFORE UPDATE ON pinjaman
  FOR EACH ROW EXECUTE FUNCTION atur_diubah_at();
--> statement-breakpoint

-- Laporan menyaring transaksi berlaku lalu menjumlah nominal: dengan nominal
-- ikut di index, dijawab langsung dari index (index-only scan).
CREATE INDEX idx_transaksi_pencatat_tanggal ON transaksi (pencatat_id, tanggal)
  INCLUDE (setoran_murni, setoran_pelunasan, tabungan_keluar, storting, dibatalkan_at);
--> statement-breakpoint
CREATE INDEX idx_transaksi_kantor_tanggal ON transaksi (kantor_id, tanggal)
  INCLUDE (pencatat_id, setoran_murni, setoran_pelunasan, tabungan_keluar, storting, dibatalkan_at);
--> statement-breakpoint
CREATE INDEX idx_transaksi_tabungan_keluar ON transaksi (kantor_id, pencatat_id)
  WHERE tabungan_keluar > 0 AND dibatalkan_at IS NULL;
--> statement-breakpoint
CREATE INDEX idx_riwayat_status_pinjaman_kantor_tanggal ON riwayat_status_pinjaman (kantor_id, tanggal)
  INCLUDE (pinjaman_id, status_sebelum, status_sesudah);
--> statement-breakpoint

-- UANG HANYA BATAL — tabel uang: satu-satunya UPDATE yang sah adalah
-- menandai batal baris yang belum batal (dibatalkan_at / dibatalkan_oleh /
-- alasan_batal) tanpa mengubah kolom lain. DELETE ditolak, kecuali skrip data
-- uji (`nael.hapus_data_uji`). Dipakai transaksi; kelak tabel uang lain.
CREATE OR REPLACE FUNCTION uang_hanya_batal() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF coalesce(current_setting('nael.hapus_data_uji', true), '') = 'ya' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION '% hanya bertambah: baris tidak boleh dihapus (batalkan saja)', TG_TABLE_NAME
      USING ERRCODE = 'check_violation', CONSTRAINT = TG_TABLE_NAME || '_append_only';
  END IF;
  IF OLD.dibatalkan_at IS NOT NULL THEN
    RAISE EXCEPTION '% yang sudah batal tidak boleh diubah', TG_TABLE_NAME
      USING ERRCODE = 'check_violation', CONSTRAINT = TG_TABLE_NAME || '_append_only';
  END IF;
  IF (to_jsonb(OLD) - 'dibatalkan_at' - 'dibatalkan_oleh' - 'alasan_batal')
     IS DISTINCT FROM (to_jsonb(NEW) - 'dibatalkan_at' - 'dibatalkan_oleh' - 'alasan_batal') THEN
    RAISE EXCEPTION '% hanya bertambah: yang boleh diubah hanya penanda batal', TG_TABLE_NAME
      USING ERRCODE = 'check_violation', CONSTRAINT = TG_TABLE_NAME || '_append_only';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER transaksi_append_only BEFORE UPDATE OR DELETE ON transaksi
  FOR EACH ROW EXECUTE FUNCTION uang_hanya_batal();
--> statement-breakpoint
CREATE TRIGGER riwayat_status_pinjaman_append_only BEFORE UPDATE OR DELETE ON riwayat_status_pinjaman
  FOR EACH ROW EXECUTE FUNCTION hanya_bertambah();
--> statement-breakpoint

-- RIWAYAT STATUS diisi trigger — tanggal perpindahan diturunkan dari kolom
-- yang ditulis jalur itu sendiri (docs/skema/schema-riwayat-status-pinjaman.md):
--   lahir                         → tanggal_akad
--   lunas/digulung → dibuka lagi  → tanggal_selesai LAMA (batal hanya di hari penutupan)
--   → diputihkan                  → tanggal_selesai
--   diputihkan → (batal)          → nael.tanggal_pembukuan; cadangan: hari ini zona kantor
--   → macet                       → tanggal_macet
--   → lunas / digulung / batal    → tanggal_selesai
--   macet → berjalan (pulih)      → nael.tanggal_pembukuan dari sapuan; KOSONG → galat
--                                   (cadangan "hari ini" pasti meleset satu hari)
CREATE OR REPLACE FUNCTION pinjaman_riwayat_status() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  tgl date;
  dipasang date := nullif(current_setting('nael.tanggal_pembukuan', true), '')::date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO riwayat_status_pinjaman (kantor_id, pinjaman_id, status_sebelum, status_sesudah, tanggal)
    VALUES (NEW.kantor_id, NEW.id, NULL, 'berjalan', NEW.tanggal_akad);
    -- Lahir sudah selesai/macet (salinan, data uji): kelahiran tetap berjalan,
    -- lalu satu perpindahan ke status itu.
    IF NEW.status <> 'berjalan' THEN
      INSERT INTO riwayat_status_pinjaman (kantor_id, pinjaman_id, status_sebelum, status_sesudah, tanggal)
      VALUES (NEW.kantor_id, NEW.id, 'berjalan', NEW.status,
        CASE WHEN NEW.status = 'macet' THEN NEW.tanggal_macet ELSE NEW.tanggal_selesai END);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  tgl := CASE
    WHEN OLD.status IN ('lunas', 'digulung') THEN OLD.tanggal_selesai
    WHEN NEW.status = 'diputihkan' THEN NEW.tanggal_selesai
    WHEN OLD.status = 'diputihkan' THEN coalesce(dipasang, kantor_hari_ini(NEW.kantor_id))
    WHEN NEW.status = 'macet' THEN NEW.tanggal_macet
    WHEN NEW.status IN ('lunas', 'digulung', 'batal') THEN NEW.tanggal_selesai
    ELSE dipasang
  END;
  IF tgl IS NULL THEN
    RAISE EXCEPTION 'Perpindahan % → % butuh nael.tanggal_pembukuan', OLD.status, NEW.status
      USING ERRCODE = 'check_violation', CONSTRAINT = 'riwayat_status_pinjaman_tanggal';
  END IF;

  INSERT INTO riwayat_status_pinjaman (kantor_id, pinjaman_id, status_sebelum, status_sesudah, tanggal)
  VALUES (NEW.kantor_id, NEW.id, OLD.status, NEW.status, tgl);
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER pinjaman_riwayat_status AFTER INSERT OR UPDATE OF status ON pinjaman
  FOR EACH ROW EXECUTE FUNCTION pinjaman_riwayat_status();
