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

30 Okt 2026 — struktur.md langkah 0–8. Langkah 0: `lapangan/` dipecah (operasi/kueri/data) dan buka laporan + gerbang mengunci baris `hari_kolektor` (uji dua koneksi). Langkah 1: skrip migrasi ke `apps/api/scripts`, instruksi agen satu sumber (`AGENTS.md`). Langkah 2: `platform/{http,db}`, `riwayat`, `penyimpanan`, `jadwal.ts`, `rem` ke `packages/domain`. Langkah 3a: modul dipindah ke konteks (`identitas`, `kantor`, `hari-kolektor`, `pembiayaan`, `penggajian`, `pelaporan`; `kas` dan `migrasi` datar) dengan `index.ts` per konteks. Langkah 3b: `lapangan/` dan `pengaturan/` dipecah ke pemiliknya; uji dipecah per pemilik (`uji/lapangan.ts`). Langkah 3c: penulisan lintas pemilik dibereskan lewat operasi publik pemilik (`bukaKantor`/`aturPekanKerjaAwal`, `aturTarifAwal`, `klaimTanggalTutup`, `batalTransferTransaksi`, `salinPinjaman`) — satu-satunya pengecualian tercatat tinggal `kantor/wilayah` (§4.3); operasi idempoten ditandai di modulnya (`buatLayanan<X>Idempoten`, nama operasi tersimpan tetap `lapangan/<metode>` untuk lapangan); `kas.ts`/`libur.ts`/`tabungan.ts` skema dipecah per tabel (`rupiah`, `cekBatal` ke `kolom.ts`); `skema.test.ts` dipecah ke `platform/db/skema/<tabel-utama>.test.ts` (pembantu di `uji/skema.ts`). OpenAPI sebelum/sesudah identik di setiap langkah (92 jalur), `db:generate` tanpa perubahan. Catatan: `pastikanKolektor` diduplikasi di `penggajian/tarif` (menghindari ekspor lintas konteks di luar daftar §4.1); `index.ts` `kantor` (22), `pembiayaan` (21), dan `hari-kolektor` (11) melewati batas ±10 nama karena masih mengekspor perakit layanan & rute untuk `app.ts` — dipertimbangkan ulang bersama `api-client`/tipe rute per konteks (langkah 6); pembantu `tulis` di `kas` dan `pemutihan` berbeda-beda (tag, status, params) dan sengaja belum disatukan. Langkah 4 (31 Okt 2026): `packages/contracts` dikelompokkan per konteks (`bersama`, `identitas`, `kantor`, `hari-kolektor`, `pembiayaan`, `penggajian`, `pelaporan`; `kas` dan `migrasi` datar), `lapangan.ts`/`pengaturan.ts` dipecah ke pemiliknya, `index.ts` tetap mengekspor semuanya; salinan `orang`/`tanggal`/`rupiah` jadi satu (`bersama/dasar.ts`), parameter jalur (`idParamSchema` dkk.) dan jawaban inline `hari-ini`/putus perangkat pindah dari `rute.ts` ke contracts. OpenAPI tetap identik. Langkah 5 (31 Okt 2026): `packages/format` (uang, tanggal kantor, label; dua bentuk tanggal web/HP jadi `tanggal(t, "tanpa"|"pendek"|"panjang")`) dipakai web dan HP, `lib/format.ts` keduanya dihapus (nada lencana status tetap di `apps/web/src/lib/status-pinjaman.ts`, `cobaAturan` di `apps/mobile/src/lib/aturan.ts`); `domain/pinjaman.test.ts` dipecah menjadi `akad`, `setoran`, `gulung`. Sidik jari runtime HP tetap (654c5ebc…), bundel Android dan build web jadi. Langkah 6 (31 Okt 2026, bagian pertama): `apps/api` mengekspor `Rute<Konteks>` per konteks (`@opennael/api/tipe/<konteks>`); paket `packages/api-client` (transport bersesi dengan refresh sekali dibagi, sesi dengan penyimpan yang disuntik — web `localStorage`, HP `SecureStore`, `panggil`/`ambil`, klien `hc` per konteks) menggantikan `lib/api.ts` dan `lib/sesi.ts` ganda di web dan HP; semua pemanggilan `api.<jalur>` kini `api.<konteks>.<jalur>`; web dan HP tidak lagi mengimpor `@opennael/api/tipe`. Belum: `kueri.*`/`tulis.*` bersama (kunci kueri literal di layar masih ada, ikut dirapikan di langkah 7–8) dan kunci idempoten + ulang otomatis di klien (perubahan perilaku, commit terpisah). Langkah 7 (31 Okt 2026): web memakai rute berbasis berkas TanStack Router (`src/rute/`, `routeTree.gen.ts` di-commit dan dikecualikan Biome); 15 layar besar dipecah otomatis (AST + type-checker) menjadi 13 fitur di `src/fitur/<area>/` — `layar-*.tsx`, `komponen/` satu komponen per berkas, `data.ts` (pengambil data & hook), `inti.ts` (pendukung bersama), `index.ts` untuk ekspor lintas-fitur; ketergantungan antar-fitur persis seperti rancangan (beranda→aktivitas, nasabah→aktivitas/pinjaman, pinjaman→aktivitas, setoran-sore→pinjaman); `Kerangka` pindah ke `fitur/akun`; `useTenang` satu salinan di `lib/tenang.ts`, `tanggalSah`/`teksSah` di `lib/pencarian.ts`. `validateSearch` tetap fungsi yang sama (bukan Zod) dan hook kueri/mutasi masih di dalam komponen — dirapikan bersama `kueri.*` api-client. Langkah 8 (31 Okt 2026, HP): alias `@/` (`paths` di tsconfig; Metro membacanya bawaan); `komponen/ui.tsx` (657 baris) dipecah menjadi `komponen/ui/*` bersama `tema`, `tampilan`, `daftar-ikon`; `platform/` (brankas, foto, perangkat), `lib/peran.ts` -> `lib/navigasi.ts` + `lib/kantor.ts`; 14 layar dipindah dari `app/` ke `fitur/<area>/layar-*.tsx` dengan rute ≤ 20 baris, sub-komponen dipecah ke `komponen/` (pemecah AST), `lib/lapangan` -> `fitur/lapangan/data` (+ `gerbang.ts`), `lib/setoran` -> `fitur/setoran-sore/data` (+ `inti.ts`), `fitur/mode`+`fitur/semua` digabung ke `fitur/tagihan`; antar-fitur hanya tagihan→lapangan (+ akun) lewat `index.ts`; penjaga sesi/peran kini `Stack.Protected` (perubahan mekanisme navigasi — commit terpisah, perlu dicoba pemilik di HP). Sidik jari runtime tetap (654c5ebc…) di tiap sub-langkah. Belum: `layar-gulung`/`layar-tagihan` masih satu komponen besar (±460 baris), gaya per-layar masih satu `buatGaya` per berkas. Sisa: langkah 9.
