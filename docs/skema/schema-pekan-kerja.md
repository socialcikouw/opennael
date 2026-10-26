# `pekan_kerja` — hari kerja kantor dalam sepekan, bertanggal (baru)

**Status:** final (23 Okt 2026). Tabel baru; menggantikan kolom
`kantor.hari_kerja`. Hasil tinjauan ulang menyeluruh (butir 6).

## Ringkasan

Satu baris = **pola hari kerja kantor yang mulai berlaku pada suatu tanggal**
(mis. Senin–Sabtu sejak 1 Jan; Senin–Jumat sejak 1 Nov). Pola untuk satu hari
adalah baris terbaru yang `berlaku_mulai`-nya ≤ hari itu — sama dengan
[`tarif_gaji`](schema-tarif-gaji.md).

Kenapa bertanggal: pekan kerja menentukan hari tagih harian, tunggakan, dan
jendela macet. Dulu satu kolom `kantor.hari_kerja`: mengganti Senin–Sabtu
menjadi Senin–Jumat membuat jadwal **semua hari lampau** dihitung ulang dengan
pola baru — tunggakan pinjaman berjalan diam-diam bergeser. Itu bertentangan
dengan prinsip yang sudah dipakai `libur_kantor`: **kalender tidak boleh
mengubah sejarah**.

Contoh:

| `berlaku_mulai` | `hari_kerja` | |
|---|---|---|
| 1 Jan | 126 | Senin–Sabtu |
| 1 Nov | 62 | Senin–Jumat |

Sabtu 25 Okt tetap hari tagih; Sabtu 8 Nov bukan.

## Kolom

| Kolom | Tipe | Kosong? | Bawaan | Penjelasan |
|---|---|---|---|---|
| `kantor_id` | `uuid` | — | | Kantor pemilik. |
| `berlaku_mulai` | `date` | — | | Hari pertama pola ini dipakai (kalender kantor). |
| `hari_kerja` | `smallint` | — | | Bitmask: bit *d* = hari ke-*d*, 0 = Minggu … 6 = Sabtu. 126 = Senin–Sabtu, 62 = Senin–Jumat. |
| `dibuat_oleh` | `uuid` | — | | Bos. |
| `dibuat_at` | `timestamptz` | — | `now()` | |
| `diubah_at` | `timestamptz` | — | `now()` | Disentuh bila bos menimpa baris bertanggal mulai sama (sebelum berlaku). |

## Aturan database

| Nama | Jenis | Isi |
|---|---|---|
| `pekan_kerja_pkey` | PK | `(kantor_id, berlaku_mulai)` — kunci alami; juga jalur "pola terbaru pada atau sebelum tanggal X". |
| `pekan_kerja_kantor_fk` | FK | `(kantor_id)` → `kantor(id)` |
| `pekan_kerja_dibuat_oleh_fk` | FK | `(dibuat_oleh, kantor_id)` → `pengguna(id, kantor_id)` |
| `pekan_kerja_hari_check` | CHECK | `hari_kerja BETWEEN 1 AND 127` — minimal satu hari kerja. |
| `pekan_kerja_tidak_mundur` | TRIGGER | Sama dengan `tarif_gaji_tidak_mundur`: INSERT bertanggal < hari ini (zona kantor) ditolak; UPDATE/DELETE baris yang sudah berlaku (< hari ini) ditolak. Kecuali transaksi migrasi dan skrip data uji. |

Setiap kantor **wajib punya satu baris** sejak dibuat (126, berlaku mulai
tanggal kantor dibuat).

## Cara membaca

```
hari_kerja(tanggal) = baris dengan berlaku_mulai ≤ tanggal yang terbaru
hari kerja?         = bit (hari dalam pekan) menyala  DAN  bukan libur_kantor
```

Pembaca jadwal memuat **semua baris kantor itu** sekali per permintaan
(biasanya 1–3 baris) dan memilih pola per tanggal di kode — tak ada kueri per
hari.

## Perubahan dari skema sekarang

| Sekarang | Nanti | Alasan |
|---|---|---|
| `kantor.hari_kerja` (satu nilai, berlaku untuk semua tanggal) | tabel `pekan_kerja` bertanggal | Mengubah pekan kerja tidak menggeser jadwal & tunggakan hari lampau. |
| ubah kapan saja | hanya mulai hari ini atau ke depan | Pola sama dengan `tarif_gaji` dan `libur_kantor`. |

## Keputusan & timbangan

- **Bertanggal, bukan peringatan saja**: tunggakan adalah dasar penilaian
  kolektor dan nasabah; angka lampau harus stabil.
- **Bitmask dipertahankan** — satu angka kecil, dijaga CHECK; API
  menerjemahkannya (`[1,2,3,4,5,6]`).
- **PK alami** `(kantor_id, berlaku_mulai)` tanpa `id`.

## API nantinya

| Metode & jalur | Peran | Isi |
|---|---|---|
| `GET /kantor` | semua | `hariKerja` = pola yang berlaku **hari ini** (bentuk respons tetap). |
| `GET /kantor/pekan-kerja` | bos, pengawas | Riwayat pola, terbaru dulu. |
| `PUT /kantor/pekan-kerja` | bos | `{ hariKerja: [1,2,3,4,5], berlakuMulai? }` — bawaan hari ini; tidak boleh mundur. |
| `GET /lapangan/kalender?bulan=YYYY-MM` | kolektor, pengawas, bos | Kalender kantor sebulan untuk grid setoran kartu nasabah: `hariTagih` (hari kerja pola yang berlaku & bukan libur kantor, [aturan-usaha B2](../aturan-usaha.md)) dan `liburKantor` (`{ tanggal, alasan }`). |

`PATCH /kantor` tidak lagi menerima `hariKerja` setelah aplikasi beralih
(sampai itu: diterjemahkan menjadi baris baru berlaku hari ini).

## Service / logika nantinya

- **Registrasi kantor** menulis baris pertama (126) di transaksi yang sama.
- **Mengubah** (bos): `berlakuMulai` ≥ hari ini; tanggal mulai yang sudah ada →
  timpa + catat riwayat, selain itu baris baru.
- **Kalender kantor** (`deps.kalender`) membawa daftar pola, bukan satu angka;
  `hariKerja(tanggal)` memilih pola per tanggal.

## Catatan migrasi (tidak dijalankan di sesi desain)

1. Buat tabel; isi satu baris per kantor: `hari_kerja` sekarang, berlaku sejak
   tanggal data paling awal kantor itu (pola lama dianggap berlaku sejak awal —
   sama dengan perilaku sekarang).
2. Alihkan pembaca kalender; buang `kantor.hari_kerja` dan
   `kantor_hari_kerja_check`.
