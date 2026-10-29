-- PEMBAYARAN GAJI — periode tak tumpang tindih & hanya bertambah (24 Okt 2026).

-- `btree_gist`: kolom uuid (=) dan rentang tanggal (&&) dalam satu index GiST.
-- Ekstensi bawaan Postgres (contrib) — tersedia di Supabase maupun VPS.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE pembayaran_gaji ADD CONSTRAINT pembayaran_gaji_periode_excl
  EXCLUDE USING gist (
    kolektor_id WITH =,
    daterange(periode_mulai, periode_selesai, '[]') WITH &&
  ) WHERE (dibatalkan_at IS NULL);
--> statement-breakpoint
CREATE TRIGGER pembayaran_gaji_append_only BEFORE UPDATE OR DELETE ON pembayaran_gaji
  FOR EACH ROW EXECUTE FUNCTION uang_hanya_batal();
