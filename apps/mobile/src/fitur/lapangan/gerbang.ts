import type { useHariIni } from "./data";

type KeadaanHariIni = NonNullable<ReturnType<typeof useHariIni>["data"]>;

/**
 * Gerbang lapangan (C4) dibaca di HP — hanya untuk menjelaskan & menonaktifkan
 * tombol lebih awal; server tetap yang memutuskan.
 */
export function bacaGerbang(k: KeadaanHariIni): {
  buka: boolean;
  /** Belum absen: tampilkan formulir absen. */
  perluAbsen: boolean;
  judul?: string;
  isi?: string;
} {
  const { kalender, hari } = k;
  if (kalender.liburKantor) {
    return { buka: false, perluAbsen: false, judul: "Libur kantor", isi: kalender.liburKantor };
  }
  if (!kalender.hariKerja) {
    return {
      buka: false,
      perluAbsen: false,
      judul: "Bukan hari kerja",
      isi: "Lapangan tutup hari ini.",
    };
  }
  if (!hari) {
    return kalender.dalamJamKerja
      ? { buka: false, perluAbsen: true }
      : {
          buka: false,
          perluAbsen: false,
          judul: "Di luar jam kerja",
          isi: "Absen & catatan lapangan dibuka pada jam kerja kantor.",
        };
  }
  if (hari.absensi === "tidak_kerja") {
    return {
      buka: false,
      perluAbsen: false,
      judul: "Anda tidak kerja hari ini",
      isi: hari.alasanTidakKerja ?? undefined,
    };
  }
  if (hari.laporanDibukaAt) {
    return {
      buka: false,
      perluAbsen: false,
      judul: "Laporan sudah dibuka",
      isi: "Catatan lapangan hari ini sudah ditutup.",
    };
  }
  if (!kalender.dalamJamKerja) {
    return {
      buka: false,
      perluAbsen: false,
      judul: "Di luar jam kerja",
      isi: "Catatan lapangan dibuka pada jam kerja kantor.",
    };
  }
  return { buka: true, perluAbsen: false };
}
