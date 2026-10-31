# `foto` — data foto bukti (berkasnya di luar database)

**Status:** final (22 Okt 2026); diubah 1 Nov 2026 — unggahan ulang foto yang sama (lihat "Unggahan ulang").

## Ringkasan

Satu baris = **satu foto** yang diunggah dari HP. Database hanya menyimpan
**data tentang foto** (lokasi berkas, sidik jari, ukuran, siapa, kapan,
di mana); **berkas fotonya disimpan di penyimpanan berkas** (disk VPS atau
layanan seperti Cloudflare R2 — dipilih saat implementasi). Foto di dalam
database membengkakkan tabel, melambatkan backup, dan membebani setiap kueri.

Pemilik foto **menunjuk ke sini** — `foto` sendiri tidak tahu siapa
pemiliknya:

| Penunjuk | Jenis foto | Wajib? |
|---|---|---|
| `pinjaman.foto_serah_terima_id` | `serah_terima` — nasabah memegang uang pencairan | **wajib** untuk akad yang mengeluarkan uang (baru, pinjam lagi, gulung); salinan migrasi bebas |
| `nasabah.foto_ktp_id` | `ktp` — KTP nasabah | opsional |

Kelak bukti lain (mis. nota pengeluaran kas) cukup menambah satu penunjuk dan
satu nilai `jenis_foto`.

## Kolom

| Kolom | Tipe | Kosong? | Bawaan | Penjelasan |
|---|---|---|---|---|
| `id` | `uuid` | — | `gen_random_uuid()` | Kunci utama. |
| `kantor_id` | `uuid` | — | | Kantor pemilik. |
| `jenis` | enum `jenis_foto` (`serah_terima`, `ktp`) | — | | |
| `kunci_berkas` | `varchar(200)` | — | | Lokasi berkas di penyimpanan, mis. `kantor/<kantor_id>/foto/2026/10/<id>.webp`. **Bukan URL publik.** |
| `sha256` | `char(64)` | — | | Sidik jari isi berkas, dihitung server. |
| `ukuran_byte` | `integer` | — | | |
| `tipe_mime` | `varchar(20)` | — | | `image/jpeg` atau `image/webp`, diperiksa dari isi berkas. |
| `latitude` | `double precision` | ya | | GPS saat foto diambil. |
| `longitude` | `double precision` | ya | | |
| `akurasi_meter` | `smallint` | ya | | |
| `diambil_at` | `timestamptz` | ya | | Jam dari HP saat memotret (bisa dimundurkan — pembanding saja). |
| `diunggah_oleh` | `uuid` | — | | Orang yang mengunggah. |
| `dibuat_at` | `timestamptz` | — | `now()` | Jam **server** saat unggah — yang dipercaya. |

## Aturan database

| Nama | Jenis | Isi |
|---|---|---|
| `foto_pkey` | PK | `(id)` |
| `foto_kantor_fk` | FK | `kantor_id` → `kantor(id)` |
| `foto_diunggah_oleh_fk` | FK | `(diunggah_oleh, kantor_id)` → `pengguna(id, kantor_id)` |
| `uniq_foto_id_kantor` | UNIQUE | `(id, kantor_id)` — sasaran FK gabungan dari `pinjaman` & `nasabah`. |
| `uniq_foto_kantor_sha256` | UNIQUE | `(kantor_id, sha256)` — **foto yang sama tak bisa dipakai dua kali**; satu baris per foto, jadi unggahan ulang yang sah (lihat "Unggahan ulang") mengembalikan baris itu, bukan baris baru. |
| `idx_foto_dibuat` | INDEX | `(dibuat_at)` — pembersihan foto sementara. |
| `foto_ukuran_check` | CHECK | `ukuran_byte > 0 AND ukuran_byte <= 2000000` |
| `foto_sha256_check` | CHECK | `sha256 ~ '^[0-9a-f]{64}$'` |
| `foto_lokasi_check` | CHECK | latitude, longitude, akurasi terisi semua (dalam batas Indonesia, akurasi > 0) atau kosong semua — sama dengan `nasabah`. |

## Keputusan & timbangan

- **Berkas di luar database**, data fotonya di sini.
- **Satu tabel umum dengan penunjuk dari pemilik**, bukan satu tabel per jenis
  dan bukan kolom "pemilik" serba-bisa: FK tetap jelas di setiap pemilik.
- **Foto serah terima** (nasabah memegang uang pencairan) membuktikan orangnya
  ada **dan** menerima uang — lebih kuat dari foto wajah saja.
- **Penangkal kecurangan**:
  - aplikasi hanya membuka **kamera**, bukan galeri;
  - **sidik jari unik per kantor** — foto kembar ditolak database (kecuali unggahan ulang yang sah);
  - **GPS saat memotret** disimpan, bisa dibandingkan dengan titik rumah;
  - **jam server** yang dipercaya; jam HP hanya pembanding.
- **Perkiraan ruang**: foto dikompres di HP ±150–250 KB; ±50 akad/hari ≈
  3–4 GB/tahun. Backup berkas terpisah dari backup database.

## API nantinya

| Metode & jalur | Peran | Isi |
|---|---|---|
| `POST /foto` | kolektor (serah terima, KTP), bos (KTP) | Multipart: berkas + `{ jenis, diambilAt?, lokasi? }` → `{ id }`. Batas 2 MB; tipe diperiksa dari isi berkas; foto kembar → `FOTO_SUDAH_DIPAKAI` (409), kecuali unggahan ulang yang sah → `201` dengan `{ id }` yang sama. |
| `GET /foto/:id` | bos, pengawas, kolektor pemegang nasabahnya | Tautan sementara (beberapa menit) ke berkasnya. **Kasir tidak.** |

Akad & gulung mengirim id foto yang sudah diunggah: `fotoSerahTerimaId`
(wajib), `fotoKtpId` (opsional, untuk orang baru).

## Service / logika nantinya

- **Unggah**: periksa ukuran & tipe dari isi berkas; hitung SHA-256 di server;
  simpan berkas (metadata EXIF dibuang); tulis baris `foto`. Foto yang belum
  ditunjuk pemilik mana pun berstatus **sementara**.
- **Unggahan ulang** (idempoten tanpa `Idempotency-Key`; berkas multipart tidak ikut diulang otomatis oleh klien): bila jawaban `POST /foto` hilang di jalan, kolektor mengirim foto yang sama lagi. Jika foto dengan sidik jari sama di kantor ini **(a) diunggah oleh orang yang sama, (b) berjenis sama, (c) belum ditunjuk `pinjaman.foto_serah_terima_id` maupun `nasabah.foto_ktp_id`, dan (d) berumur < 1 jam** (jam server), server mengembalikan baris yang sudah ada — `201` dengan `id` yang sama, tanpa menyimpan berkas baru. Selain itu tetap `FOTO_SUDAH_DIPAKAI` (409): foto yang sudah dipakai akad/KTP, milik orang lain, berjenis lain, atau lebih dari 1 jam. Dua unggahan identik yang bersamaan: yang kalah balapan (pelanggaran `uniq_foto_kantor_sha256`) membaca ulang pemenangnya dengan aturan yang sama. Ini tidak melonggarkan penangkal kecurangan: foto tetap hanya bisa ditunjuk satu pemilik, dan batas 1 jam sama dengan batas pemakaiannya di akad.
- **Mengaitkan ke akad/gulung** (transaksi yang sama dengan akadnya): foto
  harus jenis `serah_terima`, milik kantor ini, diunggah oleh kolektor itu
  sendiri, berumur < 1 jam, dan belum dipakai pinjaman lain.
- **Pembersihan**: foto sementara > 24 jam (tak ditunjuk `pinjaman` maupun
  `nasabah`) dihapus — barisnya dan berkasnya.
- **Akses**: tautan sementara bertanda tangan (*signed URL*); berkas tak
  pernah bisa dibuka publik.
- Foto profil nasabah di aplikasi = foto serah terima pinjaman terakhirnya
  (diturunkan, tanpa kolom baru).

## Catatan migrasi (tidak dijalankan di sesi desain)

1. Buat enum `jenis_foto` dan tabel `foto`.
2. Tambah `pinjaman.foto_serah_terima_id` dan `nasabah.foto_ktp_id` beserta FK
   & CHECK-nya (lihat dokumen kedua tabel itu).
3. Siapkan penyimpanan berkas dan rahasia tanda tangan tautan di env server.
