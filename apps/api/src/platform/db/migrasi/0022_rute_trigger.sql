-- RUTE KOLEKTOR (24 Okt 2026) — diubah_at disentuh database.
CREATE TRIGGER rute_kolektor_atur_diubah_at BEFORE UPDATE ON rute_kolektor
  FOR EACH ROW EXECUTE FUNCTION atur_diubah_at();
