import * as Haptics from "expo-haptics";

/**
 * GETAR (haptic) — umpan balik sentuh untuk SETIAP tombol (keputusan pemilik 24 Nov 2026).
 * Dipanggil otomatis oleh `Tekan` (`komponen/ui/tekan.tsx`); layar jarang perlu memanggil
 * ini langsung. Satu getar per tindakan, selalu bersama tanda visual (banyak HP mematikan
 * getar). Gagal (perangkat tanpa motor getar) diabaikan diam-diam.
 *
 * - `ketuk`  — tombol & aksi biasa, tiap angka papan Bayar/Gulung (ringan).
 * - `pilih`  — memilih di antara pilihan: tab, segmen, chip, pilihan (paling halus, khas iOS).
 * - `tegas`  — aksi penentu: KONFIRMASI, simpan transaksi.
 * - `tahan`  — tekan lama tercapai (Lunasi kartu, ⌫ tahan = kosongkan).
 */
export type JenisGetar = "ketuk" | "pilih" | "tegas" | "tahan";

export function getar(jenis: JenisGetar = "ketuk"): void {
  const janji =
    jenis === "pilih"
      ? Haptics.selectionAsync()
      : Haptics.impactAsync(
          jenis === "ketuk"
            ? Haptics.ImpactFeedbackStyle.Light
            : Haptics.ImpactFeedbackStyle.Medium,
        );
  void janji.catch(() => undefined);
}
