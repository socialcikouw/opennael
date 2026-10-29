-- HANYA BERTAMBAH (23 Okt 2026) — fungsi umum untuk tabel yang barisnya tak
-- pernah diubah atau dihapus (riwayat_perubahan; kelak riwayat_status_pinjaman,
-- koreksi_tabungan). UPDATE selalu ditolak; DELETE hanya untuk skrip data uji
-- yang membuka `nael.hapus_data_uji` di transaksinya sendiri. Jejak yang bisa
-- disunting bukan jejak. Nama constraint di galat = `<tabel>_append_only`.
CREATE OR REPLACE FUNCTION hanya_bertambah() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND coalesce(current_setting('nael.hapus_data_uji', true), '') = 'ya' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION '% hanya bertambah: baris tidak boleh diubah atau dihapus', TG_TABLE_NAME
    USING ERRCODE = 'check_violation', CONSTRAINT = TG_TABLE_NAME || '_append_only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER riwayat_perubahan_append_only BEFORE UPDATE OR DELETE ON riwayat_perubahan
  FOR EACH ROW EXECUTE FUNCTION hanya_bertambah();
