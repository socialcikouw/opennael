import * as Haptics from "expo-haptics";

/**
 * GETAR (haptic) — hanya untuk MOMEN YANG BERARTI, bukan setiap sentuhan (keputusan pemilik
 * 24 Nov 2026, menggantikan "setiap tombol bergetar" yang terasa berisik). Pindah tab,
 * menyaring, membuka & menutup TIDAK bergetar. Yang bergetar:
 *
 * - `pilih`    — tiap angka papan Bayar/Gulung; memilih mode di lembar Ganti Mode (paling halus).
 * - `ketuk`    — rana kamera serah terima (ringan).
 * - `tegas`    — cadangan untuk aksi penentu bila kelak dibutuhkan (sedang).
 * - `tahan`    — tekan lama tercapai: Lunasi kartu, ⌫ tahan = kosongkan (otomatis oleh `Tekan`).
 * - `berhasil` — transaksi tersimpan di server (otomatis: `MutationCache` di `app/_layout.tsx`,
 *                Libur/Lunasi kartu di `fitur/tagihan/aksi-kartu.ts`).
 * - `galat`    — transaksi gagal (otomatis, di tempat yang sama), bersama pesan di layar.
 *
 * Satu getar per tindakan, selalu bersama tanda visual (banyak HP mematikan getar). Gagal
 * (perangkat tanpa motor getar) diabaikan diam-diam.
 */
export type JenisGetar = "ketuk" | "pilih" | "tegas" | "tahan" | "berhasil" | "galat";

export function getar(jenis: JenisGetar = "ketuk"): void {
  const janji =
    jenis === "berhasil"
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : jenis === "galat"
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        : jenis === "pilih"
          ? Haptics.selectionAsync()
          : Haptics.impactAsync(
              jenis === "ketuk"
                ? Haptics.ImpactFeedbackStyle.Light
                : Haptics.ImpactFeedbackStyle.Medium,
            );
  void janji.catch(() => undefined);
}
