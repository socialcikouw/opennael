# OpenNael — gambaran produk

Pembukuan **koperasi simpan-pinjam harian**: kantor meminjamkan uang ke
nasabah di kampung-kampung, kolektor menagih angsurannya setiap hari kerja di
lapangan, dan setiap sore uangnya diserahkan ke kantor. Aplikasi ini
menggantikan buku catatan: setiap rupiah yang keluar dan masuk tercatat, siapa
yang mencatat, dan kapan.

Rumus & aturan angka ada di [`aturan-usaha.md`](aturan-usaha.md). Rancangan
database per tabel ada di [`skema/`](skema/README.md). Alasan di balik
keputusan besar ada di [`keputusan.md`](keputusan.md).

---

## Peran & aplikasi

| Peran | Siapa | Aplikasi | Masuk dengan | Pekerjaannya |
|---|---|---|---|---|
| **Bos** | pemilik usaha | **web** | nomor HP + kata sandi | Mengelola semuanya: karyawan & HP-nya, buku kas kantor, gaji & tarif, rem pinjaman, pemutihan, libur kantor, kampung, tabungan nasabah. **Satu-satunya yang boleh menyunting, membatalkan, atau mengoreksi** catatan. |
| **Kasir** | menerima setoran sore | HP | tautan QR dari bos | Mencatat uang tunai yang diterima dari tiap kolektor, transfer nasabah per setoran, dan biaya tak terduga kolektor. **Hanya membuat** catatan — tidak pernah mengubah. |
| **Pengawas** | pemeriksa | HP | tautan QR dari bos | Membaca semua data; mencocokkan isi brankas & rekening dengan buku kas. |
| **Kolektor** | penagih lapangan | HP | tautan QR dari bos | Absen pagi, menagih setoran, membuat akad pinjaman & gulung, menandai libur nasabah, merekam titik rumah, menyusun rute kampungnya. |

Di aplikasi HP **tidak ada** login nomor HP + kata sandi atau registrasi —
karyawan masuk hanya lewat tautan QR yang disetujui bos dari web. Satu akun
karyawan tertaut ke **satu HP**; menautkan HP baru memutus HP lama.

---

## Alur satu hari

1. **Pagi — kolektor absen** di HP: masuk kerja (mencatat **kas lapangan** dan
   **uang jalan** yang diberikan bos; bos mencocokkan angkanya di layarnya)
   atau tidak kerja (dengan alasan).
2. **Siang — lapangan.** Kolektor mendatangi kampung sesuai **rute**-nya. Di
   setiap nasabah satu dari ini:
   - **bayar angsuran**;
   - **lunas** — tabungan nasabah menutup sisa saldo lebih dulu;
   - **gulung** — pinjaman lama dilunasi oleh pinjaman baru, sisanya dicairkan;
   - **akad baru** untuk orang baru atau nasabah lama yang meminjam lagi —
     dengan **foto serah terima** (nasabah memegang uangnya);
   - **libur** — nasabah tidak ditagih hari ini.

   Satu pinjaman hanya punya **satu peristiwa per hari**.
3. **Sore — kolektor membuka laporan.** Sejak itu operasi lapangannya berhenti,
   supaya angka setoran yang sudah ia baca tidak bergeser lagi.
4. **Kasir menerima setoran:** mencatat setoran mana yang dibayar lewat
   **transfer**, **biaya tak terduga** (service motor, ban bocor) dengan
   keterangan, lalu **uang tunai yang diterima** — tanpa melihat angka
   seharusnya (hitung buta). Sistem menghitung **tekor** (kurang setor) atau
   **lebih setor**; kolektor langsung melihat hasilnya di HP-nya.
5. **Hari terkunci** sesudah kas diterima: angka hari itu, transfer, biaya, dan
   pembatalan tidak bisa diubah lagi kecuali bos membatalkan penerimaannya.
6. **Tengah malam — tutup hari** (otomatis): pinjaman dinilai macet atau pulih,
   dan potret portofolio setiap kolektor disimpan.

Di luar alur harian, bos mengelola **buku kas kantor** (setor/tarik modal, biaya
kantor, pindah tunai ↔ bank), **membayar gaji** kolektor per periode, dan
pengawas sesekali **mencocokkan kas** (menghitung brankas, memeriksa saldo
rekening).

---

## Pinjaman

| Jenis | Cara bayar |
|---|---|
| **Harian** | 24 kali, setiap hari kerja |
| **Mingguan** | 6, 8, atau 10 kali, sekali seminggu pada hari akad |
| **Tempoan** | sekali bayar pada jatuh tempo (7, 10, atau 14 hari) |

| Asal | Arti |
|---|---|
| **Baru** | pinjaman pertama, atau pinjam lagi sesudah lunas |
| **Gulung** | pinjaman lama yang belum lunas dilunasi pinjaman baru |
| **Migrasi** | disalin dari pembukuan lama — tanpa uang keluar |

| Status | Arti |
|---|---|
| **Berjalan** | sedang ditagih |
| **Macet** | setoran terlalu sedikit (dinilai tiap malam; bisa pulih) |
| **Lunas** | saldo habis |
| **Digulung** | dilunasi pinjaman penerusnya |
| **Batal** | akad salah input, dibatalkan bos di hari akad |
| **Diputihkan** | piutang dihapus bos (macet lama, meninggal, …); nasabahnya diblokir |

**Tabungan nasabah** menumpuk lintas pinjaman (dipotong dari setiap pencairan)
dan keluar saat pelunasan — atau atas keputusan bos (penarikan tabungan).

---

## Istilah

| Istilah | Arti |
|---|---|
| **Akad** | perjanjian pinjaman; saat uang pinjaman diserahkan ke nasabah |
| **Angsuran** | nominal satu kali bayar |
| **Biaya tak terduga** | biaya lapangan yang ditanggung kantor (service motor, ban bocor), dicatat kasir per kolektor |
| **Blokir** | nasabah tak bisa akad baru (otomatis saat pinjamannya diputihkan) |
| **Buku kas** | catatan uang kantor — akun **tunai** (brankas) dan **bank** (satu rekening) |
| **Droping** | pokok pinjaman yang keluar: **drop baru** (uang baru) + **drop gulung** (bagian yang memutar pinjaman lama) |
| **Gulung tetap / naik / turun** | pokok pinjaman penerus sama / lebih besar / lebih kecil dari pinjaman asal |
| **Hari kolektor** | satu kolektor pada satu hari: absensi, kas lapangan, laporan, serah terima |
| **Kampung (wilayah)** | daerah tagih nasabah — kampung, dusun, perumahan, pasar |
| **Kas lapangan** | modal tunai yang dibawa kolektor ke lapangan pagi hari |
| **Kebijakan (rem)** | saklar bos untuk mengunci akad baru, gulung naik, atau semua gulung — per kantor, kolektor, atau nasabah |
| **Lebih setor** | uang yang diserahkan melebihi seharusnya |
| **Pekan kerja** | hari kerja kantor dalam sepekan (mis. Senin–Sabtu), bertanggal |
| **Pemutihan** | piutang yang dihapus bos; saldo & tabungan tak disentuh |
| **Pencairan** | uang yang benar-benar diterima nasabah saat akad (pokok dikurangi potongan & saldo lama) |
| **Pencocokan kas** | menghitung uang nyata (brankas/rekening) lalu membandingkannya dengan buku |
| **Posisi modal** | kas + piutang aktif − tabungan nasabah |
| **Potongan admin** | potongan jasa saat pencairan — pendapatan kantor |
| **Resort** | label wilayah kerja kolektor (tampilan saja) |
| **Rute** | urutan kampung yang didatangi seorang kolektor |
| **Saldo** | sisa yang masih harus dibayar nasabah atas satu pinjaman |
| **Serah terima kas** | kasir menerima uang tunai dari kolektor di sore hari |
| **Setoran murni** | angsuran yang dibayar nasabah |
| **Setoran pelunasan** | bagian yang mengurangi saldo di luar setoran murni (uang lebih, tutupan tabungan, atau tutupan gulung) |
| **Storting** | uang setoran yang masuk: setoran murni + setoran pelunasan − tabungan keluar |
| **Tekor** | uang yang diserahkan kurang dari seharusnya — dipotong dari gaji kolektor |
| **Tempoan** | pinjaman sekali bayar pada jatuh tempo |
| **Transfer setoran** | bagian setoran yang dibayar nasabah lewat transfer ke rekening kantor |
| **Tutup hari** | sapuan otomatis tengah malam: nilai macet & potret portofolio |
| **Uang jalan** | uang operasional kolektor hari itu (bensin, makan) |
