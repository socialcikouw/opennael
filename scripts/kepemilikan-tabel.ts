/**
 * DATA PEMERIKSA ARSITEKTUR — kepemilikan tabel (docs/arsitektur/struktur.md
 * §4.2) dan graf antar-konteks API (§4.1). Hanya pemilik yang menulis
 * (`insert`/`update`/`delete`) tabelnya; konteks lain memanggil operasi
 * publik pemilik. Tabel baru WAJIB didaftarkan di sini (pemeriksa menolak
 * tabel tanpa pemilik) — skill `tabel-baru` mengingatkannya.
 */

/** Nama tabel di database → konteks pemilik (`platform` = kemampuan teknis, bukan konteks usaha). */
export const PEMILIK_TABEL: Readonly<Record<string, string>> = {
  // identitas
  pengguna: "identitas",
  perangkat: "identitas",
  tautan: "identitas",
  // kantor
  kantor: "kantor",
  pekan_kerja: "kantor",
  libur_kantor: "kantor",
  kebijakan: "kantor",
  wilayah: "kantor",
  // hari-kolektor
  hari_kolektor: "hari-kolektor",
  serah_terima_kas: "hari-kolektor",
  transfer_setoran: "hari-kolektor",
  biaya_tak_terduga: "hari-kolektor",
  rute_kolektor: "hari-kolektor",
  rute_wilayah: "hari-kolektor",
  // pembiayaan
  nasabah: "pembiayaan",
  pinjaman: "pembiayaan",
  transaksi: "pembiayaan",
  libur_nasabah: "pembiayaan",
  riwayat_status_pinjaman: "pembiayaan",
  koreksi_tabungan: "pembiayaan",
  penarikan_tabungan: "pembiayaan",
  foto: "pembiayaan",
  posisi_harian: "pembiayaan",
  // kas
  buku_kas: "kas",
  mutasi_kas_kantor: "kas",
  pencocokan_kas: "kas",
  // penggajian
  tarif_gaji: "penggajian",
  pembayaran_gaji: "penggajian",
  // platform
  riwayat_perubahan: "platform",
  operasi_idempoten: "platform",
};

/**
 * Pengecualian penulisan lintas pemilik, dicatat satu per satu (pedoman §5
 * aturan 7; struktur.md §4.3): pemilik baris yang DIRUJUK boleh memindahkan
 * atau menghapus rujukan ke barisnya dalam transaksi yang sama.
 */
export const PENGECUALIAN_TULIS: readonly {
  berkas: string;
  tabel: readonly string[];
  alasan: string;
}[] = [
  {
    berkas: "modul/kantor/wilayah/layanan.ts",
    tabel: ["nasabah", "rute_kolektor", "rute_wilayah"],
    alasan:
      "gabung/hapus kampung memindahkan nasabah dan rute yang merujuk wilayah itu; memanggil operasi pembiayaan/hari-kolektor dari kantor akan membuat siklus",
  },
];

/**
 * Konteks API yang boleh diimpor (lewat `index.ts`-nya) oleh konteks lain —
 * panah di graf struktur.md §4.1. Panah baru harus dicatat di sini dan di
 * dokumen; panah yang membuat siklus ditolak.
 */
export const IMPOR_KONTEKS_BOLEH: Readonly<Record<string, readonly string[]>> = {
  kantor: [],
  "hari-kolektor": ["kantor"],
  pembiayaan: ["hari-kolektor", "kantor"],
  kas: ["kantor"],
  penggajian: ["kantor"],
  pelaporan: ["kantor"],
  migrasi: ["pembiayaan", "kantor"],
  identitas: ["kantor", "penggajian"],
};
