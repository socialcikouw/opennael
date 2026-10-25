# Desain Ulang Skema Database — OpenNael

Dokumen di folder ini adalah **rancangan akhir** skema database hasil audit
tabel demi tabel (mulai 21 Okt 2026). Tujuannya: database yang **rapi** (tanpa
data kotor atau salinan ganda) dan **cepat**.

Setiap tabel yang sudah selesai didiskusikan punya satu berkas
`schema-<tabel>.md` berisi:

1. **Ringkasan** — gunanya tabel itu dan satu kalimat inti desainnya.
2. **Kolom** — nama, tipe, boleh kosong, bawaan, dan alasannya.
3. **Aturan database** — PK, FK, UNIQUE, CHECK, index, trigger.
4. **Perubahan dari skema sekarang** — apa yang berubah dan kenapa.
5. **Keputusan & timbangan** — pilihan yang ditimbang beserta untung-ruginya.
6. **API nantinya** dan **service/logika nantinya** — rancangan, bukan
   implementasi.
7. **Catatan migrasi** — urutan langkah bila kelak diterapkan (tidak dijalankan
   di sesi desain).

> **Asal:** disalin dari repo lama `naelcapitalAPI/docs/skema/` (branch
> `supabase`, commit `dc28ffa`, 23 Okt 2026). Di repo ini dokumen tersebut
> menjadi **acuan pembangunan**: skema database `apps/api` dibangun dari sini.
> Kolom "Sekarang" dan "Catatan migrasi" merujuk ke skema lama — dipakai saat
> memindahkan data dari sistem lama.

---

## Konvensi penamaan

Berlaku untuk semua tabel. Nama kolom di database boleh berbeda dari nama field
di API — mapper yang menerjemahkan, sehingga API bisa berganti nama terencana
mengikuti rilis aplikasi.

| # | Aturan | Contoh |
|---|---|---|
| 1 | **Kata domain bahasa Indonesia; akhiran teknis `_id` dan `_at` tetap.** | `pinjaman_id`, `dibatalkan_at` |
| 2 | **Tenant selalu `kantor_id`.** Bukan `boss_id` — kolom ini menunjuk kantor, bukan orang. | `nasabah.kantor_id` |
| 3 | **Kolektor pemilik/pemegang baris = `kolektor_id`.** | `nasabah.kolektor_id`, `hari_kolektor.kolektor_id` |
| 4 | **Orang dengan peran khusus di baris itu dinamai menurut perannya.** Satu nama tidak boleh punya dua arti. | `pinjaman.pencair_id`, `transaksi.pencatat_id` |
| 5 | **Waktu & pelaku berpasangan: `<kejadian>_at` + `<kejadian>_oleh`.** Standar setiap tabel: `dibuat_at`, `diubah_at` (+ `dibuat_oleh`, `diubah_oleh` bila perlu). | `dibatalkan_at` / `dibatalkan_oleh` |
| 6 | **`keterangan` = isi bebas; `alasan_<kejadian>` = sebab sebuah kejadian.** | `alasan_batal`, `alasan_kunci` |
| 7 | **Boolean tanpa awalan `is_`** — kata keadaan. | `aktif`, `pinjaman_baru_dikunci` |
| 8 | **Nama constraint berpola**: `<tabel>_<isi>_check`, `<tabel>_<kolom>_fk`, `uniq_<tabel>_<kolom>`, `idx_<tabel>_<kolom>`. | `kebijakan_sasaran_check` |
| 9 | **Jenis waktu terbaca dari namanya**: `timestamptz` → `*_at`; `date` → `tanggal_*` atau kata benda tanggal; jam dinding → `jam_*` bertipe `time`. | `dibuat_at`, `tanggal_akad`, `jatuh_tempo`, `jam_buka` |

### Padanan nama lama → baru (yang berlaku lintas tabel)

| Sekarang | Nanti |
|---|---|
| `boss_id` | `kantor_id` |
| `collector_id` (pemilik/pemegang) | `kolektor_id` |
| `pinjaman.collector_id` (pencair akad) | `pencair_id` |
| `transaksi.collector_id` (pencatat) | `pencatat_id` |
| `created_at` / `updated_at` | `dibuat_at` / `diubah_at` |
| `created_by`, `oleh` | `dibuat_oleh` (di `riwayat_perubahan`: `pelaku_id`) |
| `diperbarui_oleh` | `diubah_oleh` |
| `user_id` | `pengguna_id` |
| `users.kolektor_boss_id` | `kolektor_kantor_id` |
| tabel `beban_kolektor` | `biaya_tak_terduga` (tekor kini dari `serah_terima_kas`) |
| tabel `hari_libur_kantor` | `libur_kantor` |

Nama tabel `users` dan kolom-kolomnya diputuskan di audit tabel itu.

---

## Status audit

| Tabel | Status | Dokumen |
|---|---|---|
| `kantor` | **final** | [schema-kantor.md](schema-kantor.md) |
| `kebijakan` (menggantikan `kebijakan_kantor` + `kebijakan_kolektor`) | **final** | [schema-kebijakan.md](schema-kebijakan.md) |
| `pengguna` (menggantikan `users`) | **final** | [schema-pengguna.md](schema-pengguna.md) |
| `perangkat` | **final** | [schema-perangkat.md](schema-perangkat.md) |
| `tautan` | **final** | [schema-tautan.md](schema-tautan.md) |
| `wilayah` | **final** | [schema-wilayah.md](schema-wilayah.md) |
| `nasabah` | **final** | [schema-nasabah.md](schema-nasabah.md) |
| `pinjaman` | **final** | [schema-pinjaman.md](schema-pinjaman.md) |
| `foto` (baru) | **final** | [schema-foto.md](schema-foto.md) |
| `transaksi` | **final** | [schema-transaksi.md](schema-transaksi.md) |
| `transfer_setoran` (baru) | **final** | [schema-transfer-setoran.md](schema-transfer-setoran.md) |
| `koreksi_tabungan` | **final** | [schema-koreksi-tabungan.md](schema-koreksi-tabungan.md) |
| `penarikan_tabungan` (baru) | **final** | [schema-penarikan-tabungan.md](schema-penarikan-tabungan.md) |
| `riwayat_status_pinjaman` | **final** | [schema-riwayat-status-pinjaman.md](schema-riwayat-status-pinjaman.md) |
| `libur_nasabah` | **final** | [schema-libur-nasabah.md](schema-libur-nasabah.md) |
| `hari_kolektor` | **final** | [schema-hari-kolektor.md](schema-hari-kolektor.md) |
| `serah_terima_kas` (baru) | **final** | [schema-serah-terima-kas.md](schema-serah-terima-kas.md) |
| `biaya_tak_terduga` (menggantikan `beban_kolektor`) | **final** | [schema-biaya-tak-terduga.md](schema-biaya-tak-terduga.md) |
| `buku_kas` (baru; menampung `kantor.buku_kas_mulai` + kas awal) | **final** | [schema-buku-kas.md](schema-buku-kas.md) |
| `mutasi_kas_kantor` | **final** | [schema-mutasi-kas-kantor.md](schema-mutasi-kas-kantor.md) |
| `pembayaran_gaji` | **final** | [schema-pembayaran-gaji.md](schema-pembayaran-gaji.md) |
| `tarif_gaji` | **final** | [schema-tarif-gaji.md](schema-tarif-gaji.md) |
| `libur_kantor` (dulu `hari_libur_kantor`) | **final** | [schema-libur-kantor.md](schema-libur-kantor.md) |
| `posisi_harian` | **final** | [schema-posisi-harian.md](schema-posisi-harian.md) |
| `rute_kolektor` + `rute_wilayah` | **final** | [schema-rute.md](schema-rute.md) |
| `riwayat_perubahan` | **final** | [schema-riwayat-perubahan.md](schema-riwayat-perubahan.md) |
| `pencocokan_kas` (baru; usulan `hitung_kas`) | **final** | [schema-pencocokan-kas.md](schema-pencocokan-kas.md) |
| `pekan_kerja` (baru; menggantikan `kantor.hari_kerja`) | **final** | [schema-pekan-kerja.md](schema-pekan-kerja.md) |
| — | **Semua tabel sudah diaudit (23 Okt 2026)**; tinjauan ulang menyeluruh — 14 temuan diperbaiki (lihat di bawah). | — |

## Catatan untuk audit berikutnya

Temuan yang muncul saat mengaudit satu tabel tetapi menjadi urusan tabel lain.

| Tabel | Catatan | Asal |
|---|---|---|
| ~~`hari_kolektor`~~ | ~~Kas lapangan & uang jalan tetap dicatat **kolektor** saat absen (bos memberi uangnya & mencocokkan di layar). Sore: **kasir** menginput uang diterima per kolektor → tekor dihitung sistem. Transfer **dicatat kasir**, bukan kolektor. Kasir hanya membuat; edit/batal/koreksi hanya bos. Konfirmasi dua arah **ditolak**.~~ Selesai di schema-hari-kolektor.md & schema-serah-terima-kas.md. | pengguna |
| ~~`hari_kolektor`~~ | ~~Buang kolom `transfer` — total kini dihitung dari `transfer_setoran`. Putuskan cara membaca hari-hari lama (sebelum peralihan) yang hanya punya total tanpa rincian. Penerimaan kas mengunci transfer hari itu.~~ Selesai di schema-hari-kolektor.md & schema-serah-terima-kas.md. | transfer_setoran |
| ~~`beban_kolektor`~~ | ~~Biaya tak terduga tetap **per kolektor**, diinput kasir, keterangan wajib; total dihitung sistem. Tekor manual tidak lagi diinput (tekor dari uang diterima).~~ Selesai di schema-biaya-tak-terduga.md. | pengguna |
| ~~`beban_kolektor`~~ | ~~Tekor kini **diturunkan** dari `serah_terima_kas.selisih_setor` → jenis `tekor` & tautan tekor otomatis tidak dipakai lagi; tabel tinggal biaya tak terduga. Putuskan nasib baris tekor lama (manual & otomatis) supaya tak terhitung dua kali di gaji.~~ Selesai di schema-biaya-tak-terduga.md. | hari_kolektor |
| ~~kas / `pembayaran_gaji`~~ | ~~Buku kas: tunai dari `serah_terima_kas.tunai_diterima − kas_lapangan − uang_jalan`; bank dari `transfer_lama + Σ transfer_setoran`. Potongan gaji membaca tekor dari `serah_terima_kas` (+ tekor lama sebelum peralihan).~~ Selesai di dokumen kas. | hari_kolektor |
| ~~`mutasi_kas_kantor`~~ | ~~Buku kas kantor hanya bos (kasir tidak).~~ Selesai di dokumen kas. | pengguna |
| ~~antikecurangan (usulan, belum diputuskan)~~ | ~~Hitung brankas harian (`hitung_kas`: tunai dihitung vs buku, oleh siapa) dan layar "aktivitas kasir hari ini" dari `riwayat_perubahan`.~~ Selesai di schema-riwayat-perubahan.md & schema-pencocokan-kas.md. | pengguna |
| ~~`riwayat_status_pinjaman`~~ | ~~Trigger masih memakai cadangan tanggal `Asia/Jakarta` tetap, bukan zona kantor.~~ Selesai di schema-riwayat-status-pinjaman.md. | kantor |
| ~~`mutasi_kas_kantor` / `buku_kas`~~ | ~~Jenis `saldo_awal` keluar dari buku mutasi (pindah ke `buku_kas`). Pertimbangkan lebih dari satu rekening bank. Usulan angka "posisi modal" = kas + piutang aktif − tabungan nasabah (dihitung, bukan disimpan).~~ Selesai di dokumen kas. | kantor |
| ~~`libur_nasabah`~~ | ~~Arti `collector_id` (pencatat atau pemegang?) menentukan nama barunya.~~ Pencatat → `pencatat_id`; selesai di schema-libur-nasabah.md. | konvensi |
| ~~`posisi_harian`~~ | ~~"Posisi modal" = kas (tunai + bank) + kas di lapangan + piutang aktif − tabungan nasabah — dihitung, tidak disimpan.~~ Selesai di schema-posisi-harian.md. | kas |
| (prinsip lintas tabel) | **Riwayat hanya untuk data yang ditimpa atau dihapus**; tabel yang hanya bertambah adalah jejaknya sendiri (tanpa pencatatan ganda). | riwayat_perubahan |
| (prinsip lintas tabel) | **Tabel uang dibatalkan** (kolom batal, hanya bertambah); **tanda yang bukan uang dihapus**, jejaknya di `riwayat_perubahan`. | libur_nasabah |
| ~~`riwayat_status_pinjaman`~~ | ~~Trigger membaca `macet_sejak` → kini `tanggal_macet`.~~ Selesai di schema-riwayat-status-pinjaman.md. | pinjaman |
| ~~`mutasi_kas_kantor` / `buku_kas`~~ | ~~Penjumlahan buku kas ikut membaca `penarikan_tabungan` (keluar dari `dari_akun`).~~ Selesai di dokumen kas. | penarikan_tabungan |
| ~~`riwayat_perubahan`~~ | ~~Putuskan pencatatan ganda: koreksi tabungan sekarang juga ditulis sebagai jsonb di riwayat. Pertimbangkan trigger memakai fungsi umum `hanya_bertambah()` (dari koreksi_tabungan).~~ Selesai di schema-riwayat-perubahan.md & schema-pencocokan-kas.md. | koreksi_tabungan |

## Tinjauan ulang menyeluruh (23 Okt 2026)

Semua dokumen dibaca ulang untuk mencari nama atau aturan yang bertabrakan.

| # | Temuan | Perbaikan |
|---|---|---|
| 1 | Posisi modal menghitung kas lapangan dua kali (sudah termasuk saldo tunai buku). | Rumus di [schema-posisi-harian.md](schema-posisi-harian.md); kas di lapangan jadi rincian. |
| 2 | Pencocokan siang hari selalu tampak selisih: tunai berkurang sebesar kas yang dibawa kolektor; transfer baru dihitung saat serah terima. | `brankas seharusnya` = saldo tunai − kas di lapangan; bank menghitung `transfer_setoran` sejak dicatat ([schema-buku-kas.md](schema-buku-kas.md)). |
| 3 | `pencocokan_kas` punya pratinjau saldo buku padahal hitungnya buta. | Pratinjau dibuang. |
| 4 | Batal akad (uang keluar) tanpa kolom batal. | `pinjaman.dibatalkan_at/_oleh/alasan_batal` + CHECK. |
| 5 | Kunci "kas sudah diterima" tak memuat batal akad. | Ditambahkan. |
| 6 | Mengubah `kantor.hari_kerja` menggeser jadwal & tunggakan lampau. | Tabel bertanggal [`pekan_kerja`](schema-pekan-kerja.md). |
| 7 | Riwayat: persetujuan tautan dicatat di tabel yang belum ada; perangkat & jejak kebijakan lama tak sinkron. | Tautan → `pengguna`; `perangkat` tidak ditulis lagi; nama lama jadi nilai arsip. |
| 8 | Tabel hak per peran usang. | Pengawas membuat pencocokan kas; kolektor rute & titik rumah; bacaan kasir dirinci. |
| 9 | Registrasi kantor tak membuat tarif 5%; pengecualian trigger tarif keliru. | Registrasi menulis `pekan_kerja` + `tarif_gaji`; pengecualian untuk migrasi. |
| 10 | Kasir melihat tunai seharusnya sebelum menghitung. | Hitung buta; kolektor melihat hasilnya langsung. |
| 11 | Tiga FK pelaku masih tunggal. | `pengguna.dinonaktifkan_oleh`, `kebijakan.diubah_oleh`, `perangkat.diputus_oleh` → gabungan. |
| 12 | Peran "boss"/"admin" di dokumen lama. | Diganti `bos`/`kasir`/`pengawas`. |
| 13 | Padanan `oleh` di README. | `dibuat_oleh`, kecuali `riwayat_perubahan.pelaku_id`. |
| 14 | `penarikan_tabungan` tanpa FK `buku_kas`; frasa "belum ditutup". | FK ditambah; frasa dibuang. |
