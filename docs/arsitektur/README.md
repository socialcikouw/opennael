# Arsitektur OpenNael

Disetujui pemilik 28 Oktober 2026. Monorepo Bun, backend modular monolith,
satu PostgreSQL. Aturan usaha dan `docs/skema/` tetap menjadi acuan. Web
khusus bos, mobile khusus karyawan. Semua perubahan di `dev`; merge `main`
dan OTA hanya atas perintah pemilik.

## Susunan tujuan

Disempurnakan 30 Okt 2026: rincian, peta pemindahan, dan kepemilikan tabel di
[struktur.md](struktur.md); aturan umum di [pedoman-struktur.md](pedoman-struktur.md).

- `apps/api/src/server.ts` (titik masuk), `app.ts` (perakitan), `jadwal.ts`
  (pekerjaan terjadwal), `env.ts`.
- `apps/api/src/platform`: database (skema/migrasi), HTTP, idempotensi,
  penyimpanan, riwayat dan observabilitas.
- `apps/api/src/modul`: identitas, kantor, hari-kolektor, pembiayaan, kas,
  penggajian, pelaporan dan migrasi. Modul besar memiliki submodul.
- `apps/mobile/src/app`: rute/layout tipis; perilaku/UI di `fitur`, komponen
  lintas fitur di `komponen`, integrasi perangkat di `platform`.
- `apps/web/src/rute`: rute berbasis berkas; fitur mengelompokkan data,
  formulir dan UI.
- `packages/domain`: rumus murni tanpa I/O.
- `packages/contracts`: skema Zod input/output dan galat, mengikuti modul API.
- `packages/api-client`: transport bersama dan klien bertipe per modul;
  tipe server dihasilkan menjadi deklarasi, tanpa runtime server di klien.
- `packages/format`: format tampilan bersama web & HP.
- `scripts`: rilis dan pemeriksaan arsitektur; `.github/workflows`: CI.

## Kepemilikan dan interface

Identitas mengurus akun, sesi, perangkat dan tautan. Kantor memiliki kalender,
wilayah dan kebijakan. Pembiayaan memiliki nasabah, akad, pinjaman, setoran,
tabungan dan pembatalannya. Hari kolektor memiliki absen, rute, laporan dan
serah terima. Kas memiliki buku kas/pencocokan; penggajian memiliki gaji.
Pelaporan boleh membaca lintas tabel; penulisan melewati operasi pemiliknya.
Migrasi mengorkestrasi impor melalui operasi dalam transaksi sama.

Modul lain hanya mengimpor ekspor publik. Rute menerjemahkan permintaan ke
operasi; operasi mengatur transaksi dan memanggil domain; kueri membentuk
bacaan. Drizzle boleh langsung di bagian data, tanpa repository generik
atau interface satu-per-tabel. UI web dan mobile tetap terpisah.

## Transaksi uang

Autentikasi dan validasi input sebelum operasi. Dalam satu transaksi: klaim
kunci idempoten, kunci keadaan, periksa hak/kantor/keadaan hari, hitung domain,
tulis perubahan dan hasil. Kunci hari didahulukan sebelum nasabah/pinjaman;
penutupan memakai protokol sama. Respons setelah commit. Pengulangan
mengembalikan hasil lama; isi berbeda ditolak. Klien lama tanpa header tetap
diterima selama masa kompatibilitas.

Constraint/trigger menjaga invarians data; operasi mengorkestrasi alur.
Saldo dan riwayat uang diperbarui atomik, tanpa event bus untuk perubahan saldo.

## Pemeriksaan dan tahapan

Typecheck, uji domain, API/constraint di Supabase dev, uji konkurensi dengan
koneksi terpisah, kontrak respons, isolasi tenant dan lint. CI memeriksa
impor, tanpa merge/OTA/migrasi otomatis. Pemilik mencoba perubahan di HP.

- [x] 1. Pemeriksaan awal dan pencatatan rancangan.
- [ ] 2. Idempotensi database/API/klien dan uji konkurensi.
- [ ] 3. Pemisahan modul, kalender, operasi/kueri dan kepemilikan data.
- [ ] 4. Klien API bersama, fitur web dan rute mobile tipis.
- [ ] 5. Entrypoint HTTP/jobs, observabilitas, batas impor dan CI.

Setiap tahap diperiksa lalu di-commit/push ke `origin/dev`. Hasil dan
keterbatasan dicatat agar pekerjaan dapat dilanjutkan tanpa menebak.

28 Okt 2026 — awal: typecheck dan lint lolos; 64 uji domain, 48 API/database, 18 mobile lolos. Tautan workspace dipulihkan dengan bun install --frozen-lockfile; lockfile tidak berubah.

29 Okt 2026 — tahap 2a: migrasi 0023 diterapkan ke Supabase dev. Backend melindungi operasi lapangan, setoran sore, kas, gaji, tabungan, pembatalan dan migrasi dengan Idempotency-Key opsional. 51 uji API/database, 64 domain dan 18 mobile lolos. Uji konkurensi memakai dua koneksi; fixture sudah dibersihkan. Integrasi retry/persistensi kunci klien menyusul bersama api-client.

30 Okt 2026 — struktur.md langkah 0–3b. Langkah 0: `lapangan/` dipecah (operasi/kueri/data) dan buka laporan + gerbang mengunci baris `hari_kolektor` (uji dua koneksi). Langkah 1: skrip migrasi ke `apps/api/scripts`, instruksi agen satu sumber (`AGENTS.md`). Langkah 2: `platform/{http,db}`, `riwayat`, `penyimpanan`, `jadwal.ts`, `rem` ke `packages/domain`. Langkah 3a: modul dipindah ke konteks (`identitas`, `kantor`, `hari-kolektor`, `pembiayaan`, `penggajian`, `pelaporan`; `kas` dan `migrasi` datar) dengan `index.ts` per konteks; rute menerima pemeriksa token yang disuntik. Langkah 3b: `lapangan/` dan `pengaturan/` dipecah ke pemiliknya — gerbang & absensi di `hari-kolektor`, kalender/profil/kebijakan di `kantor`, akad & gulung di `pembiayaan/akad`, bayar/lunas/libur di `pembiayaan/peristiwa`, tarif di `penggajian/tarif`; uji `lapangan.test.ts` dan `pengaturan.test.ts` dipecah per pemilik dengan pembantu `uji/lapangan.ts`. OpenAPI sebelum/sesudah identik di setiap langkah (92 jalur), `db:generate` tanpa perubahan. Nama operasi idempoten lapangan tetap `lapangan/<metode>` agar kunci yang beredar tetap berlaku. Sisa untuk 3c: penulisan lintas pemilik (§4.3), idempotensi ditandai di modul (bukan daftar string di `app.ts`), pecah `skema.test.ts` dan berkas skema gabungan; impor langsung antar-konteks yang masih tersisa (mis. `setoran-sore/kunci-hari`) dibereskan di sana. Pembantu `tulis` di `kas` dan `pemutihan` berbeda-beda (tag, status, params) dan sengaja belum disatukan; `index.ts` pembiayaan mengekspor 21 nama (di atas batas ±10 — turun saat idempotensi ditandai di modul).
