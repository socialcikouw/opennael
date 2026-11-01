# `libur_nasabah` — pinjaman yang tidak ditagih hari itu

**Status:** final (22 Okt 2026).

## Ringkasan

Satu baris = **kolektor menandai satu pinjaman tidak ditagih pada satu hari**
(nasabah sakit, pergi, dan sejenisnya). Hanya libur manual — hari tagih
dihitung dari kalender kerja kantor, bukan dari jumlah baris.

Tanda ini dibaca di:

- **jadwal tagih** — harian: hari libur tidak dihitung sebagai hari wajib
  bayar (aturan macet); mingguan: minggu libur dilewati, jadwal bergeser;
- **gerbang peristiwa** — satu pinjaman satu hari hanya punya satu peristiwa:
  bayar, lunas, gulung, **atau** libur;
- kartu, grid setoran bulanan, dan Buku nasabah.

Tabel sendiri, bukan jenis di `transaksi`: libur bukan uang masuk, dan
mencampurnya memaksa setiap agregat uang mengecualikannya.

## Kolom

| Kolom | Tipe | Kosong? | Bawaan | Penjelasan |
|---|---|---|---|---|
| `id` | `uuid` | — | `gen_random_uuid()` | Kunci utama. |
| `kantor_id` | `uuid` | — | | Kantor pemilik. |
| `pencatat_id` | `uuid` | — | | Kolektor yang **menandai** — fakta sejarah, tak ikut pindah bila nasabah dialihkan (sama dengan `transaksi.pencatat_id`). Pemegang sekarang dibaca dari `nasabah.kolektor_id`. |
| `pinjaman_id` | `uuid` | — | | |
| `tanggal` | `date` | — | | Hari pembukuan (kalender kantor). |
| `alasan_libur` | `varchar(100)` | ya | | Sebab libur, opsional — kolektor cukup satu sentuhan di lapangan. |
| `dibuat_at` | `timestamptz` | — | `now()` | Tidak ada `diubah_at` — tanda tidak disunting (salah → dihapus). |

## Aturan database

| Nama | Jenis | Isi |
|---|---|---|
| `libur_nasabah_pkey` | PK | `(id)` |
| `libur_nasabah_pencatat_fk` | FK | `(pencatat_id, kantor_id)` → `pengguna(id, kolektor_kantor_id)` — pencatat pasti kolektor kantor itu. |
| `libur_nasabah_pinjaman_fk` | FK | `(pinjaman_id, kantor_id)` → `pinjaman(id, kantor_id)` |
| `uniq_libur_nasabah_pinjaman_tanggal` | UNIQUE | `(pinjaman_id, tanggal)` — satu libur per pinjaman per hari; jalur baca jadwal, kartu, Buku. |
| `idx_libur_nasabah_pencatat_tanggal` | INDEX | `(pencatat_id, tanggal)` — libur yang ditandai seorang kolektor (rekap bos). |
| `idx_libur_nasabah_kantor_tanggal` | INDEX | `(kantor_id, tanggal)` — rekap kantor per rentang tanggal. |
| `libur_nasabah_bentrok` | TRIGGER (BEFORE INSERT) | Tolak bila pinjaman itu sudah punya **transaksi berlaku** di tanggal yang sama (`PERISTIWA_SUDAH_ADA`). Lewat `uniq_transaksi_pinjaman_tanggal`. |
| `transaksi_bentrok_libur` | TRIGGER (BEFORE INSERT, di `transaksi`) | Pasangannya: tolak transaksi bila pinjaman itu sudah ditandai libur di tanggal yang sama. Lewat `uniq_libur_nasabah_pinjaman_tanggal`. |

Trigger bentrok adalah **jaring pengaman** (bug, skrip, SQL tangan). Dua
pencatatan bersamaan tetap dicegah service yang memegang kunci baris pinjaman
(`SELECT … FOR UPDATE`) — trigger tanpa kunci bisa sama-sama lolos.

## Perubahan dari skema sekarang

| Sekarang | Nanti | Alasan |
|---|---|---|
| `boss_id` | `kantor_id` | Konvensi #2. |
| `collector_id` | `pencatat_id` | Isinya kolektor yang menandai (`actor.userId`), bukan pemegang — konvensi #4. |
| `keterangan` | `alasan_libur` | Isinya sebab sebuah kejadian — konvensi #6. |
| `created_at` | `dibuat_at` | Konvensi #5. |
| FK `…_collector_tenant_fk`, `…_pinjaman_tenant_fk` | `libur_nasabah_pencatat_fk`, `libur_nasabah_pinjaman_fk` | Konvensi #8. |
| Index `(collector_id, tanggal)`, `(boss_id, tanggal)` | `(pencatat_id, tanggal)`, `(kantor_id, tanggal)` | Ikut nama kolom. |
| Bentrok libur–transaksi hanya dijaga service | + trigger dua arah | Jaring pengaman di database. |

## Keputusan & timbangan

- **Libur salah dihapus, bukan dibatalkan.** Prinsipnya: *tabel uang
  dibatalkan; tanda yang bukan uang dihapus, jejaknya di `riwayat_perubahan`.*
  Libur dibaca di banyak tempat (jadwal macet, kartu, grid, Buku, gerbang);
  dengan kolom batal setiap pembaca wajib menyaring `dibatalkan_at IS NULL`, dan
  satu yang lupa diam-diam merusak perhitungan macet. Penghapusan jarang (bos,
  hari yang sama).
- **`alasan_libur` opsional**: mewajibkannya menambah repot di lapangan tanpa
  mencegah kecurangan (kolektor yang menerima uang lalu menandai libur).
  Pencegahnya adalah rekap libur per kolektor untuk bos.
- **Tanpa GPS kolektor** saat menandai — alasan yang sama.
- **Nama tabel tetap** `libur_nasabah` — istilah lapangan, berpasangan dengan
  [`libur_kantor`](schema-libur-kantor.md).
- Aturan "angsuran terbayar 0 atau 1 belum boleh libur" **dijaga server**
  (keputusan pemilik 23 Okt 2026; [aturan-usaha.md](../aturan-usaha.md) G3) —
  dulu hanya di aplikasi kolektor. Bukan urusan skema (dibaca dari
  `pinjaman.angsuran_ke`).

## API nantinya

Tetap seperti sekarang; field berganti nama mengikuti rilis aplikasi.

| Metode & jalur | Peran | Isi |
|---|---|---|
| `POST /lapangan/libur` | kolektor | `{ pinjamanId, alasan? }` (field lama `keterangan` diterima sampai aplikasi beralih). |
| `POST /transaksi/libur/:id/hapus` | bos | `{ alasan }` — hanya hari itu. |
| `GET /transaksi/peristiwa`, grid bulanan, `GET /nasabah/:id/buku` | sesuai peran | Libur ikut sebagai peristiwa bernominal nol. |

Respons: `bossId` → `kantorId`, `collectorId` → `pencatatId`, `keterangan` →
`alasanLibur`, `createdAt` → `dibuatAt` — diganti terencana bersama aplikasi.

## Service / logika nantinya

- **Menandai** (kolektor): gerbang lapangan (jam kerja, bukan libur kantor,
  sudah absen); kunci baris pinjaman; pinjaman masih ditagih; tempoan hanya
  sejak jatuh tempo (`LIBUR_TIDAK_BERLAKU`) dan wajib beralasan
  (`ALASAN_LIBUR_WAJIB`) — aturan-usaha G1, 1 Nov 2026; mingguan hanya pada
  hari tagihnya (`LIBUR_BUKAN_HARI_TAGIH`); angsuran terbayar minimal 2
  (`LIBUR_BELUM_BOLEH`, bukan untuk tempoan); belum ada peristiwa hari itu.
- **Menghapus** (bos, hari yang sama, `BATAL_HANYA_HARI_INI`): hapus baris dan
  catat jejak di `riwayat_perubahan` (isi baris + alasan) di transaksi
  database yang sama. Sesudahnya kolektor bisa mencatat setoran.
- **Rekap libur per kolektor** (bahan bos memantau kolektor yang terlalu sering
  menandai libur) dibaca dari `idx_libur_nasabah_pencatat_tanggal`.

## Catatan migrasi (tidak dijalankan di sesi desain)

1. Ganti nama kolom, constraint, dan index.
2. Ganti FK pencatat ke `pengguna(id, kolektor_kantor_id)`.
3. Periksa data lama bentrok libur–transaksi berlaku pada pinjaman & tanggal
   yang sama (seharusnya nol); lalu pasang kedua trigger.
