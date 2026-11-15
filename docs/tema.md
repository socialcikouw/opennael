# Tema aplikasi HP

**Status:** Tahap 1–4 selesai (16 Nov 2026). Seluruh layar sudah didesain ulang dan memakai token statis; hook tema lama (`useWarna`, `useGaya`, `useWarnaMode`, `useG`, `useOpsiStack`) dan `komponen/ui/tampilan.tsx` sudah dihapus.

Aplikasi HP (`apps/mobile`) **hanya bertema gelap** — keputusan pemilik, 16 Nov 2026
(menggantikan mode terang & gelap 27 Okt). Tidak ada tombol Terang / Gelap / Ikuti HP, tidak
ada percabangan tema di layar mana pun. Semua yang berkaitan dengan rupa aplikasi — warna,
jarak, sudut, huruf, tinggi sentuh, dan warna di konfigurasi native — berasal dari **satu
tempat**: `apps/mobile/src/tema/`. (Web bos punya tema sendiri di Tailwind; tidak tercakup di sini.)

## Tiga lapis

```
palet.ts   LAPIS 1 · skala mentah (slate, emerald, red, …). SATU-SATUNYA tempat hex/rgba.
   ↓
token.ts   LAPIS 2 · token semantik: WARNA, AKSEN_MODE, RUANG, SUDUT, HURUF, TEBAL, SENTUH.
   ↓
native.ts  LAPIS 3 · turunan untuk konfigurasi native → tema-native.json → app.config.ts
```

| Berkas | Isi |
|---|---|
| `palet.ts` | Nilai mentah. Tidak mengimpor apa pun. **Tidak diekspor** lewat `@/tema` — hanya `token.ts` & `native.ts` yang memakainya. |
| `token.ts` | `WARNA` (peran → nilai palet), `AKSEN_MODE` (aksen Harian/Mingguan/Tempoan/Semua), skala `RUANG`/`SUDUT`/`HURUF`/`TEBAL`/`SENTUH`. |
| `native.ts` | Gaya sistem (`dark`), latar jendela, latar splash & ikon adaptif. `jsonNative()` menghasilkan isi `tema-native.json`. |
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
6. Kata "mode" di aplikasi berarti mode **kerja** kolektor (Harian · Mingguan · Tempoan ·
   Semua), bukan terang/gelap. Karena itu token aksennya bernama `AKSEN_MODE`.

## Pagar (otomatis)

| Penjaga | Menolak |
|---|---|
| `bun run cek:arsitektur` — `warna-literal` | Nilai warna literal (`"#1e293b"`, `"rgba(…)"`, juga di dalam nilai gabungan seperti `boxShadow`) di `apps/mobile/src` di luar `src/tema/`, di `app.config.ts`, atau di `app.json`. |
| `bun run cek:arsitektur` — `palet-mentah` | Impor `…/palet` dari luar `src/tema/`. |
| `src/tema/token.test.ts` | Teks penting (`teks`, `teksTombol`, `teksLabel`, `teksKedua`) < 7:1; `redup`, teks beraksen, dan teks di atas isi berwarna < 4,5:1; `samar` < 3:1; `garis` < 1,4:1 atau `garisTegas` < 3:1 di atas latar/permukaan; tangga permukaan (`latar` → `permukaan` → `permukaanTinggi`) tak lagi terlihat; token yang bernama warna. Batasnya sengaja lebih ketat dari standar umum (AA = 4,5:1): kolektor bekerja di luar ruangan. |
| `src/tema/native.test.ts` | `tema-native.json` tidak sinkron dengan token. |

## Cara memakai

- **Komponen & layar**: impor token langsung (`import { WARNA, RUANG, HURUF } from "@/tema"`)
  dan tulis gaya dengan `StyleSheet.create` di tingkat modul — palet kini satu, jadi tak ada
  hook, penyedia, maupun fungsi `buatGaya(WARNA)`. Warna per mode kerja: `AKSEN_MODE[mode]`.
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

## Palet (Tahap 3)

**Arah:** netral murni hampir hitam (skala Tailwind `neutral`, bukan biru-kelabu `slate`) +
aksen hijau merek. Kolektor memakai aplikasi berjam-jam di luar ruangan: latar hitam pekat
memberi kontras terbesar dan hemat baterai OLED, dan nominal tampil putih bersih di atasnya.

**Kedalaman = kecerahan permukaan, bukan bayangan** (bayangan tak terlihat di latar gelap):

| Tingkat | Token | Dipakai untuk |
|---|---|---|
| 0 | `latar` | latar layar |
| 1 | `permukaan` | kartu, isian, tombol kedua |
| 2 | `permukaanTinggi` | yang melayang: tab bar, lembar bawah |
| isi | `isiNetral` → `isiNetralTegas` | kolom di dalam kartu, avatar, lencana netral, kerangka muat → segmen aktif, tombol tertekan |

| Garis | Token | Syarat |
|---|---|---|
| hiasan | `garis` | ≥ 1,4:1 di atas latar & permukaan |
| batas komponen | `garisTegas` | ≥ 3:1 di atas latar & permukaan (isian, tombol kedua, rel) |

Bayangan (`bayangan.ts`, `BAYANGAN`, `boxShadow` di layar) **dihapus**; tepi panel bawah kini
garis atas di semua platform.

## Tahapan

| Tahap | Isi | Status |
|---|---|---|
| 1. Fondasi | `src/tema/`, nilai gelap yang sama persis dengan sebelumnya, hapus tema terang & pilihannya, konfigurasi native dari token | ✅ 16 Nov 2026 |
| 2. Pagar | Aturan `cek:arsitektur`, uji kontras, dokumen ini | ✅ 16 Nov 2026 |
| 3. Palet baru | Netral hampir hitam + hijau merek, `permukaanTinggi`, tanpa bayangan, `abu`→`isiNetral`, `abuTua`→`isiNetralTegas`, garis terlihat, lencana merah terbaca, latar splash = latar | ✅ 16 Nov 2026 |
| 4. Layar per layar | Desain ulang tiap layar; hook lama diganti token statis + `StyleSheet.create` tingkat modul | **Tagihan ✅ · Notifikasi ✅ · Akad ✅ · Bayar ✅ · Gulung ✅ · Detail Nasabah ✅ · Dasbor/Analitik ✅ · Mode Semua (Mutasi, Storting, Droping, Setelan) ✅ · Kasir ✅ · Pengawas ✅ · Pencocokan Kas ✅ · Tunggakan ✅ · Penautan QR ✅ · Pintu masuk ✅ · Tab bar kolektor ✅ · hook lama dihapus ✅ (16 Nov 2026)**; komponen bersama (`komponen/ui`, tab bar, lembar bawah) ✅ token statis |

### Yang masih tersisa

- **Ikon adaptif Android** masih templat Expo (logo biru, latar `#E6F4FE`, `palet.ts` → `native`);
  diganti bersama identitas APK (nama & ikon merek). Latar splash sudah = `latar`.
- **Nama varian `Lencana`** (`hijau`, `kuning`, `merah`, `abu`) masih bernama warna; dapat
  diganti nama peran (mis. `sukses`, `peringatan`, `bahaya`, `netral`) kapan saja — kini tak
  ada lagi layar yang menunggu didesain ulang.
- **Aksen Mingguan**: teks gelap di atas ungu `isi` 4,7:1 — lolos 4,5:1 tetapi tipis.
