-- PERBAIKAN uang_hanya_batal() (23 Okt 2026). Di trigger BEFORE, kolom
-- turunan (GENERATED, mis. transaksi.storting) belum dihitung — NEW berisi
-- NULL — sehingga pembandingan OLD vs NEW selalu berbeda dan pembatalan yang
-- sah ikut ditolak. Kolom turunan kini dikecualikan: nilainya diturunkan dari
-- kolom lain yang tetap dibandingkan.
CREATE OR REPLACE FUNCTION uang_hanya_batal() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  abaikan text[];
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

  SELECT coalesce(array_agg(attname::text), '{}') INTO abaikan
  FROM pg_attribute
  WHERE attrelid = TG_RELID AND attgenerated <> '' AND attnum > 0 AND NOT attisdropped;
  abaikan := abaikan || ARRAY['dibatalkan_at', 'dibatalkan_oleh', 'alasan_batal'];

  IF (to_jsonb(OLD) - abaikan) IS DISTINCT FROM (to_jsonb(NEW) - abaikan) THEN
    RAISE EXCEPTION '% hanya bertambah: yang boleh diubah hanya penanda batal', TG_TABLE_NAME
      USING ERRCODE = 'check_violation', CONSTRAINT = TG_TABLE_NAME || '_append_only';
  END IF;
  RETURN NEW;
END;
$$;
