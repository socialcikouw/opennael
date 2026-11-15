# Tema aplikasi HP

**Status:** Tahap 1–2 selesai (16 Nov 2026). Tahap 3–4 menunggu arahan desain.

Aplikasi HP (`apps/mobile`) **hanya bertema gelap** — keputusan pemilik, 16 Nov 2026
(menggantikan mode terang & gelap 27 Okt). Tidak ada tombol Terang / Gelap / Ikuti HP, tidak
ada percabangan tema di layar mana pun. Semua yang berkaitan dengan rupa aplikasi — warna,
jarak, sudut, huruf, tinggi sentuh, dan warna di konfigurasi native — berasal dari **satu
tempat**: `apps/mobile/src/tema/`. (Web bos punya tema sendiri di Tailwind; tidak tercakup di sini.)

## Tiga lapis

```
palet.ts   LAPIS 1 · skala mentah (slate, emerald, red, …). SATU-SATUNYA tempat hex/rgba.
   ↓
token.ts   LAPIS 2 · token semantik: WARNA, AKSEN_MODE, RUANG, SUDUT, HURUF, TEBAL, SENTUH, BAYANGAN.
   ↓
native.ts  LAPIS 3 · turunan untuk konfigurasi native → tema-native.json → app.config.ts
```

| Berkas | Isi |
|---|---|
| `palet.ts` | Nilai mentah. Tidak mengimpor apa pun. **Tidak diekspor** lewat `@/tema` — hanya `token.ts` & `native.ts` yang memakainya. |
| `token.ts` | `WARNA` (peran → nilai palet), `AKSEN_MODE` (aksen Harian/Mingguan/Tempoan/Semua), skala `RUANG`/`SUDUT`/`HURUF`/`TEBAL`/`SENTUH`. |
| `native.ts` | Gaya sistem (`dark`), latar jendela, latar splash & ikon adaptif. `jsonNative()` menghasilkan isi `tema-native.json`. |
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
   (`abu`/`abuTua` adalah sisa nama lama; diganti di Tahap 3.)
4. **Tidak ada percabangan tema** (`useGelap`, `TERANG`, `GELAP` sudah dihapus).
5. Teks harus terbaca di bawah matahari: lihat uji kontras di bawah.
6. Kata "mode" di aplikasi berarti mode **kerja** kolektor (Harian · Mingguan · Tempoan ·
   Semua), bukan terang/gelap. Karena itu token aksennya bernama `AKSEN_MODE`.

## Pagar (otomatis)

| Penjaga | Menolak |
|---|---|
| `bun run cek:arsitektur` — `warna-literal` | Nilai warna literal (`"#1e293b"`, `"rgba(…)"`, juga di dalam `boxShadow`) di `apps/mobile/src` di luar `src/tema/`, di `app.config.ts`, atau di `app.json`. |
| `bun run cek:arsitektur` — `palet-mentah` | Impor `…/palet` dari luar `src/tema/`. |
| `src/tema/token.test.ts` | Teks penting (`teks`, `teksTombol`, `teksLabel`, `teksKedua`) < 7:1; `redup`, teks beraksen, dan teks di atas isi berwarna < 4,5:1; `samar` < 3:1; token yang bernama warna. Batasnya sengaja lebih ketat dari standar umum (AA = 4,5:1): kolektor bekerja di luar ruangan. |
| `src/tema/native.test.ts` | `tema-native.json` tidak sinkron dengan token. |

## Cara memakai

- **Komponen**: `const WARNA = useWarna()`; gaya `const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({…})` lalu `const gaya = useGaya(buatGaya)`; gaya bersama `const g = useG()`;
  header Stack `useOpsiStack()` (`komponen/ui/tampilan.tsx`).
- **Layar BARU** boleh mengimpor `WARNA` dari `@/tema` langsung dan memakai `StyleSheet.create`
  di tingkat modul — palet kini satu, jadi tak ada lagi alasan menunda ke hook. Hook lama
  (`useWarna`, `useGaya`, `useWarnaMode`) dipertahankan hanya supaya layar lama tak perlu
  diubah serentak; ia hilang seiring layar didesain ulang (Tahap 4).
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

## Tahapan

| Tahap | Isi | Status |
|---|---|---|
| 1. Fondasi | `src/tema/`, nilai gelap yang sama persis dengan sebelumnya, hapus tema terang & pilihannya, konfigurasi native dari token | ✅ 16 Nov 2026 |
| 2. Pagar | Aturan `cek:arsitektur`, uji kontras, dokumen ini | ✅ 16 Nov 2026 |
| 3. Desain ulang tema | Palet baru, tingkat permukaan (pengganti bayangan), aksen mode, nama peran untuk `abu`/`abuTua`, splash & ikon | menunggu arahan |
| 4. Layar per layar | Desain ulang tiap layar; hook lama diganti `StyleSheet.create` statis | menunggu Tahap 3 |

### Kekurangan yang diketahui (bahan Tahap 3)

- **Teks putih di atas lencana merah**: `teksAtasBahaya` di atas `bahaya` hanya 2,8:1 (slot
  tempoan macet) dan di atas `bahayaBingkai` 3,8:1 (angka di ikon tab). Sudah begitu sebelum
  tema dipusatkan; uji hanya mengunci agar tidak memburuk.
- **Pembatas nyaris tak terlihat**: `garis` di atas `permukaan` hanya 1,22:1.
- **Bayangan** (`BAYANGAN`) dirancang untuk latar terang; di latar gelap nyaris tak terlihat.
- **Warna splash & ikon adaptif** masih warna templat Expo (`palet.ts` → `native`); diganti
  bersama identitas APK.
