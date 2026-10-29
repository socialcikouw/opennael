# `posisi_harian` — potret portofolio kolektor saat hari ditutup

**Status:** final (23 Okt 2026).

## Ringkasan

Satu baris = **potret portofolio satu kolektor (pemegang) untuk satu jenis
pinjaman pada penutupan satu hari**: berapa pinjaman berjalan & macet, saldonya,
dan jumlah angsurannya. Ditulis **sapuan tengah malam** saat menutup hari itu.

Pembacanya: layar Performa (patokan = angsuran berjalan kemarin), grafik
harian, selisih piutang antar hari, dan **posisi modal** pada tanggal lampau.

Per jenis (`harian`, `mingguan`, `tempoan`), bukan satu baris gabungan:
kewajiban ketiganya tidak jatuh pada hari yang sama, jadi angsurannya tidak
bermakna bila dijumlah. Yang butuh total tinggal menjumlahkan.

### Kenapa disimpan (cache yang disengaja)

Status & saldo lampau kini bisa dibaca dari `riwayat_status_pinjaman` dan
`transaksi.saldo_sesudah`, tetapi potret tetap perlu karena:

1. **Pemegang pada tanggal lampau** tidak tersimpan rapi — `nasabah.kolektor_id`
   hanya pemegang sekarang; pindah pemegang hanya berjejak jsonb di
   `riwayat_perubahan`. Potret membekukan "siapa memegang apa" hari itu.
2. **Kecepatan** — grafik 30 hari cukup membaca beberapa ratus baris kecil,
   bukan menghitung ulang status & saldo seluruh pinjaman 30 kali.

## Kolom

| Kolom | Tipe | Kosong? | Bawaan | Penjelasan |
|---|---|---|---|---|
| `kantor_id` | `uuid` | — | | Kantor pemilik. |
| `kolektor_id` | `uuid` | — | | Kolektor **pemegang** saat penutupan hari itu. |
| `tanggal` | `date` | — | | Hari yang ditutup (kalender kantor). |
| `jenis` | enum `jenis_pinjaman` | — | | `harian`, `mingguan`, `tempoan`. |
| `jumlah_berjalan` | `integer` | — | `0` | Banyaknya pinjaman berjalan. |
| `jumlah_macet` | `integer` | — | `0` | Banyaknya pinjaman macet. |
| `saldo_berjalan` | `bigint` | — | `0` | Σ saldo pinjaman berjalan. |
| `saldo_macet` | `bigint` | — | `0` | Σ saldo pinjaman macet. |
| `angsuran_berjalan` | `bigint` | — | `0` | Σ angsuran pinjaman berjalan — kewajiban tagih. |
| `angsuran_macet` | `bigint` | — | `0` | Σ angsuran pinjaman macet. |
| `dibuat_at` | `timestamptz` | — | `now()` | Tidak ada `diubah_at` — tak pernah di-UPDATE. |

Pinjaman `diputihkan`, `lunas`, `digulung`, `batal` tidak masuk potret.

## Aturan database

| Nama | Jenis | Isi |
|---|---|---|
| `posisi_harian_pkey` | PK | `(kolektor_id, tanggal, jenis)` — kunci alami; juga rentang tanggal satu kolektor. |
| `posisi_harian_kolektor_fk` | FK | `(kolektor_id, kantor_id)` → `pengguna(id, kolektor_kantor_id)` |
| `idx_posisi_harian_kantor_tanggal` | INDEX | `(kantor_id, tanggal)` — gabungan semua kolektor di sisi bos. |
| `posisi_harian_nominal_check` | CHECK | semua jumlah & nominal ≥ 0 |

Tabel kecil (kolektor × 3 jenis × hari ≈ 11 ribu baris setahun untuk 10
kolektor) — tanpa `INCLUDE`.

## Perubahan dari skema sekarang

| Sekarang | Nanti | Alasan |
|---|---|---|
| `id` uuid + UNIQUE `(collector_id, tanggal, jenis)` | PK `(kolektor_id, tanggal, jenis)` | Kunci alami; satu index lebih sedikit; tak ada yang menunjuk `id`. |
| `boss_id` | `kantor_id` | Konvensi #2. |
| `collector_id` | `kolektor_id` | Pemegang — konvensi #3. |
| `created_at` / `updated_at` | `dibuat_at` | Sapuan hapus-lalu-tulis, tak pernah UPDATE. |
| FK `posisi_harian_collector_tenant_fk`, `idx_posisi_harian_boss_tanggal` | `posisi_harian_kolektor_fk`, `idx_posisi_harian_kantor_tanggal` | Konvensi #8. |
| komentar "status tak punya riwayat" | alasan baru (pemegang lampau + kecepatan) | `riwayat_status_pinjaman` kini ada. |
| sapuan boleh menulis tanggal mana pun | **hanya hari yang sedang ditutup** | Lihat timbangan. |

## Keputusan & timbangan

- **Potret hanya ditulis untuk hari yang sedang ditutup**, di transaksi yang
  sama dengan penutupannya (`kantor.tanggal_tutup_terakhir` maju ke tanggal
  itu). Isi potret dihitung dari keadaan pinjaman **sekarang** — mengulang
  sapuan 10 Okt pada 20 Okt akan menulis keadaan 20 Okt berlabel 10 Okt.
  Sapuan yang diulang di malam yang sama (aman diulang) tetap boleh: hapus
  potret tanggal itu, tulis ulang.
- **Hapus lalu tulis** (bukan upsert): kelompok yang sudah tak punya pinjaman
  aktif tidak meninggalkan baris dari putaran sebelumnya. Boleh karena isinya
  turunan, bukan uang.
- **Per pemegang**, bukan pencair akad.

## Posisi modal — dihitung, tidak disimpan

```
posisi modal (tanggal X) = saldo tunai buku + saldo bank buku   (rumus buku kas s.d. X)
                         + piutang aktif          (Σ saldo_berjalan + saldo_macet, posisi_harian X)
                         − tabungan nasabah       (Σ pinjaman.tabungan_masuk − Σ transaksi.tabungan_keluar
                                                   − Σ penarikan_tabungan + Σ koreksi_tabungan.selisih,
                                                   semua yang berlaku s.d. X)
```

- **Kas di lapangan tidak ditambahkan lagi**: ia sudah termasuk saldo tunai
  buku (kas lapangan baru dikurangkan saat serah terima). Ia ditampilkan
  sebagai **rincian** saldo tunai: di brankas vs dibawa kolektor.
- Semua komponen bertanggal, jadi posisi modal pada tanggal lampau mana pun
  bisa dihitung — **tidak butuh tabel baru**.
- Untuk hari ini, piutang dibaca langsung dari `pinjaman` (potret hari ini
  belum ada).
- Piutang **macet ditampilkan terpisah** (bagian yang berisiko); yang
  diputihkan tidak dihitung.

## API nantinya

| Metode & jalur | Peran | Isi |
|---|---|---|
| `GET /ringkasan/performa?mulai=&selesai=&kolektorId=` | bos, pengawas; kolektor: miliknya | Deret harian performa penagihan (aturan-usaha N): setoran murni harian, patokan (angsuran berjalan kemarin − angsuran mati), persentase. |
| `GET /kas/posisi-modal?tanggal=` | **bos** | Rincian: saldo tunai (di brankas + dibawa kolektor), saldo bank, piutang berjalan, piutang macet, tabungan nasabah, posisi modal. **Pengawas tidak** — memuat saldo buku, sama dengan laporan kas (hitung buta pencocokan; keputusan pemilik 24 Okt 2026). |

## Service / logika nantinya

- **Sapuan penutupan** per kantor, untuk hari yang ditutup: hapus potret
  tanggal itu, tulis ulang dari `pinjaman` aktif per pemegang & jenis, majukan
  `tanggal_tutup_terakhir` — satu transaksi database.
- Pembaca yang menemukan **tanpa baris** untuk suatu tanggal membedakan "belum
  ada potret" (`null`) dari nol.
- *(Ditetapkan saat pembangunan, 24 Okt 2026.)* **Hari yang terlewat tidak
  disusul** — bila server mati beberapa malam, sapuan berikutnya hanya
  menutup **kemarin**; hari di antaranya tanpa potret (dibaca `null`), dan
  pinjaman yang seharusnya macet di hari itu tercatat macet pada kemarin.
  Pinjaman yang masuk pembukuan **sesudah** hari yang ditutup (akad lewat
  tengah malam sebelum sapuan) tidak ikut dinilai maupun dipotret.
  Penjadwal berdetak tiap jam (menit ke-5) dan sekali saat server menyala
  (`src/jadwal.ts`).

## Catatan migrasi (tidak dijalankan di sesi desain)

1. Ganti nama kolom, constraint, index.
2. Buang `id` dan UNIQUE lama, pasang PK `(kolektor_id, tanggal, jenis)`.
3. Buang `updated_at`.
