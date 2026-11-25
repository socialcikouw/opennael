# Tema aplikasi HP

**Status:** Tahap 1–5 selesai (24 Nov 2026). Seluruh layar memakai token statis; sejak Tahap 5 aplikasi **terang** (putih kertas + terakota).

Aplikasi HP (`apps/mobile`) **hanya bertema terang: dasar putih kertas, warna utama
terakota** — keputusan pemilik, 24 Nov 2026, dipilih lewat halaman pratinjau (menggantikan
"hanya gelap" 16 Nov, yang menggantikan mode terang & gelap 27 Okt). Tidak ada tombol Terang /
Gelap / Ikuti HP, tidak ada percabangan tema di layar mana pun. Semua yang berkaitan dengan rupa aplikasi — warna,
jarak, sudut, huruf, tinggi sentuh, dan warna di konfigurasi native — berasal dari **satu
tempat**: `apps/mobile/src/tema/`. Web bos memakai palet yang sama lewat Tailwind — lihat
bagian [Web bos](#web-bos) di bawah.

## Tiga lapis

```
palet.ts   LAPIS 1 · skala mentah (kertas, terakota, emerald, red, amber). SATU-SATUNYA tempat hex/rgba.
   ↓
token.ts   LAPIS 2 · token semantik: WARNA, AKSEN, RUANG, SUDUT, HURUF, TEBAL, SENTUH.
   ↓
native.ts  LAPIS 3 · turunan untuk konfigurasi native → tema-native.json → app.config.ts
```

| Berkas | Isi |
|---|---|
| `palet.ts` | Nilai mentah. Tidak mengimpor apa pun. **Tidak diekspor** lewat `@/tema` — hanya `token.ts` & `native.ts` yang memakainya. |
| `token.ts` | `WARNA` (peran → nilai palet), `AKSEN` (aksen terakota, satu untuk semua jenis & mode; tipe `WarnaAksen`), skala `RUANG`/`SUDUT`/`HURUF`/`TEBAL`/`SENTUH`. |
| `native.ts` | Gaya sistem (`light`), latar jendela, latar splash & ikon adaptif. `jsonNative()` menghasilkan isi `tema-native.json`. |
| `navigasi.ts` | `OPSI_STACK` (header Stack baku kolektor/kasir/pengawas) dan `OPSI_TAB` (header + latar adegan tab kolektor), dirangkai dari token — satu-satunya tempat gaya header ditentukan. |
| `kontras.ts` | Hitung rasio kontras WCAG (murni) untuk uji. |
| `index.ts` | Pintu: `import { WARNA, RUANG, … } from "@/tema"`. |
| `../scripts/tulis-tema-native.ts` | Skrip (di luar `src/`): hasilkan `apps/mobile/tema-native.json`. |
| `token.test.ts`, `native.test.ts` | Uji kontras, kelengkapan token, dan sinkron JSON native. |

**Kenapa JSON turunan untuk native?** `app.config.ts` dimuat Expo dengan Node biasa, yang tak
bisa mengimpor berkas `.ts`. Jadi jalurnya `token → native.ts → tema-native.json →
app.config.ts`. Bila JSON tertinggal, `bun run test` gagal dan menunjuk perintah
perbaikannya: `bun apps/mobile/scripts/tulis-tema-native.ts`.

## Aturan

1. **Hex / rgba hanya di `palet.ts`.** Layar, komponen, dan `app.json` tidak menulis warna.
2. **Layar mengimpor token (`@/tema`), tidak pernah palet mentah.**
3. **Nama token = peran**, bukan warna: `permukaan`, `teksKedua`, `diAtasFoto` — bukan `putih`.
   (`abu`/`abuTua` sudah diganti `isiNetral`/`isiNetralTegas` di Tahap 3.)
4. **Tidak ada percabangan tema** (`useGelap`, `TERANG`, `GELAP` sudah dihapus).
5. Teks harus terbaca di bawah matahari: lihat uji kontras di bawah.
6. **Arti warna terpisah dari merek**: `utama*` (terakota) = merek & aksi; `sukses*` (hijau) =
   berhasil / boleh (Bisa Digulung, lencana Baru & Gulung Naik, lebih setor, foto siap);
   `bahaya*` (merah) = galat, libur, belum boleh; `waspada*` (amber tua) = peringatan.
   Jangan memakai `utama` untuk arti "berhasil".
7. Kata "mode" di aplikasi berarti mode kolektor (Kerja · Rekap · Akun), bukan terang/gelap;
   harian · mingguan · tempoan disebut **jenis** pinjaman.

## Pagar (otomatis)

| Penjaga | Menolak |
|---|---|
| `bun run cek:arsitektur` — `warna-literal` | Nilai warna literal (`"#1e293b"`, `"rgba(…)"`, juga di dalam nilai gabungan seperti `boxShadow`) di `apps/mobile/src` di luar `src/tema/`, di `app.config.ts`, atau di `app.json`. |
| `bun run cek:arsitektur` — `palet-mentah` | Impor `…/palet` dari luar `src/tema/`. |
| `src/tema/token.test.ts` | Teks penting (`teks`, `teksTombol`, `teksLabel`, `teksKedua`) < 7:1; `redup`, teks beraksen, dan teks di atas isi berwarna < 4,5:1; `samar` < 3:1; `garis` < 1,4:1 di atas kartu (1,3:1 di atas latar kertas) atau `garisTegas` < 3:1; kartu tak lagi lebih terang dari latar, yang melayang tak dipisah garis, atau segmen aktif tak terlihat; mode yang tak lagi memakai terakota; token yang bernama warna. Batasnya sengaja lebih ketat dari standar umum (AA = 4,5:1): kolektor bekerja di luar ruangan. |
| `src/tema/native.test.ts` | `tema-native.json` tidak sinkron dengan token. |

## Cara memakai

- **Komponen & layar**: impor token langsung (`import { WARNA, RUANG, HURUF } from "@/tema"`)
  dan tulis gaya dengan `StyleSheet.create` di tingkat modul — palet kini satu, jadi tak ada
  hook, penyedia, maupun fungsi `buatGaya(WARNA)`. Warna aksen: `AKSEN` (diteruskan ke komponen sebagai prop `aksen`).
- **Gaya bersama**: `import { g } from "@/komponen/ui/gaya-bersama"` (kartu, judul bagian,
  baris, segmen, chip, …); komponen bersama di `komponen/ui/` (`Bagian`, `KotakKosong`, …).
- **Header navigasi**: `screenOptions={OPSI_STACK}` (Stack) dan `screenOptions={OPSI_TAB}` (tab
  kolektor), keduanya dari `@/tema` — tata letak tak menulis warna sendiri.
- Hook lama (`useWarna`, `useGaya`, `useWarnaMode`, `useG`, `useOpsiStack`) sudah **dihapus**;
  jangan dibuat lagi.
- **Mengubah rupa seluruh aplikasi**: ubah rujukan di `token.ts` (atau nilai di `palet.ts`),
  jalankan `bun run test`; bila menyangkut `latar`, splash, atau ikon, jalankan juga
  `bun apps/mobile/scripts/tulis-tema-native.ts`.
- **Menambah token**: tambahkan di `token.ts` dengan nama peran, rujuk palet, lalu tambahkan
  pasangan kontrasnya di `token.test.ts` bila ia teks atau latar.

## Sidik jari runtime

`userInterfaceStyle`, latar jendela, dan warna splash/ikon adaptif ada di konfigurasi
native, jadi mengubahnya mengganti sidik jari runtime: pembaruan OTA tidak masuk ke APK
`preview` yang sudah terpasang — APK wajib dibangun ulang (sudah tertunda sejak keputusan
14 Nov, jadi satu build untuk semuanya). Expo Go tidak terpengaruh.

## Palet (Tahap 5 — putih kertas + terakota)

**Arah** (pilihan pemilik 24 Nov 2026 setelah membandingkan gelap, slate, merah, biru, hitam,
dan oranye di halaman pratinjau): **terang** karena kolektor bekerja di bawah matahari —
teks gelap di atas latar terang paling terbaca, tak memantulkan sekitar seperti layar gelap,
dan HP lapangan banyak yang LCD (tema gelap tak menghemat baterai di sana). **Putih kertas**
(netral hangat, mirip buku kas) bukan putih kebiruan; **terakota** (seperti oranye Claude)
sebagai warna merek. **Semua mode kerja memakai terakota** — mode dikenali dari huruf
H/M/T/L dan label mode.

| Peran | Token | Nilai |
|---|---|---|
| Latar layar, isi netral | `latar`, `isiNetral` | kertas `#f4f2ec` |
| Kartu, isian, lembar bawah | `permukaan`, `permukaanTinggi` | putih hangat `#fffefb` |
| Tab bar mengambang | `latarTab` (pil), `ikonTab` (tab tak aktif), kapsul aktif `utamaIsi` | hitam hangat `#1c1917`, abu `#a8a29e`, coral |
| Segmen aktif, garis | `isiNetralTegas`, `garis` | krem `#d9d5cc` |
| Batas isian, rel, placeholder | `garisTegas`, `samar` | stone-500 `#78716c` |
| Teks | `teks` → `teksLabel` → `teksKedua` → `redup` | stone-900 → 800 → 700 → 600 |
| Isi tombol utama, +, lingkaran angsuran | `utamaIsi` + `teksAtasUtama` | coral `#d97757` + tulisan **gelap** (5,6:1) |
| Teks & ikon terakota, tab aktif | `utama`, `utamaTua` | `#a8461f`, `#8f3d1d` |
| Berhasil / boleh | `sukses*` | emerald-700 … 50 |
| Galat, libur, belum boleh | `bahaya*` | red-700 (teks), red-600 (isi) |
| Peringatan | `waspada*` | amber-800 |

**Kenapa tulisan gelap di tombol coral:** coral terlalu terang untuk tulisan putih (3,1:1)
maupun untuk teks di atas kertas (2,8:1). Coral hanya dipakai sebagai **isi**; teks & ikon
terakota memakai `#a8461f`.

**Kedalaman tanpa bayangan:** latar kertas → kartu putih hangat (lebih terang); yang melayang
(lembar bawah) sama putihnya dengan kartu dan dipisah **garis**. Tab bar mengambang sengaja
**hitam hangat** (24 Nov 2026, arahan pemilik) dengan kapsul coral meluncur di tab aktif —
kontras penuh dengan halaman kertas, jadi tak butuh garis maupun bayangan.

| Garis | Token | Syarat |
|---|---|---|
| hiasan | `garis` | ≥ 1,4:1 di atas kartu, ≥ 1,3:1 di atas latar kertas |
| batas komponen | `garisTegas` | ≥ 3:1 di atas latar & permukaan (isian, tombol kedua, rel) |

**Native:** gaya sistem `light` (status bar berikon gelap, keyboard & dialog terang). Latar
splash = `utamaIsi` (coral), bukan `latar`, karena logo splash templat berwarna putih —
dikembalikan ke `latar` saat logo merek ada. Layar kamera & foto layar penuh tetap hitam
dengan status bar terang.

### Palet sebelumnya (Tahap 3, 16–24 Nov 2026)

Netral murni hampir hitam (`neutral`) + aksen hijau merek, tiap mode berwarna sendiri (ungu,
oranye, teal); kedalaman = makin tinggi makin terang. Diganti Tahap 5.

## Tahapan

| Tahap | Isi | Status |
|---|---|---|
| 1. Fondasi | `src/tema/`, nilai gelap yang sama persis dengan sebelumnya, hapus tema terang & pilihannya, konfigurasi native dari token | ✅ 16 Nov 2026 |
| 2. Pagar | Aturan `cek:arsitektur`, uji kontras, dokumen ini | ✅ 16 Nov 2026 |
| 3. Palet baru | Netral hampir hitam + hijau merek, `permukaanTinggi`, tanpa bayangan, `abu`→`isiNetral`, `abuTua`→`isiNetralTegas`, garis terlihat, lencana merah terbaca, latar splash = latar | ✅ 16 Nov 2026 |
| 4. Layar per layar | Desain ulang tiap layar; hook lama diganti token statis + `StyleSheet.create` tingkat modul | **Tagihan ✅ · Notifikasi ✅ · Akad ✅ · Bayar ✅ · Gulung ✅ · Detail Nasabah ✅ · Dasbor/Analitik ✅ · Mode Semua (Mutasi, Storting, Droping, Setelan) ✅ · Kasir ✅ · Pengawas ✅ · Pencocokan Kas ✅ · Tunggakan ✅ · Penautan QR ✅ · Pintu masuk ✅ · Tab bar kolektor ✅ · hook lama dihapus ✅ (16 Nov 2026)**; komponen bersama (`komponen/ui`, tab bar, lembar bawah) ✅ token statis |
| 5. Tema terang | Putih kertas + terakota (pilihan pemilik lewat pratinjau), semua mode terakota, token baru `sukses*` & `tiraiSibuk`, arti "berhasil" dipindah dari `utama` ke `sukses` (±15 tempat), status bar & keyboard terang, uji kedalaman ditulis ulang | ✅ 24 Nov 2026 |

### Yang masih tersisa

- **Ikon adaptif & logo splash** masih templat Expo (logo putih, latar ikon `#E6F4FE`); diganti
  bersama identitas APK (nama & ikon merek). Sesudahnya latar splash kembali = `latar`.
- **Alas segmen** (`isiNetral`) sama dengan latar kertas: di kepala Tagihan, alas segmen tak
  terlihat, hanya keping aktif yang tampak (sesuai pratinjau yang disetujui). Bisa dipertegas
  bila pemilik menginginkannya.
- **Nama varian `Lencana`** (`hijau`, `kuning`, `merah`, `abu`) masih bernama warna; dapat
  diganti nama peran (`sukses`, `peringatan`, `bahaya`, `netral`) kapan saja.

## Web bos

Web bos (`apps/web`) ikut **putih kertas + terakota** (keputusan pemilik 24 Nov 2026) dan,
berbeda dengan HP, **punya dua mode**: Terang dan Gelap ("kertas malam" — cokelat-hitam
hangat dengan aksen coral yang sama). Bos bekerja di depan layar, sering malam hari, jadi
mode gelap dipertahankan sebagai pilihan.

| Bagian | Tempat |
|---|---|
| Nilai warna kedua mode | `apps/web/src/index.css` — `:root` (terang) & `.dark` (gelap), satu-satunya tempat nilai warna web |
| Pilihan tema | Tombol di menu (samping & bilah atas): **Ikuti Perangkat** (bawaan) → **Terang** → **Gelap**; tersimpan di `localStorage` (`nael.tema`) per peramban |
| Logika | `apps/web/src/lib/tema.ts` (+ `tema.test.ts`); skrip kecil di `index.html` memasang `.dark` sebelum halaman tergambar (tanpa kilatan putih) |

Token web memakai nama shadcn (`background`, `card`, `primary`, `muted-foreground`, …)
ditambah token arti seperti HP: `utama` (teks terakota), `sukses*`, `bahaya*`, `waspada*`
(`text-sukses`, `bg-bahaya-lembut`, …). **Layar tidak memakai kelas warna Tailwind langsung**
(`text-red-700`, `bg-emerald-100`) karena tak ikut berganti mode. `primary` = isi coral
bertulisan gelap (seperti HP); menu aktif & tautan memakai `text-utama`.

