# `pembayaran_gaji` — gaji kolektor yang sudah dibayar

**Status:** final (22 Okt 2026).

## Ringkasan

Satu baris = **satu pembayaran gaji seorang kolektor untuk satu periode yang
sudah berakhir**. Gaji dihitung server dari storting × tarif yang berlaku tiap
hari ([`tarif_gaji`](schema-tarif-gaji.md)), potongan tekor dari serah terima
kas — keduanya **dibekukan** di baris ini saat dibayar, sehingga slip yang
sudah dibayar tak pernah bergeser walau data lama dibetulkan.

Contoh:

| | |
|---|---|
| Periode | 1–15 Okt |
| `gaji_kotor` | 1.500.000 |
| `potongan_tekor` | 50.000 |
| `gaji_bersih` | 1.450.000 (dibayar tunai) |

## Kolom

| Kolom | Tipe | Kosong? | Bawaan | Penjelasan |
|---|---|---|---|---|
| `id` | `uuid` | — | `gen_random_uuid()` | Kunci utama. |
| `kantor_id` | `uuid` | — | | Kantor pemilik. |
| `kolektor_id` | `uuid` | — | | Penerima gaji. |
| `periode_mulai` | `date` | — | | |
| `periode_selesai` | `date` | — | | Harus sebelum `tanggal_bayar`. |
| `gaji_kotor` | `bigint` | — | | Σ storting × tarif harian periode itu (beku). |
| `potongan_tekor` | `bigint` | — | | Σ tekor periode itu (beku) — lihat rumus. |
| `gaji_bersih` | `bigint`, **turunan** | — | | `gaji_kotor − potongan_tekor` = uang yang dibayarkan. |
| `dari_akun` | enum `akun_kas` | — | | Tunai atau bank. |
| `tanggal_bayar` | `date` | — | | Hari pembukuan pembayaran (kalender kantor). |
| `keterangan` | `varchar(200)` | ya | | Isi bebas. |
| `dibuat_oleh` | `uuid` | — | | Bos. |
| `dibuat_at` | `timestamptz` | — | `now()` | |
| `dibatalkan_at` | `timestamptz` | ya | | |
| `dibatalkan_oleh` | `uuid` | ya | | Bos. |
| `alasan_batal` | `varchar(100)` | ya | | Wajib saat dibatalkan. |

### Rumus potongan tekor

```
potongan_tekor = Σ greatest(−serah_terima_kas.selisih_setor, 0)
                   (serah terima berlaku, hari kolektor dalam periode)
               + Σ hari_kolektor.tekor_lama
                   (arsip sebelum peralihan)
```

## Aturan database

| Nama | Jenis | Isi |
|---|---|---|
| `pembayaran_gaji_pkey` | PK | `(id)` |
| `pembayaran_gaji_kolektor_fk` | FK | `(kolektor_id, kantor_id)` → `pengguna(id, kolektor_kantor_id)` — pasti kolektor kantor itu. |
| `pembayaran_gaji_kantor_fk` | FK | `(kantor_id)` → `buku_kas(kantor_id)` — gaji adalah kas keluar; buku kas harus sudah dibuka. |
| `pembayaran_gaji_dibuat_oleh_fk`, `…_dibatalkan_oleh_fk` | FK | gabungan ke `pengguna(id, kantor_id)` |
| `pembayaran_gaji_periode_excl` | EXCLUDE (gist) | `(kolektor_id WITH =, daterange(periode_mulai, periode_selesai, '[]') WITH &&) WHERE (dibatalkan_at IS NULL)` — periode yang berlaku **tak mungkin tumpang tindih**. Butuh ekstensi `btree_gist`. |
| `idx_pembayaran_gaji_kolektor` | INDEX | `(kolektor_id, periode_mulai)` — riwayat slip seorang kolektor. |
| `idx_pembayaran_gaji_kantor_tanggal` | INDEX | `(kantor_id, tanggal_bayar)` — buku kas per rentang tanggal. |
| `pembayaran_gaji_periode_check` | CHECK | `periode_mulai <= periode_selesai AND periode_selesai < tanggal_bayar` |
| `pembayaran_gaji_nominal_check` | CHECK | `gaji_kotor >= 0 AND potongan_tekor >= 0 AND potongan_tekor <= gaji_kotor` |
| `pembayaran_gaji_batal_check` | CHECK | Kolom batal terisi bersamaan atau kosong bersamaan. |
| `pembayaran_gaji_append_only` | TRIGGER | UPDATE hanya boleh menandai batal; DELETE ditolak (`uang_hanya_batal()`, sudah ada). |

## Perubahan dari skema sekarang

| Sekarang | Nanti | Alasan |
|---|---|---|
| `boss_id`, `collector_id` | `kantor_id`, `kolektor_id` | Konvensi #2, #3. |
| `gaji` | `gaji_kotor` | Pasangan `gaji_bersih`. |
| `dibayar` + CHECK `dibayar = gaji − potongan_tekor` | `gaji_bersih`, kolom turunan | "Dibayar" terdengar seperti tanda ya/tidak; turunan tak mungkin meleset. |
| `potongan_tekor` dari `beban_kolektor` jenis tekor | dari `serah_terima_kas` + `tekor_lama` | Tekor kini hasil serah terima. |
| `catatan` | `keterangan` | Konvensi #6. |
| tumpang tindih dicegah service (kunci advisory + SELECT) | `EXCLUDE` constraint | Dijaga database — juga terhadap skrip & bug. |
| FK `pembayaran_gaji_collector_tenant_fk` | `pembayaran_gaji_kolektor_fk` | Konvensi #8. |
| FK tunggal `dibuat_oleh`, `dibatalkan_oleh` | FK gabungan | Pelaku pasti orang kantor itu. |
| `created_at`, `alasan_batal varchar(200)` | `dibuat_at`, `varchar(100)` | Konvensi #5; seragam. |

## Keputusan & timbangan

- **Dibekukan**, bukan dihitung ulang: slip yang sudah dibayar adalah fakta
  sejarah.
- **Periode harus sudah berakhir**: storting hari ini masih bisa bergeser.
- **Tekor melebihi gaji ditolak** (`TEKOR_MELEBIHI_GAJI`, dijaga juga CHECK):
  bos menyelesaikan selisihnya lebih dulu.
- **`EXCLUDE` constraint** dipilih di atas kunci advisory: aturan
  "satu periode dibayar sekali" ada di tempat yang tak bisa dilewati.

## API nantinya

| Metode & jalur | Peran | Isi |
|---|---|---|
| `GET /kas/gaji/pratinjau?kolektorId=&mulai=&selesai=` | bos; kolektor: miliknya (27 Nov 2026 — perkiraan gaji di Ringkasan HP) | Gaji kotor, rincian storting × tarif per hari, tekor per hari — sebelum membayar. |
| `POST /kas/gaji` | bos | `{ kolektorId, periodeMulai, periodeSelesai, dariAkun, keterangan? }` |
| `POST /kas/gaji/:id/batal` | bos | `{ alasan }` — hari yang sama. |
| `GET /kas/gaji?kolektorId=` | bos, pengawas: semua; kolektor: miliknya | Riwayat slip. |

## Catatan migrasi (tidak dijalankan di sesi desain)

1. `CREATE EXTENSION IF NOT EXISTS btree_gist`.
2. Ganti nama kolom; `dibayar` → buang, tambah `gaji_bersih` turunan (periksa
   dulu `dibayar = gaji − potongan_tekor` di semua baris).
3. Periksa tak ada periode berlaku yang bertumpuk, lalu pasang `EXCLUDE`.
4. Ganti FK; arahkan `kantor_id` ke `buku_kas`.
5. Alihkan perhitungan potongan tekor ke `serah_terima_kas` + `tekor_lama`.
