-- `diubah_at` wilayah & nasabah disentuh database pada setiap UPDATE
-- (fungsi atur_diubah_at dari migrasi 0001).
CREATE TRIGGER wilayah_atur_diubah_at BEFORE UPDATE ON wilayah
  FOR EACH ROW EXECUTE FUNCTION atur_diubah_at();
--> statement-breakpoint
CREATE TRIGGER nasabah_atur_diubah_at BEFORE UPDATE ON nasabah
  FOR EACH ROW EXECUTE FUNCTION atur_diubah_at();
