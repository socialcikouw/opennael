# Rencana: HP kolektor tiga mode — Kerja · Rekap · Akun

Keputusan pemilik 26 Nov 2026, disetujui lewat simulasi interaktif. Dokumen ini pegangan
kerja selama perombakan; dihapus sesudah semua tahap selesai (ringkasannya tinggal di
`keputusan.md`, `AGENTS.md`, dan `arsitektur/struktur.md`).

## Tujuan

| Mode | Tombol kiri | Tab | Tombol kanan |
|---|---|---|---|
| **Kerja** | (K) Ganti Mode | **Harian · Mingguan · Tempoan** | (+) Akad baru berjenis tab itu |
| **Rekap** | (R) Ganti Mode | **Ringkasan · Performa · Portofolio** | Foto Nasabah (galeri per kampung) |
| **Akun** | (A) Ganti Mode | **Profil · Pengaturan · Bantuan** | — |

- Lembar **Ganti Mode** hanya berisi tiga pilihan: Mode Kerja, Mode Rekap, Mode Akun.
  Memilih mode memutar layar transisi "Beralih ke Mode …".
- Mode Kerja: **lonceng Notifikasi** di kanan atas (angka merah), **spanduk "Absen pagi
  dulu"** di atas daftar selama belum absen; angka merah di tiap tab = sisa nasabah wajib
  ditagih hari ini.
- Mode Rekap: **Ringkasan** = segmen Mutasi Kas (+ Buka Laporan) · Storting · Droping;
  **Performa** = rasio bayar + performa tagihan, saring Semua/Harian/Mingguan/Tempoan;
  **Portofolio** = berjalan, macet, diputihkan, piutang aktif + rincian per jenis;
  **Foto Nasabah** = foto serah terima dikelompokkan per kampung, karosel geser.
- Mode Akun: **Profil** (kolektor & pegangannya), **Pengaturan** (Getar, Perangkat Ini,
  Tentang, Keluar), **Bantuan** (panduan singkat).

## Aturan penamaan (permintaan pemilik)

**Nama yang tampil = nama rute = nama berkas.** Mencari kata yang terlihat di layar harus
langsung menemukan berkasnya.

| Tampil di HP | Rute (`app/kolektor/…`) | Layar | Fitur |
|---|---|---|---|
| Mode Kerja | grup `(kerja)/` | — | `fitur/mode` |
| Tab Harian / Mingguan / Tempoan | `(kerja)/harian.tsx`, `mingguan.tsx`, `tempoan.tsx` | `LayarTagihan jenis=…` (judul "Tagihan Harian" …) | `fitur/tagihan` |
| Mode Rekap | grup `(rekap)/` | — | `fitur/mode` |
| Tab Ringkasan | `(rekap)/ringkasan.tsx` | `LayarRingkasan` | `fitur/ringkasan` (dulu `pantau`) |
| Tab Performa | `(rekap)/performa.tsx` | `LayarPerforma` | `fitur/performa` (dulu bagian `dasbor`) |
| Tab Portofolio | `(rekap)/portofolio.tsx` | `LayarPortofolio` | `fitur/portofolio` (dulu bagian `dasbor`) |
| Foto Nasabah | `foto-nasabah.tsx` | `LayarFotoNasabah` | `fitur/foto-nasabah` |
| Mode Akun | grup `(akun)/` | — | `fitur/mode` |
| Tab Profil / Pengaturan / Bantuan | `(akun)/profil.tsx`, `pengaturan.tsx`, `bantuan.tsx` | `LayarProfil`, `LayarPengaturan`, `LayarBantuan` | `fitur/akun` |
| Notifikasi (lonceng) | `notifikasi.tsx` | `LayarNotifikasi` | `fitur/notifikasi` |
| Ganti Mode, layar transisi | — | `LembarMode`, `TiraiMode` | `fitur/mode` |

Nama yang tak lagi tampil **dihapus dari kode**: grup `(tab)`, rute `index` (Dasbor),
`analitik`, `mutasi`, `storting`, `droping`, `setelan`, `tagihan`; folder `fitur/dasbor`,
`fitur/pantau`; mode `harian/mingguan/tempoan/laporan` sebagai mode; token `AKSEN_MODE`
(semua jenis kini satu warna → `AKSEN`). Kata "mode" hanya untuk Kerja · Rekap · Akun;
"jenis" untuk harian · mingguan · tempoan.

## Arsitektur

- **Mode diturunkan dari rute**, bukan disimpan: grup rute aktif (`(kerja)`, `(rekap)`,
  `(akun)`) = mode. Tak ada lagi penyimpan `modeAktif` yang bisa tak sinkron dengan layar.
- Tiap grup punya `_layout.tsx` sendiri (navigator Tabs) yang merangkai **satu**
  `TabMengambang` bersama: tombol kiri (huruf mode), tab grup itu, tombol kanan opsional.
- **Pindah mode** = `beralihMode(mode)`: `TiraiMode` (dipasang sekali di
  `app/kolektor/_layout.tsx`, di atas semua grup) menutup layar, lalu
  `router.replace(<tab pertama mode itu>)` di balik tirai, lalu tirai terbuka. Pindah tab
  ke mode lain (mis. "Buka Tab Mingguan" dari Rekap) lewat jalan yang sama.
- Notifikasi & Foto Nasabah = layar Stack di atas tab (punya tombol kembali).
- Server (API), kasir, pengawas, dan web **tidak berubah**.

## Tahapan (satu tahap = commit yang lolos gerbang)

Gerbang tiap tahap: `bun run typecheck && bun run lint && bun run cek:arsitektur`, uji HP
(`bun test` di `apps/mobile`), `expo export` Android. Uji API hanya bila API tersentuh
(tidak direncanakan).

1. **Rencana & keputusan** — dokumen ini, `keputusan.md`.
2. **Token aksen** — `AKSEN_MODE` → `AKSEN` (satu terakota), tipe `WarnaMode` → `WarnaAksen`.
   Tanpa perubahan tampilan.
3. **Kerangka mode & rute** — `fitur/mode` (mode dari rute, `beralihMode`, `LembarMode`
   tiga pilihan, `TiraiMode`, `HurufMode`); grup `(kerja)`/`(rekap)`/`(akun)` + `_layout`
   masing-masing; `TabMengambang` dengan tombol kanan generik; tab kerja → `LayarTagihan`
   berjenis. Tab Rekap & Akun sementara memakai layar lama (Mutasi, Dasbor, Setelan).
   Grup `(tab)` dihapus.
4. **Notifikasi & absen** — `notifikasi.tsx` jadi layar Stack; lonceng berangka di kepala
   Tagihan; spanduk "Absen pagi dulu" dengan tombol; tombol pengingat "Buka Tab …".
5. **Ringkasan** — `fitur/pantau` → `fitur/ringkasan`; satu layar bersegmen Mutasi Kas ·
   Storting · Droping.
6. **Performa & Portofolio** — `fitur/dasbor` dipecah ke `fitur/performa` (saring jenis) dan
   `fitur/portofolio` (semua + per jenis); `fitur/dasbor` dihapus.
7. **Foto Nasabah** — `fitur/foto-nasabah`: karosel per kampung dari daftar tagih, layar
   penuh; tombol kanan Mode Rekap.
8. **Akun** — Profil, Pengaturan (Getar tersimpan di HP, Perangkat Ini, Tentang, Keluar),
   Bantuan; `layar-setelan` dihapus.
9. **Dokumen & sapu bersih** — `AGENTS.md`, `arsitektur/struktur.md`, `tema.md`,
   pencarian nama lama yang tersisa, hapus dokumen ini.
