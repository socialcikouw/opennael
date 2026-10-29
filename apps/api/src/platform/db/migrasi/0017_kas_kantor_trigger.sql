-- KAS KANTOR — trigger buku_kas, mutasi_kas_kantor, pencocokan_kas,
-- penarikan_tabungan, koreksi_tabungan (24 Okt 2026).

CREATE TRIGGER buku_kas_atur_diubah_at BEFORE UPDATE ON buku_kas
  FOR EACH ROW EXECUTE FUNCTION atur_diubah_at();
--> statement-breakpoint

-- Tabel uang: UPDATE hanya menandai batal.
CREATE TRIGGER mutasi_kas_kantor_append_only BEFORE UPDATE OR DELETE ON mutasi_kas_kantor
  FOR EACH ROW EXECUTE FUNCTION uang_hanya_batal();
--> statement-breakpoint
CREATE TRIGGER pencocokan_kas_append_only BEFORE UPDATE OR DELETE ON pencocokan_kas
  FOR EACH ROW EXECUTE FUNCTION uang_hanya_batal();
--> statement-breakpoint
CREATE TRIGGER penarikan_tabungan_append_only BEFORE UPDATE OR DELETE ON penarikan_tabungan
  FOR EACH ROW EXECUTE FUNCTION uang_hanya_batal();
--> statement-breakpoint

-- Koreksi tak pernah diubah/dihapus — salah koreksi dibetulkan koreksi tandingan.
CREATE TRIGGER koreksi_tabungan_append_only BEFORE UPDATE OR DELETE ON koreksi_tabungan
  FOR EACH ROW EXECUTE FUNCTION hanya_bertambah();
