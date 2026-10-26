# `hari_kolektor` — absensi & hari lapangan seorang kolektor

**Status:** final (22 Okt 2026).

## Ringkasan

Satu baris = **satu kolektor pada satu hari**: absensi pagi (masuk atau
tidak), dana yang dibawa ke lapangan (kas lapangan & uang jalan), dan penanda
**laporan dibuka** (operasi lapangan berhenti).

Yang **tidak lagi** di sini:

| Dulu di `hari_kolektor` | Sekarang |
|---|---|
| total `transfer` (diisi kolektor) | dihitung dari [`transfer_setoran`](schema-transfer-setoran.md) (dicatat kasir per setoran) |
| serah terima kas (`tunai_seharusnya`, `tunai_diterima`, `diterima_at`, `diterima_oleh`) | tabel baru [`serah_terima_kas`](schema-serah-terima-kas.md) — kejadian uang, hanya bertambah |
| `tekor_otomatis_id` → baris tekor di `beban_kolektor` | tekor **diturunkan** dari `serah_terima_kas.selisih_setor` |

Alur satu hari:

1. **Pagi — kolektor absen**: masuk kerja (mengisi kas lapangan & uang jalan
   yang diberikan bos; bos mencocokkan di layar) atau tidak kerja (alasan
   wajib).
2. **Siang — lapangan**: setoran, akad, gulung, libur.
3. **Sore — kolektor membuka laporan**: `laporan_dibuka_at` terisi, operasi
   lapangan berhenti; angka setoran yang sudah ia baca tak bisa bergeser.
4. **Kasir mencatat transfer** per setoran (`transfer_setoran`) dan **uang
   tunai yang diterima** (`serah_terima_kas`) → tekor dihitung sistem.
5. Sesudah kas diterima, hari itu **terkunci** sampai bos membatalkan serah
   terimanya.

## Kolom

| Kolom | Tipe | Kosong? | Bawaan | Penjelasan |
|---|---|---|---|---|
| `id` | `uuid` | — | `gen_random_uuid()` | Kunci utama. |
| `kantor_id` | `uuid` | — | | Kantor pemilik. |
| `kolektor_id` | `uuid` | — | | Pemilik baris. |
| `tanggal` | `date` | — | | Hari pembukuan (kalender kantor). |
| `absensi` | enum `status_absensi` (`masuk_kerja`, `tidak_kerja`) | — | | |
| `alasan_tidak_kerja` | `varchar(100)` | ya | | Wajib saat `tidak_kerja`, kosong saat `masuk_kerja`. |
| `kas_lapangan` | `bigint` | — | `0` | Modal tunai yang dibawa ke lapangan (dari bos). |
| `uang_jalan` | `bigint` | — | `0` | Uang operasional hari itu (bensin, makan). |
| `laporan_dibuka_at` | `timestamptz` | ya | | Kolektor membuka laporan mutasi kas → operasi lapangannya berhenti. Bos boleh mengosongkannya kembali (sebelum kas diterima), dicatat di riwayat. |
| `transfer_lama` | `bigint` | ya | | **Arsip.** Total transfer hari-hari sebelum peralihan ke `transfer_setoran` (tanpa rincian nasabah). Diisi sekali saat migrasi, **tak pernah ditulis lagi**. |
| `tekor_lama` | `bigint` | ya | | **Arsip.** Total tekor manual hari-hari sebelum peralihan (dari `beban_kolektor` lama). Diisi sekali saat migrasi, tak pernah ditulis lagi — lihat [schema-biaya-tak-terduga.md](schema-biaya-tak-terduga.md#tekor-lama-sebelum-peralihan). |
| `dibuat_at` | `timestamptz` | — | `now()` | |
| `diubah_at` | `timestamptz` | — | `now()` | Disentuh tiap perubahan (laporan dibuka/dibatalkan, pembetulan bos). |

## Aturan database

| Nama | Jenis | Isi |
|---|---|---|
| `hari_kolektor_pkey` | PK | `(id)` |
| `hari_kolektor_kolektor_fk` | FK | `(kolektor_id, kantor_id)` → `pengguna(id, kolektor_kantor_id)` — pasti kolektor kantor itu. |
| `uniq_hari_kolektor_kolektor_tanggal` | UNIQUE | `(kolektor_id, tanggal)` — satu baris per kolektor per hari; "sudah absen hari ini?"; rentang tanggal satu kolektor. |
| `uniq_hari_kolektor_id_kantor` | UNIQUE | `(id, kantor_id)` — sasaran FK dari `serah_terima_kas`. |
| `idx_hari_kolektor_kantor_tanggal` | INDEX | `(kantor_id, tanggal)` — layar bos/kasir & buku kas per rentang tanggal. |
| `hari_kolektor_absensi_check` | CHECK | `(absensi = 'masuk_kerja' AND alasan_tidak_kerja IS NULL)` **atau** `(absensi = 'tidak_kerja' AND alasan_tidak_kerja IS NOT NULL AND kas_lapangan = 0 AND uang_jalan = 0 AND laporan_dibuka_at IS NULL AND transfer_lama IS NULL)` |
| `hari_kolektor_nominal_check` | CHECK | `kas_lapangan >= 0 AND uang_jalan >= 0 AND (transfer_lama IS NULL OR transfer_lama >= 0) AND (tekor_lama IS NULL OR tekor_lama > 0)` |
| `hari_kolektor_terkunci` | TRIGGER (BEFORE UPDATE) | Bila ada `serah_terima_kas` berlaku untuk baris ini: tolak perubahan `kas_lapangan`, `uang_jalan`, `laporan_dibuka_at` (`KAS_SUDAH_DITERIMA`). Jaring pengaman; service memeriksanya lebih dulu. |

## Perubahan dari skema sekarang

| Sekarang | Nanti | Alasan |
|---|---|---|
| `boss_id` | `kantor_id` | Konvensi #2. |
| `collector_id` | `kolektor_id` | Konvensi #3 — pemilik baris. |
| `status` | `absensi` | `status` bermakna ganda dengan `pinjaman.status`. Isi enum tetap. |
| `keterangan` | `alasan_tidak_kerja` | Isinya sebab — konvensi #6. |
| `kas_lapangan`, `uang_jalan` boleh kosong | `NOT NULL DEFAULT 0` | Penjumlahan tanpa `COALESCE`; tidak kerja = 0 (CHECK). |
| `transfer` (diisi kolektor) | **dibuang**; total lama → `transfer_lama` | Transfer dicatat kasir per setoran di `transfer_setoran`. |
| `laporan_at` | `laporan_dibuka_at` | Istilah pengguna ("buka laporan") + pola `<kejadian>_at`. |
| `tunai_seharusnya`, `tunai_diterima`, `diterima_at`, `diterima_oleh` | pindah ke `serah_terima_kas` | Kejadian uang: hanya bertambah, dibatalkan dengan kolom batal — bukan ditimpa kosong. |
| `tekor_otomatis_id` | **dibuang** | Tekor diturunkan dari `selisih_setor`; batal serah terima = tekornya ikut hilang. |
| `hari_kolektor_terima_check`, `…_laporan_check` (transfer) | diganti CHECK & trigger di atas | Kolom yang dijaga sudah pindah. |
| `created_at` / `updated_at` | `dibuat_at` / `diubah_at` | Konvensi #5. |

## Keputusan & timbangan

- **Serah terima dipisah** (`serah_terima_kas`): kasir hanya membuat, bos
  membatalkan; batal lalu terima ulang meninggalkan dua baris yang sama-sama
  terbaca. Membatalkan dengan menimpa kolom menjadi kosong (cara sekarang)
  menghapus bukti dari tabel uang.
- **Tekor diturunkan, tidak disimpan**: `tekor = greatest(−selisih_setor, 0)`
  pada serah terima yang berlaku. Tidak ada lagi tautan silang
  `hari_kolektor` ↔ `beban_kolektor`; tabel itu menjadi
  [`biaya_tak_terduga`](schema-biaya-tak-terduga.md) (biaya saja).
- **Kas lapangan & uang jalan tetap dicatat kolektor** saat absen (bos memberi
  uangnya & mencocokkan di layar). Pembetulan: bos saja, sebelum kas diterima,
  dicatat di `riwayat_perubahan`. Konfirmasi dua arah ditolak (keputusan
  pemilik usaha).
- **`transfer_lama` sebagai kolom arsip**, bukan tabel arsip: laporan cukup
  `coalesce(transfer_lama, 0) + Σ transfer_setoran`, tanpa satu gabungan
  tambahan; namanya terang-terangan "lama" supaya tak dipakai untuk hari baru.
- **Baris hari tetap bisa diubah** (bukan hanya bertambah): absensi & laporan
  adalah keadaan hari berjalan, bukan kejadian uang; uangnya baru "jadi" saat
  serah terima, dan sejak itu terkunci.

## Rumus

```
total transfer   = coalesce(transfer_lama, 0)
                 + Σ transfer_setoran.nominal (berlaku, transaksinya berlaku,
                     transaksi.pencatat_id = kolektor, transaksi.tanggal = hari itu)

tunai seharusnya = kas_lapangan + storting + tabungan masuk + admin − droping
                 − total transfer − Σ biaya tak terduga
                 (dibekukan di serah_terima_kas saat diterima)
```

Suku "− tekor" hilang dari rumus tunai seharusnya: tekor kini **hasil**
serah terima (kurang setor), bukan masukan.

## API nantinya

| Metode & jalur | Peran | Isi |
|---|---|---|
| `POST /lapangan/absen` | kolektor | Absen: `{ absensi: masuk_kerja, kasLapangan, uangJalan }` atau `{ absensi: tidak_kerja, alasan }`. |
| `POST /lapangan/laporan` | kolektor | Membuka laporan (tanpa angka transfer lagi). Idempoten. Ditolak `MASIH_ADA_TAGIHAN` (422) selama masih ada pinjaman wajib ditagih hari ini yang belum dicatat ([aturan-usaha C6](../aturan-usaha.md)). |
| `PATCH /hari-kolektor/:kolektorId/hari-ini` | bos | `{ kasLapangan?, uangJalan? }` (minimal satu) — hari ini, kolektor masuk kerja (`BELUM_ABSEN`, `TIDAK_KERJA_HARI_INI`), sebelum kas diterima (`KAS_SUDAH_DITERIMA`). Jejak `perbaiki_hari_kolektor`. |
| `POST /hari-kolektor/:kolektorId/laporan/batal` | bos | `{ alasan }` — membuka kembali hari kolektor (mis. nasabah libur datang membayar sore): hari ini, laporan sudah dibuka (`LAPORAN_BELUM_DIBUKA`), sebelum kas diterima. Jejak `batal_laporan` beserta alasannya. |
| `GET /hari-kolektor` | bos, kasir, pengawas: semua; kolektor: miliknya | `?kolektorId=&tanggalMulai=&tanggalSelesai=` — beserta total transfer & serah terima yang berlaku. |

Serah terima kas: lihat [schema-serah-terima-kas.md](schema-serah-terima-kas.md).
Field lama (`status`, `keterangan`, `transfer` di buka laporan) diterima sampai
aplikasi beralih.

## Service / logika nantinya

- **Absen** (kolektor): gerbang jam kerja & bukan libur kantor; satu kali per
  hari (`ABSENSI_SUDAH_ADA_HARI_INI`, dijaga juga UNIQUE).
- **Buka laporan** (kolektor): harus masuk kerja; sejak itu semua operasi
  lapangannya ditolak.
- **Pembetulan & batal laporan** (bos): hanya sebelum kas diterima
  (`KAS_SUDAH_DITERIMA`); nilai sebelum & sesudah ke `riwayat_perubahan`.
- **Terkunci sesudah kas diterima**: angka hari, laporan, transfer setoran,
  biaya tak terduga, pembatalan transaksi, dan **batal akad** kolektor itu
  hari itu ditolak sampai bos membatalkan serah terimanya.

## Catatan migrasi (tidak dijalankan di sesi desain)

1. Buat `serah_terima_kas`; pindahkan baris yang `diterima_at`-nya terisi
   (seharusnya, diterima, penerima, waktu).
2. Tekor otomatis lama (`beban_kolektor` yang ditunjuk `tekor_otomatis_id`):
   setelah dipastikan sama dengan `−selisih_setor`, tandai/arsipkan supaya
   tidak terhitung dua kali di gaji — rinciannya di [schema-biaya-tak-terduga.md](schema-biaya-tak-terduga.md#tekor-lama-sebelum-peralihan).
3. Ganti nama kolom; `transfer` → `transfer_lama`: hari-hari lama yang masuk
   kerja menyimpan totalnya apa adanya (0 tetap 0); hari tidak kerja dan semua
   hari sesudah peralihan `NULL`.
4. Isi `kas_lapangan`/`uang_jalan` kosong dengan 0, pasang `NOT NULL DEFAULT 0`.
5. Buang kolom serah terima & `tekor_otomatis_id`; pasang CHECK & trigger baru.
