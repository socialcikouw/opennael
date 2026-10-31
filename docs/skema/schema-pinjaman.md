# `pinjaman` — satu akad

**Status:** final (22 Okt 2026).

## Ringkasan

Satu baris = **satu akad** pinjaman seorang nasabah. **Syarat akad disimpan,
bukan diturunkan**: angka hari akad (pokok, potongan, pencairan, total
kembali, angsuran) dibekukan di baris ini, sehingga mengubah rumus akad hanya
berlaku untuk akad berikutnya. Yang berubah sesudah akad hanya **keadaan
berjalan**: `saldo`, `status`, dan penanda selesai/macet/pemutihan.

Tiga jenis: **harian** (24 × bayar), **mingguan** (6/8/10 × bayar),
**tempoan** (sekali bayar pada jatuh tempo 7/10/14 hari). Tiga asal:
**baru**, **gulung** (melunasi pinjaman asal, sisanya dicairkan), **migrasi**
(disalin dari pembukuan lama, tanpa uang keluar).

## Kolom

### Identitas & hubungan

| Kolom | Tipe | Kosong? | Penjelasan |
|---|---|---|---|
| `id` | `uuid` | — | Kunci utama. |
| `kantor_id` | `uuid` | — | Kantor pemilik. |
| `pencair_id` | `uuid` | — | Kolektor yang **mencairkan** akad (salinan migrasi: kolektor pemegang saat disalin). Fakta sejarah, tak ikut pindah; dasar laporan droping per kolektor. Pemegang saat ini = `nasabah.kolektor_id`. |
| `nasabah_id` | `uuid` | — | Orangnya. |
| `pinjaman_ke` | `integer` | — | Urutan pinjaman nasabah ini, berlanjut walau sempat lunas; yang batal tak memakan nomor. |
| `jenis` | enum `jenis_pinjaman` (`harian`, `mingguan`, `tempoan`) | — | |
| `tenor` | `integer` | — | Harian & mingguan: jumlah kali bayar. Tempoan: jangka hari. |
| `asal` | enum `asal_pinjaman` (`baru`, `gulung`, `migrasi`) | — | |
| `pinjaman_asal_id` | `uuid` | ya | Gulung: pinjaman yang dilunasi penerus ini. |
| `jenis_gulung` | enum `jenis_gulung` (`tetap`, `naik`, `turun`) | ya | Gulung: pokok baru dibanding pokok asal. |
| `dibuat_oleh` | `uuid` | — | Yang mengetik akad (kolektor di lapangan, atau bos saat salin). |
| `foto_serah_terima_id` | `uuid` | ya | Foto nasabah memegang uang pencairan ([schema-foto.md](schema-foto.md)). **Wajib** untuk akad yang mengeluarkan uang (baru, pinjam lagi, gulung); salinan migrasi bebas. |

### Tanggal

| Kolom | Tipe | Kosong? | Penjelasan |
|---|---|---|---|
| `tanggal_akad` | `date` | — | Hari akad (kalender kantor) — sumbu laporan droping. |
| `tanggal_disalin` | `date` | ya | Hanya migrasi: hari disalin; sejak hari itu ia ditagih. |
| `jatuh_tempo` | `date`, **turunan** | ya | `CASE WHEN jenis = 'tempoan' THEN tanggal_akad + tenor END`. |
| `tanggal_macet` | `date` | ya | Hari mulai macet. Tetap tersimpan saat diputihkan, supaya batal pemutihan mengembalikan status persis. |
| `tanggal_selesai` | `date` | ya | Hari lunas / digulung / batal / diputihkan. |

### Syarat akad (dibekukan)

| Kolom | Tipe | Penjelasan |
|---|---|---|
| `pokok` | `bigint` | Kelipatan Rp 100.000 — membuat 5%, 120%, 125%, dan ÷ tenor selalu bulat. |
| `potongan_admin` | `bigint` | Potongan jasa/admin, pendapatan kantor saat pencairan. Tempoan & migrasi: 0. |
| `tabungan_masuk` | `bigint` | Yang masuk tabungan nasabah lewat akad ini: potongan tabungan (baru/gulung) atau tabungan pembuka (migrasi). |
| `saldo_lama` | `bigint` | Gulung: sisa saldo pinjaman asal yang dipotong dari pencairan. |
| `pencairan` | `bigint` | Tunai yang benar-benar diterima nasabah. |
| `total_kembali` | `bigint` | Seluruh kewajiban (pokok + jasa): 120% (harian, mingguan) atau 125% (tempoan). |
| `angsuran` | `bigint` | Nominal satu kali bayar; tempoan = `total_kembali`. |
| `saldo_awal` | `bigint` | Saldo saat masuk pembukuan: `total_kembali`, kecuali migrasi (sudah dicicil sebagian). |

### Pembukuan droping (dibekukan)

| Kolom | Tipe | Penjelasan |
|---|---|---|
| `drop_baru` | `bigint` | Pokok baru yang benar-benar keluar (akad baru: pokok; gulung naik: kenaikannya). |
| `drop_gulung` | `bigint` | Bagian pokok yang memutar pinjaman lama (gulung). |
| `droping` | `bigint`, **turunan** | `drop_baru + drop_gulung` (= pokok; migrasi 0). |
| `pokok_berkurang` | `bigint` | Gulung turun: pengurangan pokok. |

### Keadaan berjalan

| Kolom | Tipe | Kosong? | Penjelasan |
|---|---|---|---|
| `status` | enum `status_pinjaman` (`berjalan`, `macet`, `lunas`, `digulung`, `batal`, `diputihkan`) | — | Bawaan `berjalan`. |
| `saldo` | `bigint` | — | Saldo berjalan — cache yang disengaja: `saldo_awal − Σ (setoran_murni + setoran_pelunasan)` transaksi yang berlaku; berubah hanya bersama baris transaksinya. Riwayatnya di `transaksi.saldo_sesudah`. |
| `angsuran_ke` | `integer`, **turunan** | — | `(total_kembali − saldo) / angsuran` — jumlah angsuran yang sudah lunas. |
| `diputihkan_at` | `timestamptz` | ya | |
| `diputihkan_oleh` | `uuid` | ya | Bos yang memutihkan. |
| `alasan_pemutihan` | enum `alasan_pemutihan` (`macet_lama`, `meninggal`, `lainnya`) | ya | |
| `keterangan_pemutihan` | `varchar(200)` | ya | |
| `dibatalkan_at` | `timestamptz` | ya | Batal akad (salah input) — akad adalah uang keluar, jadi dibatalkan dengan kolom batal seperti tabel uang lain. |
| `dibatalkan_oleh` | `uuid` | ya | Bos. |
| `alasan_batal` | `varchar(100)` | ya | Wajib saat dibatalkan. |
| `dibuat_at` | `timestamptz` | — | |
| `diubah_at` | `timestamptz` | — | |

## Aturan database

### FK

| Nama | Isi |
|---|---|
| `pinjaman_kantor_fk` | `kantor_id` → `kantor(id)` |
| `pinjaman_pencair_fk` | `(pencair_id, kantor_id)` → `pengguna(id, kolektor_kantor_id)` — pencair pasti kolektor kantor itu. |
| `pinjaman_nasabah_fk` | `(nasabah_id, kantor_id)` → `nasabah(id, kantor_id)` |
| `pinjaman_asal_fk` | `(pinjaman_asal_id, nasabah_id)` → `pinjaman(id, nasabah_id)` — gulung hanya dari pinjaman **nasabah yang sama** (otomatis kantor yang sama). |
| `pinjaman_dibuat_oleh_fk` | `(dibuat_oleh, kantor_id)` → `pengguna(id, kantor_id)` |
| `pinjaman_diputihkan_oleh_fk` | `(diputihkan_oleh, kantor_id)` → `pengguna(id, kantor_id)` |
| `pinjaman_dibatalkan_oleh_fk` | `(dibatalkan_oleh, kantor_id)` → `pengguna(id, kantor_id)` |
| `pinjaman_foto_fk` | `(foto_serah_terima_id, kantor_id)` → `foto(id, kantor_id)` |

### UNIQUE & index

| Nama | Isi | Gunanya |
|---|---|---|
| `uniq_pinjaman_id_kantor` | `(id, kantor_id)` | Sasaran FK `transaksi`, `libur_nasabah`, `riwayat_status_pinjaman`. |
| `uniq_pinjaman_id_nasabah` | `(id, nasabah_id)` | Sasaran FK gulung. |
| `uniq_pinjaman_aktif_nasabah` | `(nasabah_id) WHERE status IN ('berjalan','macet')` | Satu pinjaman aktif per nasabah; jalur layar kerja. Gulung menutup asal dulu, baru menyisipkan penerus. |
| `uniq_pinjaman_nasabah_ke` | `(nasabah_id, pinjaman_ke) WHERE status <> 'batal'` | Urutan per nasabah; jalur Buku nasabah. |
| `uniq_pinjaman_asal` | `(pinjaman_asal_id) WHERE pinjaman_asal_id IS NOT NULL AND status <> 'batal'` | Satu pinjaman hanya digulung sekali. |
| `idx_pinjaman_kantor_status` | `(kantor_id, status)` | Portofolio, sapuan macet. |
| `idx_pinjaman_pencair_akad` | `(pencair_id, tanggal_akad)` | Droping per kolektor. |
| `idx_pinjaman_kantor_akad` | `(kantor_id, tanggal_akad)` | Droping per kantor. |
| `idx_pinjaman_kantor_selesai` | `(kantor_id, tanggal_selesai) WHERE tanggal_selesai IS NOT NULL` | Angsuran yang selesai per hari — tanpa ini kueri menyaring seluruh pinjaman yang sudah selesai, yang terus menumpuk. |
| `uniq_pinjaman_foto` | `(foto_serah_terima_id) WHERE foto_serah_terima_id IS NOT NULL` | Satu foto, satu akad. |

### CHECK

| Nama | Isi |
|---|---|
| `pinjaman_ke_check` | `pinjaman_ke >= 1` |
| `pinjaman_pokok_check` | `pokok > 0 AND pokok % 100000 = 0` |
| `pinjaman_tenor_check` | harian 24; mingguan 6/8/10; tempoan 7/10/14 |
| `pinjaman_nominal_check` | semua nominal ≥ 0; `total_kembali >= pokok` |
| `pinjaman_angsuran_check` | `angsuran > 0`; tempoan `angsuran = total_kembali`; lainnya `angsuran × tenor = total_kembali` |
| `pinjaman_saldo_check` | `0 <= saldo <= saldo_awal <= total_kembali` |
| `pinjaman_pencairan_check` | migrasi: tanpa uang keluar (pencairan, admin, droping 0); lainnya: `saldo_awal = total_kembali`, `pencairan = pokok − potongan_admin − tabungan_masuk − saldo_lama`, `drop_baru + drop_gulung = pokok` |
| `pinjaman_disalin_check` | migrasi ⇔ `tanggal_disalin` terisi (≥ `tanggal_akad`) |
| `pinjaman_gulung_check` | gulung ⇔ `pinjaman_asal_id` & `jenis_gulung` terisi; selain gulung `saldo_lama`, `drop_gulung`, `pokok_berkurang` = 0 |
| `pinjaman_status_check` | berjalan/macet: saldo > 0, belum selesai; lunas/digulung: saldo 0, selesai; batal: selesai; diputihkan: saldo > 0, selesai |
| `pinjaman_macet_check` | macet ⇔ `tanggal_macet` terisi — kecuali diputihkan, yang boleh menyimpannya |
| `pinjaman_pemutihan_check` | diputihkan ⇔ keempat penanda pemutihan terisi |
| `pinjaman_batal_check` | `status = 'batal'` ⇔ `dibatalkan_at`, `dibatalkan_oleh`, `alasan_batal` terisi (ketiganya kosong untuk status lain) |
| `pinjaman_foto_check` | `asal = 'migrasi' OR foto_serah_terima_id IS NOT NULL` — akad tanpa foto ditolak database. Dipasang `NOT VALID`: pinjaman yang dibuat sebelum fitur foto dibebaskan, setiap baris baru diperiksa. |

CHECK yang menyebut nilai enum yang ditambahkan belakangan (`diputihkan`)
membandingkan `status::text`.

### Penyimpanan

`fillfactor = 90` — setiap setoran mengubah `saldo` (tidak di-index), sehingga
dengan ruang sisa di halaman Postgres memakai **HOT update**: salinan baris
baru di halaman yang sama, index tak disentuh.

### Trigger

`pinjaman_riwayat_status` (AFTER INSERT / UPDATE OF status) menulis
`riwayat_status_pinjaman` — lihat dokumen tabel itu.

`pinjaman_terkunci` (BEFORE UPDATE OF status) — saat pinjaman **ditandai
batal**: tolak bila hari kolektor pencairnya (`pencair_id`, `tanggal_akad`)
sudah punya `serah_terima_kas` berlaku (`KAS_SUDAH_DITERIMA`, aturan-usaha I4).
Perubahan status lain (sapuan macet, lunas, gulung) tidak disentuh. Jaring
pengaman; service memeriksanya lebih dulu. *(Ditambahkan saat pembangunan,
24 Okt 2026.)*

## Perubahan dari skema sekarang

| Sekarang | Nanti | Alasan |
|---|---|---|
| `boss_id` | `kantor_id` | Konvensi #2. |
| `collector_id` | `pencair_id` | Konvensi #4 — satu nama, satu arti. |
| `admin` | `potongan_admin` | Nama sesuai isi. |
| `tabungan_awal` | `tabungan_masuk` | Tak tertukar dengan `saldo_awal`; berpasangan dengan `transaksi.tabungan_keluar` & `nasabah.saldo_tabungan`. |
| `macet_sejak` | `tanggal_macet` | Konvensi #9. |
| `catatan_pemutihan` | `keterangan_pemutihan` | Konvensi #6. |
| `jatuh_tempo` diisi service, dijaga CHECK | kolom turunan | Satu sumber kebenaran; `pinjaman_jatuh_tempo_check` hilang. |
| FK `pinjaman_asal_id` → `pinjaman(id)` | FK `(pinjaman_asal_id, nasabah_id)` → `pinjaman(id, nasabah_id)` | Gulung dari nasabah lain mustahil di database. |
| FK `dibuat_oleh`, `diputihkan_oleh` → `users(id)` | FK gabungan dengan `kantor_id` | Pelaku pasti orang kantor itu. |
| — | index `(kantor_id, tanggal_selesai)` parsial | Laporan harian tetap cepat bertahun-tahun ke depan. |
| fillfactor bawaan (100) | 90 | HOT update pada setiap setoran. |
| — | `foto_serah_terima_id` + `pinjaman_foto_check` + `uniq_pinjaman_foto` | Bukti uang benar-benar diterima orang sungguhan (keputusan 22 Okt 2026). |
| batal akad hanya menimpa `status` (siapa/kenapa di riwayat) | `dibatalkan_at` / `dibatalkan_oleh` / `alasan_batal` + `pinjaman_batal_check` | Prinsip *tabel uang dibatalkan* (tinjauan ulang 23 Okt 2026). |
| `created_at`, `updated_at` | `dibuat_at`, `diubah_at` | Konvensi #5. |

## Keputusan & timbangan

- **Tidak dipecah** menjadi "syarat akad" + "keadaan berjalan": dengan HOT
  update, pemisahan tak memberi kecepatan berarti, sedangkan hampir setiap
  kueri jadi butuh join.
- **`saldo` tetap cache** (seperti `nasabah.saldo_tabungan`): dibaca di setiap
  kartu; menjumlah transaksi setiap kali akan makin lambat.
- **`drop_*` & `pokok_berkurang` tetap disimpan**: diturunkan dari pokok
  pinjaman asal (baris lain), jadi tak bisa menjadi kolom turunan.
- **`dibuat_oleh` tetap ada** walau sama dengan `pencair_id` untuk akad
  lapangan: untuk salinan migrasi pengetiknya bos.

## API nantinya

> Kartu pinjaman di semua jalur membawa `waktuAkad` (1 Nov 2026): `dibuat_at` sebagai waktu ISO untuk akad baru dan gulung — HP menampilkan jamnya menurut `kantor.zona_waktu` ("1 Sep 26 • 15.00"); `null` untuk salinan migrasi, karena `dibuat_at`-nya jam penyalinan, bukan jam akad aslinya. Tanggal akad tetap `tanggalAkad`.

| Metode & jalur | Peran | Isi |
|---|---|---|
| `POST /lapangan/akad` | kolektor | Akad: nasabah lama (`nasabahId`) atau orang baru (`nasabah`), `jenis`, `pokok`, `tenor`, **`fotoSerahTerimaId`** (wajib; diunggah lebih dulu lewat `POST /foto`), `fotoKtpId` (opsional). Angka akad dihitung server. Wajib kunci idempoten. |
| `POST /pinjaman/migrasi` | bos | Salin pinjaman berjalan dari pembukuan lama ([aturan-usaha A10](../aturan-usaha.md)): `{ nasabah: { nasabahId } \| { nama, kampung, nomorHp?, nik? }, kolektorId?, jenis, tenor, pokok, tanggalAkad, saldo, tabungan, pinjamanKe?, macet? }`. Orang baru wajib `kolektorId` (pemegang & `pencair_id`); nasabah lama tetap pada pemegangnya. `pinjamanKe` bawaan nomor berikutnya — boleh diisi sesuai buku, tidak boleh mundur. Pemeriksaan orang baru sama dengan akad lapangan (NIK terdaftar, mirip nasabah diblokir). |
| `GET /pinjaman` | bos, pengawas: semua; kolektor: pegangannya | Kartu: pinjaman + identitas nasabah + pemegang + posisi tagih hari ini (`tagih` = `{ tertinggal, tunggakan }` menurut [aturan-usaha B5](../aturan-usaha.md); `null` bila tidak aktif) + kunci gulung yang berlaku (`kunciGulung` = `{ gulung, naik, alasan }`, gabungan lapis kantor, pemegang, dan nasabah). Saringan: `status` = `aktif` (bawaan: berjalan & macet) · `selesai` · `semua`; `nasabahId`; `kolektorId` (pemegang; bos & pengawas). Urut nama nasabah, lalu `pinjamanKe` menurun; paling banyak 500. |
| `GET /pinjaman/:id` | sama | Kartu + kolom akad lengkap (asal, gulung, droping, tanggal selesai/macet, pemutihan, batal) + angka aturan macet (`aturanMacet`): jendela 30 hari yang berakhir **hari ini** — `setoranJendela`, `ambang`, `hariTagih` — dan status yang akan diberikan sapuan malam ini bila tak ada setoran lagi (`statusMalamIni`). Tempoan: `batasTempoan` (jatuh tempo + 7). `null` bila tidak aktif. |
| `PATCH /pinjaman/:id` | bos | Hanya `pinjamanKe` (identitas nasabah pindah ke `PATCH /nasabah/:id`). Pinjaman batal tidak bisa disunting; nomor yang sudah dipakai pinjaman lain nasabah itu → `PINJAMAN_KE_DIPAKAI` (409). Tercatat di `riwayat_perubahan` (`ubah_pinjaman_ke`). |
| `POST /pinjaman/:id/batal` | bos | `{ alasan }` — batal akad salah input: hanya hari akad, sebelum ada peristiwa, dan **sebelum kas pencairnya diterima** (`KAS_SUDAH_DITERIMA`). Salinan migrasi: hanya **hari disalin**, sebelum ada peristiwa (boleh berstatus macet; tanpa pemeriksaan kas). |
| `POST /pinjaman/:id/putihkan` | bos | `{ alasan, keterangan }` |
| `POST /pinjaman/:id/putihkan/batal` | bos | `{ alasan }` |
| `POST /lapangan/bayar` · `/lunas` · `/gulung` | kolektor | Mengubah `saldo`/`status` di transaksi yang sama dengan baris `transaksi` penyebabnya. Gulung wajib membawa `fotoSerahTerimaId` untuk pinjaman penerusnya. |

Field API lama (`collectorId`, `admin`, `tabunganAwal`, `macetSejak`,
`catatanPemutihan`) dipertahankan sampai aplikasi beralih.

## Service / logika nantinya

- **Syarat akad** dari satu rumus (`shared/money/akad.ts`): harian & mingguan
  potong 5% admin + 5% tabungan, kembali 120%; tempoan tanpa potongan,
  kembali 125%.
- **Gulung**: asal harus masih ditagih; rem `kebijakan` diperiksa lebih dulu
  (`gulung_pinjaman_dikunci`, `naik_pinjaman_dikunci`); harian: tidak macet,
  pinjaman pertama tak boleh naik, ambang angsuran (ke-1–3 mulai angsuran 12,
  ke-4 dst mulai 10); pencairan bersih > 0. Urutan tulis: transaksi gulung →
  asal `digulung` → penerus → tabungan masuk.
- **Macet** dinilai sapuan tengah malam per kantor (`domain/evaluasi-macet.ts`):
  harian < 5× angsuran / mingguan < 1× angsuran setoran 30 hari terakhir
  (dua arah, bisa pulih); tempoan lewat 7 hari dari jatuh tempo.
- **Batal akad**: status `batal` + kolom batal terisi, tabungan masuk ditarik
  lagi — di satu transaksi. Ditolak bila serah terima kas pencair hari itu
  sudah berlaku (droping menggeser tunai seharusnya). Tidak ditulis ke
  riwayat: barisnya sudah menyimpan siapa, kapan, kenapa.
- **Pemutihan**: status `diputihkan`, saldo & tabungan tak disentuh, tanpa
  transaksi; nasabah diblokir. Batal pemutihan mengembalikan `macet` (bila
  `tanggal_macet` tersimpan) atau `berjalan`.
- **Foto serah terima** dikaitkan di transaksi yang sama dengan akad/gulung:
  harus jenis `serah_terima`, milik kantor ini, diunggah kolektor itu sendiri,
  berumur < 1 jam, belum dipakai — lihat [schema-foto.md](schema-foto.md).
- Setiap perubahan `status` tercatat otomatis di `riwayat_status_pinjaman`;
  suntingan bos tercatat di `riwayat_perubahan`.

## Catatan migrasi (tidak dijalankan di sesi desain)

1. Ganti nama kolom (lihat tabel perubahan) dan constraint/index; sesuaikan
   trigger riwayat status (`macet_sejak` → `tanggal_macet`).
2. `jatuh_tempo` → kolom turunan: buang kolom lama, tambah kolom
   `GENERATED`; buang `pinjaman_jatuh_tempo_check`.
3. Tambah `UNIQUE (id, nasabah_id)`, lalu ganti FK `pinjaman_asal_id` menjadi
   gabungan (periksa dulu tak ada gulung lintas nasabah).
4. Ganti FK `dibuat_oleh` & `diputihkan_oleh` menjadi gabungan.
5. Index `(kantor_id, tanggal_selesai)` parsial (`CONCURRENTLY` di produksi).
6. `ALTER TABLE pinjaman SET (fillfactor = 90)`; berlaku untuk halaman baru —
   `VACUUM FULL` / `pg_repack` di jam sepi bila ingin seluruh tabel.
7. Tambah `foto_serah_terima_id` (sesudah tabel `foto` ada), FK, UNIQUE
   parsial, dan `pinjaman_foto_check ... NOT VALID` — jangan di-`VALIDATE`:
   pinjaman lama memang tak berfoto.
8. Tambah kolom batal; isi pinjaman `batal` lama dari jejak `riwayat_perubahan`
   (`batal_akad`: pelaku, waktu, alasan; tanpa jejak → bos kantor itu,
   `tanggal_selesai`, "(data lama)"), lalu pasang `pinjaman_batal_check`.
