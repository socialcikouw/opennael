# `nasabah` — orangnya

**Status:** final (22 Okt 2026).

## Ringkasan

Satu baris = **satu orang** peminjam di satu kantor, terpisah dari pinjamannya
(`pinjaman`). Pinjamannya berderet di `pinjaman` dengan `pinjaman_ke` yang
terus berlanjut; tabungannya menumpuk lintas pinjaman di sini.

Identitas: **nama** (boleh kembar), **NIK** (satu-satunya penunjuk pasti satu
orang, opsional), **kampung** (`wilayah_id`), **titik rumah** (GPS), dan
**nomor HP**. Pemegangnya saat ini adalah satu kolektor.

## Kolom

| Kolom | Tipe | Kosong? | Bawaan | Penjelasan |
|---|---|---|---|---|
| `id` | `uuid` | — | `gen_random_uuid()` | Kunci utama. |
| `kantor_id` | `uuid` | — | | Kantor pemilik. |
| `kolektor_id` | `uuid` | — | | Kolektor **pemegang** saat ini — satu-satunya sumber "pemegang" (layar kerja, rute, izin kolektor). Pencair akad (`pinjaman.pencair_id`) dan pencatat setoran (`transaksi.pencatat_id`) adalah fakta sejarah dan tidak ikut pindah. |
| `nama` | `varchar(50)` | — | | Nama nasabah; tidak unik. |
| `wilayah_id` | `uuid` | — | | Kampungnya. Nama kampung hanya tersimpan di `wilayah`. |
| `nomor_hp` | `varchar(16)` | ya | | E.164 (`+628…`). Server mengubah `08…` yang diketik menjadi `+628…`. |
| `nik` | `varchar(16)` | ya | | NIK 16 digit; unik per kantor bila diisi. Disimpan polos; selain bos melihatnya tersamar (`••••••••••••0101`). |
| `latitude` | `double precision` | ya | | Lintang titik rumah, direkam HP kolektor di depan rumah. |
| `longitude` | `double precision` | ya | | Bujur titik rumah. |
| `akurasi_meter` | `smallint` | ya | | Akurasi GPS (meter) dari HP. |
| `saldo_tabungan` | `bigint` | — | `0` | Saldo tabungan berjalan milik orangnya (lihat aturan di bawah). |
| `foto_ktp_id` | `uuid` | ya | | Foto KTP terakhir (opsional), lihat [schema-foto.md](schema-foto.md). Foto wajah nasabah = foto serah terima pinjaman terakhirnya (diturunkan). |
| `diblokir_at` | `timestamptz` | ya | | Terisi = tak bisa akad baru (otomatis saat pinjamannya diputihkan). |
| `diblokir_oleh` | `uuid` | ya | | Bos yang memutihkan / memblokir. |
| `alasan_blokir` | `varchar(200)` | ya | | Mis. "pinjaman ke-24 diputihkan (meninggal)" — huruf kecil (konvensi #10). |
| `dibuat_at` | `timestamptz` | — | `now()` | |
| `diubah_at` | `timestamptz` | — | `now()` | |

### `saldo_tabungan` — cache yang disengaja

Saldo ini adalah penjumlahan riwayat yang terus tumbuh, sehingga disimpan
sebagai saldo berjalan (dibaca di setiap kartu tanpa menjumlah). Ia hanya boleh
berubah **di transaksi database yang sama** dengan baris penyebabnya, sehingga
selalu cocok dengan rumus:

```
saldo_tabungan = Σ pinjaman.tabungan_masuk  (akad & salinan, yang tidak batal)
               − Σ transaksi.tabungan_keluar (pelunasan, yang tidak batal)
               − Σ penarikan_tabungan.nominal (diserahkan bos, yang tidak batal)
               + Σ koreksi_tabungan.selisih (koreksi bos)
```

Koreksi tangan bos tidak menimpa angka ini — ia menulis baris
`koreksi_tabungan` lalu menggeser saldo sebesar selisihnya
([schema-koreksi-tabungan.md](schema-koreksi-tabungan.md)). Uang tabungan
yang benar-benar diserahkan di luar pelunasan dicatat di
[schema-penarikan-tabungan.md](schema-penarikan-tabungan.md). Tidak ada VIEW
riwayat tabungan (keputusan pemilik usaha).

## Aturan database

| Nama | Jenis | Isi |
|---|---|---|
| `nasabah_pkey` | PK | `(id)` |
| `nasabah_kantor_fk` | FK | `kantor_id` → `kantor(id)` |
| `nasabah_kolektor_fk` | FK | `(kolektor_id, kantor_id)` → `pengguna(id, kolektor_kantor_id)` — pemegang pasti kolektor kantor itu. |
| `nasabah_wilayah_fk` | FK | `(wilayah_id, kantor_id)` → `wilayah(id, kantor_id)` |
| `nasabah_diblokir_oleh_fk` | FK | `(diblokir_oleh, kantor_id)` → `pengguna(id, kantor_id)` |
| `nasabah_foto_ktp_fk` | FK | `(foto_ktp_id, kantor_id)` → `foto(id, kantor_id)` |
| `uniq_nasabah_id_kantor` | UNIQUE | `(id, kantor_id)` — sasaran FK gabungan dari `pinjaman`, `kebijakan`, dsb. |
| `uniq_nasabah_kantor_nik` | UNIQUE parsial | `(kantor_id, nik) WHERE nik IS NOT NULL` |
| `idx_nasabah_kolektor_nama` | INDEX | `(kolektor_id, nama)` — nasabah satu kolektor, urut nama. |
| `idx_nasabah_kantor_nama` | INDEX | `(kantor_id, nama)` — daftar nasabah seluruh kantor (bos). |
| `idx_nasabah_wilayah` | INDEX | `(wilayah_id)` — gabung wilayah, jumlah nasabah per kampung. |
| `idx_nasabah_kunci_nama` | INDEX ekspresi | `(kantor_id, wilayah_id, lower(btrim(regexp_replace(nama, '\s+', ' ', 'g'))))` — "mungkin nasabah lama?" saat kolektor mengetik formulir orang baru. |
| `nasabah_saldo_tabungan_check` | CHECK | `saldo_tabungan >= 0` |
| `nasabah_nik_check` | CHECK | `nik IS NULL OR nik ~ '^[0-9]{16}$'` |
| `nasabah_nomor_hp_check` | CHECK | `nomor_hp IS NULL OR nomor_hp ~ '^\+[0-9]{8,15}$'` |
| `nasabah_lokasi_check` | CHECK | latitude, longitude, akurasi terisi semua (lintang −11…6, bujur 95…141, akurasi > 0) atau kosong semua. Setiap kolom ditulis `IS NOT NULL` terang — CHECK meloloskan NULL. |
| `nasabah_blokir_check` | CHECK | ketiga penanda blokir terisi bersamaan atau kosong bersamaan. |

## Perubahan dari skema sekarang

| Sekarang | Nanti | Alasan |
|---|---|---|
| `boss_id`, `collector_id` | `kantor_id`, `kolektor_id` | Konvensi #2, #3. |
| `nomor_hp` bebas (`08…` / `+62…`) | E.164 + CHECK | Satu bentuk per nomor; tombol WA/telepon & pencarian tepat. Seragam dengan `pengguna`. |
| `akurasi_m` | `akurasi_meter` | Satuan terbaca. |
| `tabungan` | `saldo_tabungan` | Isinya saldo berjalan; membedakan dari `pinjaman.tabungan_masuk` & `transaksi.tabungan_keluar`. |
| FK `diblokir_oleh` → `users(id)` | FK gabungan `(diblokir_oleh, kantor_id)` | Pemblokir pasti orang kantor itu. |
| index `(collector_id, wilayah_id, nama)` | `(kolektor_id, nama)` | Urutan per kampung dibaca dari nama kampung (join), bukan `wilayah_id`; yang dipakai saringan kolektor + urutan nama. |
| — | index ekspresi kunci nama | Pencarian "mungkin nasabah lama?" berjalan tiap ketikan; tanpa index ia memindai seluruh nasabah kantor. |
| `created_at`, `updated_at` | `dibuat_at`, `diubah_at` | Konvensi #5. |
| — | `foto_ktp_id` (opsional) | Fitur foto 22 Okt 2026; KTP milik orangnya, bukan satu akad. |

## Keputusan & timbangan

- **Tanpa `dibuat_oleh`**: nasabah selalu lahir bersama pinjaman pertamanya,
  dan `pinjaman.dibuat_oleh` sudah mencatat pendaftarnya.
- **Tanpa kolom status**: aktif/tidaknya nasabah diturunkan dari pinjamannya.
- **Perpindahan pemegang** dicatat di `riwayat_perubahan`, bukan tabel khusus —
  sejarah uang per kolektor sudah ada di `pinjaman.pencair_id` dan
  `transaksi.pencatat_id`.
- **NIK polos** (enkripsi ditunda), **titik rumah saja** (bukan cap lokasi per
  transaksi), **blokir di sini** (bukan di `kebijakan`) — keputusan 21 Okt.
- **Pencarian potongan nama** (`ilike '%sari%'`) tanpa index khusus selama
  satu kantor < ±50 ribu nasabah; lewat dari itu, pertimbangkan index
  trigram (`pg_trgm`).

## API nantinya

| Metode & jalur | Peran | Isi |
|---|---|---|
| `GET /nasabah` | bos, pengawas: semua; kolektor: miliknya; kasir: nama & kampung saja (memilih nasabah transfer) | `?search=&kolektorId=&bebas=true` (`bebas` = boleh meminjam lagi: tak punya pinjaman aktif & tak diblokir). |
| `GET /nasabah/serupa` | bos, kolektor | `?nama=&alamat=&nik=` — "mungkin nasabah lama?" sebelum akad. |
| `PATCH /nasabah/:id` | bos | Identitas: `nama`, kampung (`wilayahId` atau `alamat`), `nomorHp`, `nik` (`null` = hapus). Menggantikan bagian identitas `PATCH /pinjaman/:id`. |
| `PUT /nasabah/:id/lokasi` | bos, kolektor pemegang | `{ latitude, longitude, akurasiMeter }` |
| `POST /nasabah/:id/pindah` | bos | `{ kolektorId }` — pindah pemegang. |
| `GET /nasabah/:id/neraca` | bos, pengawas | Arus kas, tabungan, piutang — bahan menimbang pemutihan. |
| `GET /nasabah/:id/buku` | bos, pengawas; kolektor: pegangannya | Identitas + semua pinjaman + semua peristiwa — lihat [schema-transaksi.md](schema-transaksi.md). |
| `POST /nasabah/:id/buka-blokir` | bos | `{ alasan }` |

Kartu pinjaman tetap membawa identitas nasabah (`nama`, `alamat` = nama
kampung, `wilayah` = kunci, `nomorHp`, `nik` tersamar, titik rumah,
`tabungan`). Field API lama (`tabungan`, `akurasiM`) dipertahankan sampai
aplikasi beralih.

## Service / logika nantinya

- **Mendaftarkan orang baru** (akad kolektor / salinan bos): kampung
  dipastikan (dipilih atau dibuat); **deteksi daftar ulang** — NIK yang sudah
  terdaftar ditolak (`NIK_SUDAH_TERDAFTAR`, atau `NASABAH_DIBLOKIR` bila milik
  nasabah yang diblokir); nama & kampung sama dengan nasabah yang diblokir
  ditolak (`NASABAH_MIRIP_DIBLOKIR`) kecuali keduanya ber-NIK dan berbeda.
- **Nomor HP**: `08…` → `+628…`, `62…` → `+62…`, sebelum disimpan.
- **Tabungan** hanya bergeser bersama penyebabnya (akad, pelunasan, koreksi,
  pembatalan), di transaksi yang sama.
- **Membetulkan identitas** (bos): setiap kolom yang berubah dicatat di
  `riwayat_perubahan`; NIK di jejak disimpan tersamar.
- **Pindah pemegang** (bos): kunci pinjaman aktif nasabah (`FOR UPDATE`) supaya
  tak berbalapan dengan setoran yang sedang dicatat; ganti `kolektor_id`;
  catat di `riwayat_perubahan`. Kunci `kebijakan` lapis nasabah ikut
  nasabahnya.
- **Blokir** otomatis saat pemutihan; dibuka bos, atau saat pemutihan
  terakhirnya dibatalkan.
- **Rekam titik rumah**: kolektor pemegang (dari depan rumah) atau bos; nilai
  lama tercatat di riwayat.

## Catatan migrasi (tidak dijalankan di sesi desain)

1. Ganti nama `boss_id` → `kantor_id`, `collector_id` → `kolektor_id`,
   `akurasi_m` → `akurasi_meter`, `tabungan` → `saldo_tabungan`,
   `created_at`/`updated_at` → `dibuat_at`/`diubah_at`; ganti nama constraint
   & index.
2. Normalkan `nomor_hp` lama ke E.164 (`08…` → `+628…`); nomor yang tak bisa
   dinormalkan dikosongkan dan dicatat untuk diperiksa; lalu pasang CHECK.
3. Ganti FK `diblokir_oleh` menjadi gabungan.
4. Ganti index `(collector_id, wilayah_id, nama)` → `(kolektor_id, nama)`;
   buat index ekspresi kunci nama (`CREATE INDEX CONCURRENTLY` di produksi).
