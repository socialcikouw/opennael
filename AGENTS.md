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
| [`docs/arsitektur/`](docs/arsitektur/README.md) | Susunan kode: [pedoman](docs/arsitektur/pedoman-struktur.md) (aturan umum struktur) dan [struktur](docs/arsitektur/struktur.md) (peta pemindahan, batas API, urutan kerja, gerbang verifikasi) |

Skill proyek: **`tabel-baru`** (`.claude/skills/tabel-baru/SKILL.md`) — langkah baku
membangun satu tabel dari `docs/skema/`. Claude Code memuatnya otomatis;
agen lain (Codex) membaca berkas itu saat diminta membangun tabel.

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
| `packages/contracts` | Skema Zod bentuk permintaan & respons API — dipakai bersama server dan klien. Folder mengikuti konteks API (`bersama`, `identitas`, `kantor`, `hari-kolektor`, `pembiayaan`, …); `src/index.ts` mengekspor semuanya, klien cukup mengimpor `@opennael/contracts`. |
| `packages/domain` | Aturan usaha murni tanpa I/O: rumus akad, jadwal tagih, aturan macet, rumus kas. Dipakai server dan aplikasi (pratinjau di HP). |
| `docs/skema` | Rancangan database final, satu dokumen per tabel. |
| `scripts` | Skrip repo: rilis OTA (`kirim-ota.ts`). Skrip milik satu paket tinggal di paket itu (mis. `apps/api/scripts/migrasi.ts`). |

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
| **`StyleSheet`** bawaan React Native + token `src/komponen/tema.ts` | Gaya. **Tidak pernah NativeWind, Tailwind, atau pustaka gaya berbasis kelas lain di HP** (keputusan final pemilik, 25 Okt 2026) — jangan diusulkan lagi. Nilai warna disalin dari palet Tailwind web, jarak kelipatan 4 pt, huruf dalam pt. Layar merangkai komponen dasar `src/komponen/ui.tsx` dan gaya bersama `g`; warna (`"#…"`), ukuran huruf, dan jarak selalu dari token. Ukuran khusus satu elemen (lebar avatar, tombol rana) boleh di `StyleSheet` lokal layar itu. **Mode terang & gelap** (27 Okt 2026): palet `TERANG`/`GELAP` di `tema.ts` (kunci sama); warna **tidak pernah** diimpor statis — di komponen `const WARNA = useWarna()`, gaya layar `const buatGaya = (WARNA: Warna) => StyleSheet.create({…})` + `const gaya = useGaya(buatGaya)`, gaya bersama `const g = useG()`, header Stack `useOpsiStack()` (`src/komponen/tampilan.tsx`). Isi hijau berteks (tombol utama, +, chip aktif) = `utamaIsi` + `teksAtasUtama`, bukan `utama` + `putih`. Pilihan Ikuti HP/Terang/Gelap tersimpan di HP; APK `preview` masih `userInterfaceStyle: light` sampai build ulang (lihat `app.config.ts`). |
| **Lucide** (`lucide-react-native`, di atas `react-native-svg`) | Ikon — sama dengan web (shadcn/ui), keputusan pemilik 27 Okt 2026. Hanya lewat `<Ikon nama="…">` (`src/komponen/ui.tsx`); ikon didaftar di `src/komponen/ikon.ts` dengan **impor per ikon** (`lucide-react-native/icons/<nama>`) — impor dari akar paket membawa ±1.600 ikon (+2 MB bundel/OTA). Tanpa versi isi: keadaan aktif = warna + `tebal`. |
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

| | Git | Database | Server |
|---|---|---|---|
| Pengembangan | `dev` | Supabase (Postgres polos) | `bun --watch` di laptop |
| Produksi | `main` | **Sementara Supabase** (sama dengan `dev`) sampai API dipasang di VPS; lalu PostgreSQL di VPS | **Nanti** VPS dengan domain `opennael` (belum dibeli): `bun build --compile` (satu berkas program) + systemd, di belakang **Nginx** (sudah terpasang; Caddy ditimbang lagi saat rilis) — Nginx juga melayani berkas statis `apps/web`. Sampai itu API untuk HP = laptop lewat ngrok (lihat Aturan kerja). |

**Saklar gerbang kalender lapangan** (aturan-usaha C4, keputusan 26 Okt 2026):
`VALIDASI_JAM_KERJA`, `VALIDASI_HARI_KERJA`, `VALIDASI_LIBUR_KANTOR` di
`apps/api/.env`. Laptop: `false` (uji kapan saja); VPS: `true` atau tidak
ditulis (bawaannya `true`). Server menolak menyala bila ada yang `false`
sementara `DATABASE_URL` bukan `*.supabase.com`. Hanya gerbang lapangan &
absen — hari tagih, macet, sapuan tetap memakai kalender sungguhan. Untuk
menguji alert gerbangnya, setel `true` di laptop. **`bun --watch` tidak
memantau `.env`**: sesudah mengubahnya, matikan lalu nyalakan ulang
`bun run dev` di `apps/api`.

### Catatan Hono

- **Rute dipecah per konteks dan submodul** (`modul/<konteks>/<submodul>/rute.ts`;
  konteks lain hanya diimpor lewat `modul/<konteks>/index.ts`) dan klien RPC
  dibuat per modul — satu tipe gabungan raksasa memperlambat `tsc`. Pembantu
  definisi rute (`json`, `aman`, `jawabanGalat`) ada sekali di
  `platform/http/openapi.ts`; pemeriksa token disuntik ke `wajibMasuk`.
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
- **Bekerja di branch `dev`** (keputusan pemilik 26 Okt 2026) — api, web, dan
  mobile sekaligus (satu repo). **Commit lalu push otomatis** ke `origin/dev`
  setiap selesai satu langkah yang lolos pemeriksaan.
- **`main` = hasil tahap akhir**: digabung dari `dev` **hanya saat pemilik
  bilang "gabung ke main"** — `git checkout main && git merge --ff-only dev &&
  git push`, lalu kembali ke `dev`. OTA (`update:preview`, `update:expogo`)
  **hanya dari `main`** dan dijaga `scripts/kirim-ota.ts` (menolak bila bukan
  `main`, ada perubahan belum di-commit, atau `main` belum sama dengan GitHub).
- Repo lama (`desktop\re-launching\naelcapital` dan `naelcapitalAPI`) masih
  dipakai karyawan di lapangan — **jangan mengubah branch `main` repo lama**.
- **Aplikasi mobile baru terpisah dari aplikasi lama**: proyek EAS
  `@socialnael/opennael` (`c433d424…`, ditautkan 26 Okt 2026; bukan
  `NaelCapital`/`d537903a…` milik APK lapangan lama) dan paket
  `com.opennael.app.preview`. Jangan menautkan ke proyek EAS lama atau memakai
  paket `com.naelcapital.app` — pembaruan OTA bisa nyasar ke HP karyawan.
  Proyek EAS sebelum ganti nama (`d1db6915…`, slug lama) tidak dipakai lagi.
- **APK `preview` = aplikasi lapangan sementara** (keputusan pemilik 26 Okt
  2026): belum ada akun Play Store / App Store, jadi kolektor, kasir, dan
  pengawas nanti memasang APK `preview` (Android) dari `main`. **Tugas
  terbuka sebelum dipasang di HP karyawan**: ganti identitasnya (nama "Nael
  Uji" → mis. "OpenNael", paket `.preview` → mis. `com.opennael.app`) — satu
  build ulang; dikerjakan bersama persiapan VPS.
- **API `preview` sementara = terowongan ngrok ke laptop** (26 Okt 2026,
  sampai API dipasang di VPS — pekerjaan terakhir proyek): variabel EAS
  `EXPO_PUBLIC_API_URL` lingkungan `preview` =
  `https://barterer-sapling-cabbage.ngrok-free.dev`. Nael Uji hanya bisa
  memanggil API selama laptop menyalakan `apps/api` `bun run dev` **dan**
  `ngrok http --url=barterer-sapling-cabbage.ngrok-free.dev 3000`. Alamat API
  tidak ikut sidik jari runtime (sudah diuji): pindah ke VPS cukup ganti
  variabel lalu `update:preview`, tanpa build ulang. API di laptop menjalankan
  kode branch yang sedang dikerjakan (biasanya `dev`) — diterima pemilik
  sampai VPS siap (HP karyawan belum memakai APK sebelum itu); aturan API
  kompatibel mundur tetap berlaku.

## Jalur rilis aplikasi HP (keputusan pemilik, 24 & 26 Okt 2026)

Satu nama jalur di semua tempat: **profil EAS = `APP_VARIANT` = channel =
branch EAS Update**.

| Jalur | Git | Aplikasi / paket | JS dari |
|---|---|---|---|
| `development` | `dev` | **Expo Go** di HP Android & iPhone (tanpa build) — tempat menguji perubahan sebelum digabung ke `main` | Metro di laptop |
| `preview` | `main` | Nael Uji / `com.opennael.app.preview` — **aplikasi lapangan sementara** (pengganti Play Store) | EAS Update channel `preview` (manual dari **root**: `bun run update:preview --message "<isi>"`) |
| `expogo` | `main` | **Expo Go** — iPhone pemilik tanpa akun Apple Developer (Android juga bisa); tanpa build, tanpa profil EAS | EAS Update channel `expogo`, runtime `exposdk:58.0.0` (manual dari **root**: `bun run update:expogo --message "<isi>"`) |
| `production` | belum dipakai | menunggu akun Play Store / App Store | EAS Update channel `production` |

- **Jalur `expogo`**: dibuka di Expo Go lewat tautan tetap
  `exp://u.expo.dev/c433d424-1542-47d3-b01b-bbe14a2e76de?channel-name=expogo&runtime-version=exposdk:58.0.0`
  (dipindai sekali; pembaruan berikutnya masuk sendiri). API = lingkungan
  `preview`. Naik SDK = runtime `exposdk:` ikut berganti, tautan diperbarui.
- **Skrip OTA di `package.json` root** (`scripts/kirim-ota.ts`): mengubah
  `scripts` di `apps/mobile/package.json` mengubah sidik jari Nael Uji (sudah
  diuji). Skrip lama `update:preview` di `apps/mobile/package.json` dibiarkan
  hanya karena menghapusnya pun mengubah sidik jari — **jangan dipakai**.
- `runtimeVersion` = **fingerprint**: perubahan JS boleh lewat OTA; perubahan
  native (paket ber-kode native, `app.json`, plugin) wajib build ulang — OTA ke
  APK lama otomatis tidak masuk. `eas update` wajib memakai `APP_VARIANT` yang
  sama dengan build-nya (skrip `update:<jalur>` sudah menyetelnya).
- OTA `preview` **langsung sampai ke HP karyawan** begitu APK dipakai di
  lapangan — uji dulu di `dev` lewat Expo Go, gabung ke `main` hanya atas kata
  pemilik. Update rusak: `eas update:rollback`. (Rencana lama — `production`
  diisi `eas update:republish` dari `preview` — berlaku lagi saat ada akun
  toko.)
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
| `bun run update:preview --message "<isi>"` | OTA jalur `preview` (APK lapangan Android). Hanya dari `main` yang bersih & sudah di-push. |
| `bun run update:expogo --message "<isi>"` | OTA jalur `expogo` (Expo Go tanpa Metro, Android & iOS). Hanya dari `main` yang bersih & sudah di-push. |

Per paket (`cd apps/<nama>`):

| Paket | Perintah |
|---|---|
| `apps/api` | `bun run dev` (server + muat ulang otomatis, port dari `.env`, bawaan 3000); dokumentasi API di `/dokumentasi`, OpenAPI di `/openapi.json`. Server juga menjalankan **sapuan tutup hari** (saat menyala + tiap jam menit ke-5) ke database di `.env` — di pengembangan: Supabase dev; menyunting `server.ts` saat `--watch` menyala memicu sapuan itu. |
| `apps/web` | `bun run dev` (Vite, port 5173) bersama `apps/api` `bun run dev` — web memanggil API di `/api/...` yang diteruskan Vite ke port 3000 (di produksi: Nginx `location /api/ { proxy_pass http://127.0.0.1:3000/; }`), satu asal tanpa CORS. `bun run build` = tipe API + typecheck + berkas statis `dist/`. Sesi bos di `localStorage`. Komponen shadcn/ui disalin tangan ke `src/komponen/ui/` (CLI `shadcn` menggantung di mesin ini); layar di `src/layar/`, dimuat per rute (`lazyRouteComponent`). |
| `apps/mobile` | `bun run start` (Metro mode **Expo Go** — satu-satunya cara membuka aplikasi di Android & iPhone; Expo Go di HP harus versi SDK 58 dari toko; `expo-dev-client` sengaja tidak dipasang supaya `expo start` selalu mode Expo Go); paket ber-kode native dipasang dengan `bunx expo install <paket>` (versi cocok SDK), bukan `bun add`; `bunx expo-doctor` untuk memeriksa. **Tidak pernah `expo web`.** Rute di `src/app/` (Expo Router); panduan resmi Expo ada di `apps/mobile/AGENTS.md`. Alamat API di `apps/mobile/.env`: `EXPO_PUBLIC_API_URL=http://<IP laptop>:3000` (bukan localhost). Pemeriksaan bundel tanpa HP: `bunx expo export --platform android --output-dir <folder sementara>`. **Aplikasi harus tetap bisa dibuka Expo Go** (keputusan 25 Okt 2026): paket ber-kode native hanya yang sudah ada di Expo Go SDK 58, versinya persis `bunx expo install --check`. Tambah `-- --clear` untuk mengosongkan cache. **Jalankan Expo dari path asli** (`...\Desktop\...`, huruf besar-kecil persis seperti di disk): dari `...\desktop\...` Metro memuat setiap modul dua kali dan Expo Go iOS crash (`Tried to register two views with the same name RNCSafeAreaProvider`); `metro.config.js` menolak bundling dari path seperti itu dan menunjukkan `cd` yang benar. Pembungkus di `scripts` sengaja tidak dipakai — `scripts` package.json ikut sidik jari runtime. Babel memakai bawaan Expo (tanpa `babel.config.js`), Metro bawaan + penjaga itu. Galat start iOS di React Native seperti `property is not writable` (`__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__`), `Global was not installed`, atau `Tried to register two views` hampir pasti **bundel ganda** — periksa huruf path dulu (bundel iOS dev ±1829 modul; ±3000 = ganda), jangan menambal React Native. Tambalan Fusebox & catatan JSX-NativeWind lama dibuang 25 Okt 2026 setelah diuji di iPhone dari path asli. Bug `Cannot find native module 'ExpoAsset'` saat muat ulang di tempat milik Expo Go 58.0.5 (expo/expo#52146), sudah diperbaiki di rilis Expo Go berikutnya — perbarui Expo Go dari toko. **Development build tidak dipakai** (keputusan 25 Okt 2026): `expo-dev-client` & profil EAS `development` dibuang; memasangnya lagi membuat `expo start` jatuh ke mode development build. **Preview**: `bun run build:preview` (APK Nael Uji, channel `preview`); OTA-nya dari **root** (`bun run update:preview`), bukan skrip `update:preview` di paket ini. |

Catatan instalasi: `bunfig.toml` memakai `linker = "hoisted"` — instalasi
isolated (bawaan Bun 1.3) membuat salinan ganda `expo`/`react-native` yang
ditolak `expo-doctor`. `react`/`react-dom` di `apps/web` disamakan persis
dengan versi yang dipatok Expo di `apps/mobile`.

Database (`cd apps/api`, membaca `apps/api/.env`):

| Perintah | Isi |
|---|---|
| `bun run db:generate` | Skema Drizzle (`src/platform/db/skema/`) → berkas SQL baru di `src/platform/db/migrasi/`. Periksa SQL-nya sebelum diterapkan. |
| `bunx --bun drizzle-kit generate --custom --name <nama>` | Migrasi SQL kustom kosong — untuk fungsi, trigger, `EXCLUDE`. |
| `bun run db:migrate` | Terapkan migrasi yang belum jalan (dicatat di `drizzle.__drizzle_migrations`). Lewat `scripts/migrasi.ts`, yang menolak berjalan bila host bukan Supabase dev. |

Migrasi yang sudah diterapkan **tidak pernah disunting** — perubahan selalu
lewat migrasi baru. Nama constraint ditulis eksplisit sesuai konvensi #8
(`foreignKey({ name })`, bukan `.references()` yang memberi nama bawaan).

Pemeriksaan sebelum commit: `bun run typecheck && bun run test && bun run lint`.
