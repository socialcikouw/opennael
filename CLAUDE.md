# OpenNael

Pembukuan koperasi simpan-pinjam harian: kolektor menagih di lapangan, kasir
menerima setoran sore, pengawas memeriksa, bos memegang kendali. Repo ini
membangun ulang aplikasi lama dari akarnya — **rancangan database di
`docs/skema/` adalah acuannya**.

Nama aplikasi **OpenNael** (dulu "Nael Capital", ganti nama 26 Okt 2026):
teks tampilan `OpenNael`, nama teknis huruf kecil (`@opennael/*`,
`opennael://`, `com.opennael.app.*`). **Nael Capital** tetap nama usaha
koperasinya — contoh nama kantor di docs & data uji memakai nama itu. Nama
`naelcapital` hanya tersisa di rujukan repo/aplikasi lama.

Dokumen yang dibaca lebih dulu:

| Dokumen | Isi |
|---|---|
| [`docs/produk.md`](docs/produk.md) | Peran & aplikasi, alur satu hari, jenis & status pinjaman, **istilah** |
| [`docs/aturan-usaha.md`](docs/aturan-usaha.md) | Rumus & aturan bernomor dengan contoh angka — acuan `packages/domain` dan ujinya; ubah dokumen ini lebih dulu |
| [`docs/keputusan.md`](docs/keputusan.md) | Keputusan besar beserta alasan dan yang ditolak — keputusan baru ditambahkan di sini |
| [`docs/skema/`](docs/skema/README.md) | Rancangan database per tabel + konvensi penamaan |

Skill proyek: **`tabel-baru`** (`.claude/skills/tabel-baru/`) — langkah baku
membangun satu tabel dari `docs/skema/`.

Berkomunikasi dengan pemilik dalam **bahasa Indonesia**.

## Pembagian aplikasi (keputusan pemilik, 23 Okt 2026)

| Aplikasi | Untuk | Cara masuk |
|---|---|---|
| **`apps/web`** | **Bos saja** | Nomor HP + kata sandi; registrasi kantor baru (berkode). Bos juga **menyetujui tautan HP** karyawan dari web (memindai QR dengan kamera atau mengetik kodenya). |
| **`apps/mobile`** | **Kasir, pengawas, kolektor saja** | **Hanya tautan QR** yang disetujui bos. |

Di aplikasi mobile **tidak ada** layar login nomor HP + kata sandi, registrasi,
atau layar khusus bos — istilah "login/daftar" milik web. Sebaliknya web
tidak dipakai kasir, pengawas, atau kolektor.

## Struktur monorepo (Bun workspaces)

| Folder | Isi |
|---|---|
| `apps/api` | Server HTTP + database (satu-satunya yang menyentuh Postgres). |
| `apps/mobile` | Aplikasi Android/iOS untuk **kasir, pengawas, kolektor** — masuk hanya lewat tautan QR. |
| `apps/web` | Aplikasi web **bos** — masuk nomor HP + kata sandi, registrasi kantor, persetujuan tautan HP, dan seluruh pekerjaan bos. |
| `packages/contracts` | Skema Zod bentuk permintaan & respons API — dipakai bersama server dan klien. |
| `packages/domain` | Aturan usaha murni tanpa I/O: rumus akad, jadwal tagih, aturan macet, rumus kas. Dipakai server dan aplikasi (pratinjau di HP). |
| `docs/skema` | Rancangan database final, satu dokumen per tabel. |

Arah ketergantungan: `apps/*` → `packages/*`; `packages/domain` tidak
bergantung pada apa pun; `packages/contracts` hanya pada `zod` (dan `domain`
bila perlu tipe).

## Stack (diputuskan 23 Okt 2026)

### Pondasi

| Alat | Untuk apa |
|---|---|
| **Bun** | Runtime, package manager (workspaces), uji (`bun test`), build. |
| **TypeScript `strict`** | Semua paket; `tsconfig` dasar bersama di root. |
| **Biome** | Lint + format semua paket (pengganti ESLint + Prettier). |

### `apps/api`

| Alat | Untuk apa |
|---|---|
| **Hono** di `Bun.serve` | Rute HTTP. |
| **`@hono/zod-openapi`** + **Zod** | Validasi, tipe, dan OpenAPI dari satu definisi rute; juga validasi `.env` saat server menyala. |
| **Scalar** (`@scalar/hono-api-reference`) | Halaman dokumentasi API. |
| **Drizzle ORM** + **drizzle-kit** | Kueri bertipe & migrasi; trigger/fungsi/`EXCLUDE` lewat migrasi SQL kustom. |
| **postgres.js** | Driver Postgres (Supabase dev & VPS). `bigint` rupiah → `number`. |
| **`Bun.password`** (argon2id) | Hash kata sandi bos — tanpa paket native. |
| **`hono/jwt`** | Token akses; token refresh per perangkat sesuai [schema-perangkat.md](docs/skema/schema-perangkat.md). |
| **hono-rate-limiter** (memori) | Batas permintaan — satu proses, tanpa Redis. |
| **pino** | Log terstruktur JSON. |
| **croner** | Jadwal dalam proses: sapuan tengah malam, pembersihan foto sementara. |
| Penyimpanan berkas: satu antarmuka, dua penggerak | **Disk lokal** (dev & VPS) atau **S3** via `Bun.s3` (mis. Cloudflare R2). |

Sengaja **tidak** dipakai: Redis (kunci idempoten disimpan di Postgres),
Sharp (HP sudah mengompres & menyimpan ulang foto; server memeriksa tipe dari
isi berkas, ukuran, SHA-256).

### Paket bersama

| Paket | Isi |
|---|---|
| `packages/contracts` | Skema Zod permintaan & respons — dipakai rute Hono dan formulir klien. |
| `packages/domain` | Aturan usaha murni: rumus akad, jadwal tagih, macet, rumus kas, kalender kantor (tanggal = teks `YYYY-MM-DD`; WIB/WITA/WIT offset tetap, tanpa pustaka tanggal). |

### `apps/mobile`

| Alat | Untuk apa |
|---|---|
| **Expo** (SDK terbaru) + **Expo Router** | Aplikasi Android/iOS. |
| **EAS Build + EAS Update** | APK & pembaruan OTA. |
| **`StyleSheet`** bawaan React Native + token `src/komponen/tema.ts` | Gaya. **Tidak pernah NativeWind, Tailwind, atau pustaka gaya berbasis kelas lain di HP** (keputusan final pemilik, 25 Okt 2026) — jangan diusulkan lagi. Nilai warna disalin dari palet Tailwind web, jarak kelipatan 4 pt, huruf dalam pt. Layar merangkai komponen dasar `src/komponen/ui.tsx` dan gaya bersama `g`; warna (`"#…"`), ukuran huruf, dan jarak selalu dari token. Ukuran khusus satu elemen (lebar avatar, tombol rana) boleh di `StyleSheet` lokal layar itu. |
| Klien RPC Hono (`hc`) per modul + **TanStack Query** | Data. Kiriman gagal diulang otomatis dengan **kunci idempoten** yang sama — tanpa mode offline penuh (sinyal buruk jarang). |
| **react-hook-form** + Zod | Formulir dengan skema dari `contracts`. |
| **expo-camera** | Foto serah terima (kamera saja, bukan galeri) & pemindai QR. |
| **expo-image-manipulator** | Kompres & simpan ulang foto (±200 KB, EXIF terbuang). |
| **expo-location** | GPS titik rumah & lokasi foto. |
| **expo-secure-store** | Token perangkat. |

### `apps/web`

| Alat | Untuk apa |
|---|---|
| **React + Vite** | Aplikasi bos (SPA statis). |
| **TanStack Router** | Navigasi bertipe. |
| **TanStack Query** + `hc` | Data. |
| **TanStack Table** | Tabel besar (nasabah, transaksi, buku kas). |
| **Tailwind CSS + shadcn/ui** | Tampilan. |
| **Recharts** | Grafik harian. |

### Uji

- `packages/domain`: uji murni (rumus akad, macet, jadwal, kas).
- `apps/api`: rute lewat `app.request(...)` tanpa menyalakan server; uji yang
  menyentuh database **hanya ke Supabase dev** (dijaga pemeriksaan host); uji
  skema memastikan CHECK, FK, dan trigger menolak data salah.

### Lingkungan

| | Database | Server |
|---|---|---|
| Pengembangan | Supabase (Postgres polos) | `bun --watch` |
| Produksi | PostgreSQL di VPS | `bun build --compile` (satu berkas program) + systemd, di belakang **Nginx** (sudah terpasang; Caddy ditimbang lagi saat rilis) — Nginx juga melayani berkas statis `apps/web`. |

### Catatan Hono

- **Rute dipecah per modul** (`kantor`, `pengguna`, `pinjaman`, …) dan klien
  RPC dibuat per modul — satu tipe gabungan raksasa memperlambat `tsc`.
- **Bentuk data tetap di `packages/contracts`** (Zod); rute Hono memakainya,
  bukan mendefinisikan ulang.
- **Tipe untuk klien `hc` = berkas deklarasi**: `apps/api` menghasilkan
  `apps/api/tipe/*.d.ts` (`bun run tipe`, tidak ikut repo); klien mengimpor
  `import type { App } from "@opennael/api/tipe"`. Impor langsung dari
  `apps/api/src` ikut membawa tipe Bun/`node:crypto` ke pemeriksaan tipe HP.
  Skrip `typecheck` mobile menghasilkan tipe itu lebih dulu.
- Middleware yang dirangkai sendiri: log (pino), rate limit, penerjemah galat
  domain → respons HTTP.

## Database

- **`docs/skema/` adalah sumber kebenaran.** Ubah dokumennya lebih dulu (dan
  sepakati dengan pemilik), baru skema Drizzle & migrasinya. Konvensi penamaan
  ada di `docs/skema/README.md` — wajib diikuti: `kantor_id`, `dibuat_at`,
  `<kejadian>_at` + `<kejadian>_oleh`, `alasan_<kejadian>`, boolean tanpa
  `is_`, nama constraint berpola.
- **Postgres polos.** Jangan memakai fitur khusus Supabase (Auth, Storage,
  RLS, Realtime, Edge Functions) — produksi berjalan di Postgres VPS dan harus
  pindah tanpa mengubah kode. Supabase hanya tempat Postgres pengembangan.
- **Uang**: `bigint` rupiah, tanpa pecahan. Tabel uang **hanya bertambah** —
  salah catat dibatalkan (`dibatalkan_at/_oleh/alasan_batal`), tidak disunting
  atau dihapus. Riwayat (`riwayat_perubahan`) hanya untuk data yang ditimpa
  atau dihapus.
- **Tanggal pembukuan** = kalender kantor (`kantor.zona_waktu`), kolom `date`.
- **Tenant**: setiap kueri dibatasi `kantor_id` dari token; FK gabungan
  `(x_id, kantor_id)` menjaga data lintas kantor.
- CHECK yang melibatkan kolom boleh kosong ditulis dengan `IS NOT NULL`
  eksplisit — CHECK meloloskan NULL.

## Aturan kerja

- **Skrip yang menulis atau menghapus isi database** (seed, drop, reset, data
  uji) wajib menolak berjalan bila host `DATABASE_URL` bukan Supabase dev
  (berakhiran `.supabase.com`). Produksi tidak pernah disentuh dari mesin
  pengembang.
- **Jangan menjalankan `expo web`** atau server pratinjau web untuk aplikasi
  mobile. Verifikasi lewat `tsc`/lint/uji, lalu pemilik mencoba di HP-nya.
- **Rahasia** (`DATABASE_URL`, kunci JWT, kunci penyimpanan berkas) hanya di
  `.env` — tidak pernah di-commit. Sediakan `.env.example`.
- **Commit lalu push otomatis** ke `origin` (GitHub) setiap selesai satu langkah yang lolos pemeriksaan — keputusan pemilik 23 Okt 2026.
- Repo lama (`desktop\re-launching\naelcapital` dan `naelcapitalAPI`) masih
  dipakai karyawan di lapangan — **jangan mengubah branch `main` repo lama**.
- **Aplikasi mobile baru terpisah dari aplikasi lama**: proyek EAS
  `@socialnael/opennael` (`c433d424…`, ditautkan 26 Okt 2026; bukan
  `NaelCapital`/`d537903a…` milik APK lapangan) dan paket `com.opennael.app.preview` untuk APK uji. Jangan
  menautkan ke proyek EAS lama atau memakai paket `com.naelcapital.app` —
  pembaruan OTA bisa nyasar ke HP karyawan. Proyek EAS sebelum ganti nama
  (`d1db6915…`, slug lama) tidak dipakai lagi. Varian rilis diputuskan saat
  aplikasi baru menggantikan yang lama.
- **Variabel EAS `EXPO_PUBLIC_API_URL` lingkungan `preview` belum ada** di
  proyek `@socialnael/opennael`. Sebelum diisi (`https://…`), `build:preview`
  / `update:preview` ditolak `app.config.ts`; Expo Go tidak terpengaruh.
  APK Nael Uji lama (proyek & sidik jari lama) wajib dibangun ulang.

## Jalur rilis aplikasi HP (keputusan pemilik, 24 Okt 2026)

Satu nama jalur di semua tempat: **profil EAS = `APP_VARIANT` = channel =
branch EAS Update**.

| Jalur | Git | Aplikasi / paket | JS dari |
|---|---|---|---|
| `development` | branch apa saja | **Expo Go** di HP (tanpa build; APK Nael Dev tidak dipakai sejak 25 Okt 2026) | Metro di laptop |
| `preview` | `main` | Nael Uji / `com.opennael.app.preview` | EAS Update channel `preview` (manual: `bun run update:preview`) |
| `production` | `production` (dibuat saat rilis pertama) + tag `mobile-vX.Y.Z` | diputuskan saat menggantikan aplikasi lama | EAS Update channel `production` |

- `runtimeVersion` = **fingerprint**: perubahan JS boleh lewat OTA; perubahan
  native (paket ber-kode native, `app.json`, plugin) wajib build ulang — OTA ke
  APK lama otomatis tidak masuk. `eas update` wajib memakai `APP_VARIANT` yang
  sama dengan build-nya (skrip `update:<jalur>` sudah menyetelnya).
- Ke produksi: **`eas update:republish`** grup yang sudah diuji di `preview`,
  bukan bundle ulang. Perbaikan darurat: branch dari `production`, kirim,
  lalu gabung balik ke `main`. Update rusak: `eas update:rollback`.
- **API kompatibel mundur** terhadap versi HP yang masih beredar (HP baru
  menerima OTA saat aplikasi dibuka ulang).
- Alamat API `preview` = variabel EAS `EXPO_PUBLIC_API_URL` lingkungan
  `preview` (`https://`, dijaga `app.config.ts` agar IP laptop dari `.env`
  tidak ikut terbundel).

## Perintah

Dari root repo:

| Perintah | Isi |
|---|---|
| `bun install` | Pasang dependensi semua paket (satu `bun.lock`). |
| `bun run typecheck` | `tsc --noEmit` di setiap paket. |
| `bun run test` | `bun test` di setiap paket yang punya uji. Uji skema database berjalan ke Supabase dev (`apps/api/.env`) dalam satu transaksi yang dibatalkan; tanpa `DATABASE_URL` dilewati. |
| `bun run lint` | Biome: lint + cek format (Markdown & `docs/` tidak ikut). |
| `bun run format` | Biome: rapikan kode & urutkan import. |

Per paket (`cd apps/<nama>`):

| Paket | Perintah |
|---|---|
| `apps/api` | `bun run dev` (server + muat ulang otomatis, port dari `.env`, bawaan 3000); dokumentasi API di `/dokumentasi`, OpenAPI di `/openapi.json`. Server juga menjalankan **sapuan tutup hari** (saat menyala + tiap jam menit ke-5) ke database di `.env` — di pengembangan: Supabase dev; menyunting `server.ts` saat `--watch` menyala memicu sapuan itu. |
| `apps/web` | `bun run dev` (Vite, port 5173) bersama `apps/api` `bun run dev` — web memanggil API di `/api/...` yang diteruskan Vite ke port 3000 (di produksi: Nginx `location /api/ { proxy_pass http://127.0.0.1:3000/; }`), satu asal tanpa CORS. `bun run build` = tipe API + typecheck + berkas statis `dist/`. Sesi bos di `localStorage`. Komponen shadcn/ui disalin tangan ke `src/komponen/ui/` (CLI `shadcn` menggantung di mesin ini); layar di `src/layar/`, dimuat per rute (`lazyRouteComponent`). |
| `apps/mobile` | `bun run start` (Metro mode **Expo Go** — satu-satunya cara membuka aplikasi di Android & iPhone; Expo Go di HP harus versi SDK 58 dari toko; `expo-dev-client` sengaja tidak dipasang supaya `expo start` selalu mode Expo Go); paket ber-kode native dipasang dengan `bunx expo install <paket>` (versi cocok SDK), bukan `bun add`; `bunx expo-doctor` untuk memeriksa. **Tidak pernah `expo web`.** Rute di `src/app/` (Expo Router); panduan resmi Expo ada di `apps/mobile/AGENTS.md`. Alamat API di `apps/mobile/.env`: `EXPO_PUBLIC_API_URL=http://<IP laptop>:3000` (bukan localhost). Pemeriksaan bundel tanpa HP: `bunx expo export --platform android --output-dir <folder sementara>`. **Aplikasi harus tetap bisa dibuka Expo Go** (keputusan 25 Okt 2026): paket ber-kode native hanya yang sudah ada di Expo Go SDK 58, versinya persis `bunx expo install --check`. Tambah `-- --clear` untuk mengosongkan cache. **Jalankan Expo dari path asli** (`...\Desktop\...`, huruf besar-kecil persis seperti di disk): dari `...\desktop\...` Metro memuat setiap modul dua kali dan Expo Go iOS crash (`Tried to register two views with the same name RNCSafeAreaProvider`); `metro.config.js` menolak bundling dari path seperti itu dan menunjukkan `cd` yang benar. Pembungkus di `scripts` sengaja tidak dipakai — `scripts` package.json ikut sidik jari runtime. Babel memakai bawaan Expo (tanpa `babel.config.js`), Metro bawaan + penjaga itu. Galat start iOS di React Native seperti `property is not writable` (`__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__`), `Global was not installed`, atau `Tried to register two views` hampir pasti **bundel ganda** — periksa huruf path dulu (bundel iOS dev ±1829 modul; ±3000 = ganda), jangan menambal React Native. Tambalan Fusebox & catatan JSX-NativeWind lama dibuang 25 Okt 2026 setelah diuji di iPhone dari path asli. Bug `Cannot find native module 'ExpoAsset'` saat muat ulang di tempat milik Expo Go 58.0.5 (expo/expo#52146), sudah diperbaiki di rilis Expo Go berikutnya — perbarui Expo Go dari toko. **Development build tidak dipakai** (keputusan 25 Okt 2026): `expo-dev-client` & profil EAS `development` dibuang; memasangnya lagi membuat `expo start` jatuh ke mode development build. **Preview**: `bun run build:preview` (APK Nael Uji, channel `preview`), `bun run update:preview --message "<isi>"` (OTA ke Nael Uji). |

Catatan instalasi: `bunfig.toml` memakai `linker = "hoisted"` — instalasi
isolated (bawaan Bun 1.3) membuat salinan ganda `expo`/`react-native` yang
ditolak `expo-doctor`. `react`/`react-dom` di `apps/web` disamakan persis
dengan versi yang dipatok Expo di `apps/mobile`.

Database (`cd apps/api`, membaca `apps/api/.env`):

| Perintah | Isi |
|---|---|
| `bun run db:generate` | Skema Drizzle (`src/db/skema/`) → berkas SQL baru di `src/db/migrasi/`. Periksa SQL-nya sebelum diterapkan. |
| `bunx --bun drizzle-kit generate --custom --name <nama>` | Migrasi SQL kustom kosong — untuk fungsi, trigger, `EXCLUDE`. |
| `bun run db:migrate` | Terapkan migrasi yang belum jalan (dicatat di `drizzle.__drizzle_migrations`). |

Migrasi yang sudah diterapkan **tidak pernah disunting** — perubahan selalu
lewat migrasi baru. Nama constraint ditulis eksplisit sesuai konvensi #8
(`foreignKey({ name })`, bukan `.references()` yang memberi nama bawaan).

Pemeriksaan sebelum commit: `bun run typecheck && bun run test && bun run lint`.
