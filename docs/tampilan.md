# Huruf besar-kecil — penyimpanan & tampilan

*Keputusan pemilik, 2 Nov 2026.* Berlaku untuk **web (bos) dan HP (kasir,
pengawas, kolektor)** tanpa kecuali. Tujuannya satu rupa di mana pun: data yang
sama selalu tampil dengan huruf yang sama, siapa pun yang mengetiknya.

## 1. Penyimpanan — selalu huruf kecil

Setiap teks yang diisi orang disimpan **lowercase**: nama (nasabah, karyawan,
kantor, kampung, resort, perangkat, tautan), `alasan_*`, `keterangan*`. Nilai
pilihan (enum) memang sudah huruf kecil (`masuk_kerja`, `tidak_kerja`,
`harian`, …).

| Lapis | Penjaga |
|---|---|
| Kontrak (`packages/contracts`) | Isian teks memakai `teksKecil(...)`: dirapikan (`trim`) lalu dikecilkan — apa pun yang diketik, server menerimanya huruf kecil. |
| Database | CHECK `<tabel>_huruf_kecil_check` (`kolom = lower(kolom)`) menolak huruf besar dari jalur mana pun. Konvensi skema #10 ([skema/README.md](skema/README.md)). |
| Data lama | Migrasi `huruf_kecil` mengecilkan isi yang sudah ada; salinan data aplikasi lama ikut dikecilkan saat disalin. |

Bukan teks isian, jadi **tidak** dikecilkan: kode & kunci sistem (`aksi`,
`kode` tautan, `kunci_berkas`, `tipe_mime`, hash), NIK, nomor HP.

## 2. Tampilan — aturan per jenis teks

| Jenis teks | Rupa | Contoh | Pembantu (`@opennael/format`) |
|---|---|---|---|
| **Nama** orang & kantor | huruf kecil | `budi santoso`, `nael capital` | `tampilNama` |
| **Alamat / kampung** | HURUF BESAR | `PULE BARAT` | `tampilKampung` |
| **Keterangan, alasan, caption** (teks penjelas, isi pemberitahuan) | huruf kecil, apa adanya | `sakit`, `ganti ban dalam` | `tampilKeterangan` |
| **Judul** layar, kartu, dialog, pemberitahuan | Kapital Tiap Kata | `Bayar Angsuran`, `Mutasi Kas Terkunci` | `judul` |
| **Label**: judul kolom tabel, label angka/ringkasan, label isian formulir, pilihan/chip, tab & menu navigasi, lencana status | Kapital Tiap Kata | `Tunai Diterima`, `Saldo Berjalan`, `Masuk Kerja`, `Salin Dari Buku`, `Gulung Naik` | ditulis langsung; teks yang dirangkai dari data lewat `judul` |
| **Tombol biasa** (simpan, coba lagi, menu aksi) | kalimat biasa | `Simpan akad`, `Coba lagi`, `Tarik tabungan` | — |
| **Tombol khusus kartu tagihan & judul bagian kecil** | HURUF BESAR (gaya yang sudah ada) | `KONFIRMASI`, `BAYAR`, `BIAYA TAK TERDUGA` | — |

*Diperjelas 14 Nov 2026 (keputusan pemilik): label non-tombol Kapital Tiap Kata
sampai ke judul kolom, isian, pilihan, tab, menu, dan lencana; tombol biasa tetap
kalimat biasa.*

Aturan tambahan:

- Petunjuk dalam kurung sesudah label tetap huruf kecil: `Kata Sandi (minimal 8
  karakter)`, `Keterangan (opsional)`.
- Kalimat bukan label: `placeholder`, pesan galat, keadaan kosong ("Belum ada
  nasabah"), toast, `aria-label`, serta alasan cepat yang ikut disimpan sebagai
  alasan tetap kalimat biasa.
- Avatar inisial memakai huruf besar.
- Judul kolom tabel web dijaga `bun run cek:arsitektur` (aturan
  `huruf-judul-kolom`): literal `header: "…"` yang punya kata berhuruf kecil
  setelah spasi ditolak.

- Nama yang muncul **di dalam** judul tetap huruf kecil: `Libur — budi santoso`
  (bagian tetap judulnya yang Kapital Tiap Kata; nama dirangkai sesudahnya).
- Merek aplikasi tetap **OpenNael**; satuan & singkatan tetap apa adanya
  (`Rp`, `RT 03`, `H-1`).
- Angka uang & tanggal mengikuti pembantu format yang ada (`rupiah`,
  `tanggal`), tak terpengaruh aturan ini.
- Layar tak menulis ulang aturan ini dengan `toUpperCase()`/CSS sendiri — selalu
  lewat pembantu di atas, supaya web dan HP tak menyimpang.
