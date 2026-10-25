# Aturan usaha

**Status: FINAL** — diperiksa pemilik 23 Okt 2026. Disusun dari kode
repo lama (`naelcapitalAPI`: `shared/money/akad.ts`,
`shared/jadwal/jadwal-tagih.ts`, `modules/pinjaman/domain/evaluasi-macet.ts`,
`modules/transaksi/domain/hitung-*.ts`, `modules/ringkasan/domain/hitung-kas.ts`)
dan rancangan di [`skema/`](skema/README.md). Keputusan pemilik atas butir
yang semula ditanyakan ditandai **Keputusan**.

Setiap aturan bernomor (mis. **A3**) dengan contoh angka. `packages/domain`
menerapkan aturan ini, dan ujinya memakai **contoh yang sama persis** —
mengubah aturan berarti mengubah dokumen ini lebih dulu.

Istilah: lihat [`produk.md`](produk.md#istilah). Semua uang dalam rupiah bulat.

---

## A. Akad pinjaman

**A1. Pokok** kelipatan Rp 100.000. (Itulah yang membuat 5%, 120%, 125%, dan
pembagian per tenor selalu bulat.)

**A2. Tenor** per jenis:

| Jenis | Tenor |
|---|---|
| Harian | 24 kali |
| Mingguan | 6, 8, atau 10 kali |
| Tempoan | 7, 10, atau 14 hari (sekali bayar) |

**A3. Harian & mingguan:** potongan admin 5% pokok + potongan tabungan 5% pokok;
total kembali 120% pokok; angsuran = total kembali ÷ tenor.

**A4. Tempoan:** tanpa potongan; total kembali 125% pokok; angsuran = total
kembali (sekali bayar); jatuh tempo = tanggal akad + tenor hari.

**A5. Pencairan** (tunai ke nasabah) = pokok − admin − tabungan − saldo pinjaman
lama (hanya gulung).

| Contoh | Pokok | Admin | Tabungan | Pencairan | Total kembali | Angsuran |
|---|---|---|---|---|---|---|
| Harian, 24× | 1.000.000 | 50.000 | 50.000 | 900.000 | 1.200.000 | 50.000 |
| Mingguan, 8× | 1.000.000 | 50.000 | 50.000 | 900.000 | 1.200.000 | 150.000 |
| Mingguan, 10× | 100.000 | 5.000 | 5.000 | 90.000 | 120.000 | 12.000 |
| Tempoan, 14 hari | 1.000.000 | 0 | 0 | 1.000.000 | 1.250.000 | 1.250.000 |

**A6. Syarat akad dibekukan** di pinjaman pada hari akad: mengubah rumus hanya
berlaku untuk akad berikutnya.

**A7. Foto serah terima wajib** untuk akad yang mengeluarkan uang (baru, pinjam
lagi, gulung): jenis serah terima, diunggah kolektor itu sendiri, berumur
kurang dari 1 jam, belum dipakai akad lain. Salinan migrasi bebas foto.

**A8. Akad baru ditolak** bila: rem "pinjaman baru dikunci" menyala (kantor atau
kolektor); nasabah diblokir; NIK sudah terdaftar; atau nama + kampung sama
dengan nasabah yang diblokir (kecuali keduanya ber-NIK dan berbeda).

**A9. Satu nasabah, satu pinjaman aktif** (berjalan atau macet) pada satu waktu.

**A10. Salinan migrasi** — bos menyalin pinjaman yang masih berjalan dari
pembukuan lama (buku), untuk nasabah lama atau orang baru:

- total kembali & angsuran dihitung dengan A1–A4 dari jenis, pokok, tenor —
  sama dengan akad baru;
- **tanpa uang keluar**: potongan admin, pencairan, dan droping 0; tidak
  memerlukan foto (A7) dan tidak tertahan rem pinjaman baru (A8);
- **saldo awal = sisa saldo di buku**, lebih dari 0 dan paling banyak total
  kembali; angsuran ke = (total kembali − saldo) ÷ angsuran, dibulatkan ke bawah;
- **tabungan pembuka** = tabungan nasabah di buku: masuk saldo tabungan
  nasabah, bukan kas kantor;
- tanggal akad = tanggal akad di buku (paling lambat hari ini); mulai ditagih
  sejak hari disalin (B1);
- yang di buku sudah macet boleh langsung disalin sebagai macet (tanggal macet
  = hari disalin), supaya piutang macet langsung terbaca; selanjutnya F4
  berlaku seperti biasa;
- salah ketik dibatalkan bos **di hari disalin**, selama belum ada catatan
  (setoran, libur) — tabungan pembukanya ikut ditarik.

> Contoh: harian 24×, pokok 1.000.000, di buku sudah 10 angsuran → sisa saldo
> 700.000; tabungan di buku 50.000. Salinan: total kembali 1.200.000,
> angsuran 50.000, angsuran ke 10, saldo awal 700.000, pencairan 0, droping 0,
> tabungan nasabah +50.000.

---

## B. Jadwal tagih

**B1. Mulai ditagih:** sehari sesudah akad; pinjaman migrasi sejak hari disalin.

**B2. Harian:** setiap **hari kerja** — termasuk pekan kerja kantor yang berlaku
hari itu (bawaan Senin–Sabtu) dan bukan libur kantor.

**B3. Mingguan:** pada hari akad + 7, 14, 21, … hari. **Libur nasabah menggeser**
jadwal: minggu yang diliburkan tidak dihitung.

**B4. Tempoan:** tidak berkala; dibayar sekali paling lambat jatuh tempo.

**B5. Tertinggal & tunggakan** (yang tampil di kartu kolektor), dihitung menurut
**jumlah angsuran yang sudah terbayar**, bukan tanggal tiap setoran; hari ini
belum dihitung lewat:

- harian: jadwal = hari tagih sejak mulai ditagih s/d kemarin − hari kerja yang
  diliburkan nasabah (+ angsuran yang sudah terbayar sebelum disalin, untuk
  migrasi), paling banyak tenor; tertinggal = jadwal − angsuran terbayar;
- mingguan: minggu yang jadwalnya sudah lewat, dikurangi yang terbayar;
- tempoan: lewat jatuh tempo = seluruh saldo tertunggak;
- tunggakan = tertinggal × angsuran, paling banyak sisa saldo.

> Contoh harian: akad Senin 1, pekan Senin–Sabtu, angsuran 50.000. Pada Senin 8
> (hari ini), hari tagih s/d kemarin = Selasa 2 – Sabtu 6 = 5 hari, tanpa
> libur. Sudah terbayar 3 angsuran → tertinggal 2, tunggakan 100.000.

---

## C. Setoran angsuran

**C1. Nominal** (setoran murni dan setoran pelunasan masing-masing; nol boleh,
asal totalnya bukan nol):

| Jenis | Minimal | Kelipatan |
|---|---|---|
| Harian | 5.000 | 5.000 |
| Mingguan | 5.000 | 1.000 |
| Tempoan | tidak bisa dicicil — hanya lunas | — |

**C2. Setoran yang menghabiskan saldo wajib lewat "lunas"** (supaya tabungan
dikembalikan dan pinjaman ditutup). Saldo pinjaman yang masih ditagih tidak
pernah nol.

**C3. Satu peristiwa per pinjaman per hari:** setoran, lunas, gulung, atau libur.

**C4. Gerbang lapangan** (setoran, lunas, gulung, akad, libur): jam kerja kantor,
hari kerja, bukan libur kantor, kolektor sudah absen masuk kerja, dan laporan
hari itu belum dibuka.

> **Hanya di pengembangan**, tiga pemeriksaan kalender pertama — jam kerja,
> hari kerja, libur kantor — boleh dimatikan satu per satu lewat `.env` API
> (`VALIDASI_JAM_KERJA`, `VALIDASI_HARI_KERJA`, `VALIDASI_LIBUR_KANTOR` =
> `false`) supaya aplikasi bisa diuji kapan saja. Bawaannya `true`; server
> menolak menyala bila ada yang `false` sementara database bukan Supabase
> pengembangan. Berlaku untuk gerbang ini (termasuk absen pagi) saja — hari
> tagih (B2), macet, dan sapuan tengah malam tetap memakai kalender
> sungguhan. Wajib absen, laporan, dan rem bos tidak pernah dimatikan.

**C5. Patokan setoran adalah saldo**, bukan saldo dikurangi tabungan: tabungan
baru diperhitungkan saat lunas.

---

## D. Pelunasan

**D1.** Tabungan nasabah menutup saldo **lebih dulu** (paling banyak sebesar
saldo); sisanya dibayar nasabah; **seluruh tabungan keluar**.

| Contoh | Saldo | Tabungan | Dibayar nasabah (murni) | Ditutup tabungan (pelunasan) | Tabungan keluar | Storting |
|---|---|---|---|---|---|---|
| Tabungan kurang | 300.000 | 100.000 | 200.000 | 100.000 | 100.000 | 200.000 |
| Tabungan lebih | 300.000 | 500.000 | 0 | 300.000 | 500.000 | **−200.000** |

**D2. Tabungan melebihi saldo → kolektor mengembalikan selisihnya tunai** di
lapangan (contoh kedua: nasabah menerima 200.000). Storting baris itu negatif
(−200.000), sehingga **tunai yang diserahkan ke kasir sore hari otomatis
berkurang** sebesar itu (I1) — tidak ada catatan terpisah. *Keputusan pemilik,
23 Okt 2026.*

---

## E. Gulung

**E1.** Pinjaman penerus **selalu berjenis sama** dengan pinjaman asal.

**E2.** Pinjaman asal harus masih ditagih (berjalan atau macet).

**E3. Rem bos** diperiksa lebih dulu: "gulung dikunci" menolak semua gulung;
"naik dikunci" menolak gulung yang menaikkan pokok — per kantor, kolektor, atau
nasabah.

**E4. Tambahan untuk harian:**

- yang **macet tidak bisa** digulung;
- **pinjaman pertama tidak boleh naik**;
- pinjaman ke-1 s/d ke-3 baru bisa digulung **mulai angsuran ke-12**; ke-4 dan
  seterusnya **mulai angsuran ke-10** (angka yang sama dengan nomor angsuran di
  kartu).

**E5.** Mingguan & tempoan boleh digulung kapan saja, termasuk saat macet dan
naik pada pinjaman pertama. (Tempoan praktis selalu naik: pencairan bersih
baru positif bila pokok penerus lebih dari 1,25× pokok asal.)

**E6. Pencairan bersih** = pencairan akad penerus − saldo pinjaman asal, **harus
lebih dari nol**.

**E7. Droping gulung:**

| Jenis gulung | Drop baru | Drop gulung | Pokok berkurang |
|---|---|---|---|
| Naik | pokok baru − pokok lama | pokok lama | 0 |
| Tetap | 0 | pokok lama | 0 |
| Turun | 0 | pokok baru | pokok lama − pokok baru |

> Contoh: harian pinjaman ke-4, pokok 1.000.000 (angsuran 50.000), sudah 12
> angsuran terbayar → saldo 1.200.000 − 600.000 = 600.000; digulung ke pokok
> 1.500.000. Penerus: admin 75.000, tabungan 75.000, pencairan akad 1.350.000;
> pencairan bersih 1.350.000 − 600.000 = **750.000**. Gulung naik: drop baru
> 500.000, drop gulung 1.000.000.

**E8.** Gulung butuh foto serah terima (A7). Saldo lama tercatat sebagai
transaksi gulung (setoran pelunasan), lalu pinjaman asal berstatus digulung.

---

## F. Macet

Dinilai otomatis setiap tutup hari, untuk hari yang baru ditutup. Jendela =
30 hari kalender terakhir, termasuk hari itu.

**F1. Harian:** macet bila **setoran murni dalam jendela < 5 × angsuran**. Baru
dinilai bila jendela memuat **paling sedikit 15 hari tagih**.

**F2. Mingguan:** macet bila **setoran murni dalam jendela < 1 × angsuran**. Baru
dinilai bila pinjaman sudah masuk pembukuan paling sedikit satu jendela penuh.

**F3. Tempoan:** macet bila **sudah lewat 7 hari dari jatuh tempo** dan belum lunas.

**F4. Dua arah** untuk harian & mingguan: pinjaman macet yang setorannya kembali
mencapai ambang menjadi berjalan lagi. Tempoan hanya keluar dari macet lewat
lunas atau gulung.

**F5. Libur tidak memaafkan macet** — macet murni mengukur uang masuk.

> Contoh harian: angsuran 50.000 → ambang 250.000. Setoran murni 30 hari
> terakhir 200.000 → macet; esoknya nasabah membayar 100.000 sehingga jendela
> berisi 300.000 (setoran lama belum keluar jendela) → pulih.

**F6. Penunggak sebagian yang rutin tidak pernah macet** selama setorannya
mencapai ambang (mis. harian cukup 5 angsuran per 30 hari). *Keputusan pemilik,
23 Okt 2026: dibiarkan dulu* — cara menandai yang lebih canggih (mis. menilai
tunggakan, bukan hanya setoran) diusulkan dan dikerjakan terpisah kelak.

---

## G. Libur nasabah

**G1.** Pinjaman tempoan tidak punya libur.

**G2.** Mingguan hanya bisa diliburkan **pada hari tagihnya**.

**G3. Pinjaman yang angsuran terbayarnya baru 0 atau 1 belum boleh libur.**
Dijaga **server** (`LIBUR_BELUM_BOLEH`), bukan hanya aplikasi kolektor seperti
di aturan lama. *Keputusan pemilik, 23 Okt 2026.*

**G4.** Libur yang salah dihapus bos **pada hari yang sama**; jejaknya tersimpan.

---

## H. Tabungan nasabah

**H1. Rumus saldo tabungan:**

```
tabungan = Σ tabungan masuk (potongan akad & tabungan pembuka migrasi)
         − Σ tabungan keluar (pelunasan)
         − Σ penarikan tabungan (diserahkan bos, dari kas kantor)
         + Σ koreksi tabungan (pembetulan angka oleh bos)
```

**H2.** Tabungan menumpuk **lintas pinjaman** dan boleh melebihi saldo pinjaman
berjalan.

**H3. Penarikan tabungan** di luar pelunasan hanya oleh bos, uangnya dari **kas
kantor** (bukan dari setoran kolektor), dan paling banyak sebesar tabungan.

**H4. Koreksi tabungan** hanya membetulkan angka (tanpa uang berpindah); saldo
tak boleh menjadi minus; salah koreksi dibetulkan dengan koreksi tandingan.

**H5. Batas wajar:** tabungan paling banyak **5 × pokok** — pagar salah ketik.

---

## I. Kas harian kolektor

**I1. Tunai seharusnya** diserahkan kolektor sore hari:

```
tunai seharusnya = kas lapangan + storting + tabungan masuk + admin − droping
                 − transfer − biaya tak terduga
```

(Potongan tabungan & admin ditambahkan kembali karena droping mencatat pokok
penuh, padahal yang keluar dari tangan kolektor hanya pencairannya. Uang jalan
tidak masuk: ia dibelanjakan kolektor.)

**I2. Tekor** = tunai seharusnya − tunai diterima (bila positif) — dipotong dari
gaji. **Lebih setor** = kebalikannya, tercatat apa adanya.

> Contoh: kas lapangan 1.000.000; storting 1.250.000; satu akad harian pokok
> 1.000.000 (admin 50.000, tabungan 50.000, droping 1.000.000); transfer 70.000;
> biaya ban 30.000.
>
> Tunai seharusnya = 1.000.000 + 1.250.000 + 50.000 + 50.000 − 1.000.000 −
> 70.000 − 30.000 = **1.250.000**. Kasir menerima 1.200.000 → **tekor 50.000**.

**I3. Batas transfer** per setoran:

| Jenis transaksi | Paling banyak ditransfer |
|---|---|
| Angsuran | setoran murni + setoran pelunasan |
| Pelunasan | setoran murni (bagian yang ditutup tabungan bukan uang nasabah) |
| Gulung | tidak boleh |

**I4.** Sesudah kas diterima, hari itu **terkunci**: angka hari, transfer, biaya,
pembatalan transaksi, dan batal akad kolektor itu ditolak — sampai bos
membatalkan penerimaannya.

---

## J. Gaji kolektor

**J1. Gaji kotor** = Σ per hari (storting hari itu × tarif hari itu) ÷ 10.000,
dibulatkan per periode. Tarif dalam basis poin; **bawaan 500 = 5%**.

**J2. Tarif yang berlaku** pada satu hari: tarif khusus kolektor terbaru (yang
berlaku mulai ≤ hari itu) bila ada, selain itu tarif kantor terbaru. Tarif
tidak bisa diberlakukan mundur.

**J3. Gaji bersih** = gaji kotor − potongan tekor periode itu.

**J4.** Gaji hanya dibayar untuk **periode yang sudah berakhir**, periode tak
boleh tumpang tindih, dan **tekor melebihi gaji ditolak**.

> Contoh: periode 1–15 Okt, tarif 5%, storting 12.000.000 → gaji kotor
> 600.000; tekor 50.000 → gaji bersih **550.000**.

**J5. Storting negatif ikut dihitung** (tidak dinolkan): hari dengan pelunasan
bertabungan lebih (D2) punya storting negatif, sehingga gaji kolektor hari itu
berkurang sebesar tarif × storting. *Keputusan pemilik, 23 Okt 2026.*

---

## K. Pemutihan

**K1.** Hanya bos; alasan: macet lama, meninggal, atau lainnya (dengan keterangan).

**K2.** Saldo dan tabungan **tidak disentuh**; tanpa transaksi; pinjaman
berstatus diputihkan; **nasabah diblokir** (tak bisa akad baru).

**K3.** Batal pemutihan mengembalikan status macet (bila tanggal macetnya
tersimpan) atau berjalan; blokir dibuka bila itu pemutihan terakhirnya.

---

## L. Pembatalan

**L1.** Setiap pembatalan uang hanya oleh **bos**, **pada hari yang sama**, dengan
alasan: transaksi, akad, transfer setoran, serah terima kas, biaya tak
terduga, mutasi kas, gaji, penarikan tabungan, pencocokan kas.

**L2. Batal akad** hanya sebelum pinjaman punya peristiwa apa pun.

**L3. Batal pelunasan** membuka lagi pinjaman dan mengembalikan tabungan; **batal
gulung** membatalkan penerus lebih dulu (bila belum bertransaksi), lalu membuka
lagi pinjaman asal.

---

## M. Posisi modal

```
posisi modal = saldo tunai buku + saldo bank buku + piutang aktif − tabungan nasabah
```

Piutang aktif = saldo pinjaman berjalan + macet (yang diputihkan tidak
dihitung); kas yang sedang dibawa kolektor sudah termasuk saldo tunai buku.

---

## N. Performa penagihan harian

*(Ditambahkan 24 Okt 2026 — rumus yang sama dengan layar persentase aplikasi
lama.)* Hanya pinjaman **harian** — kewajiban mingguan & tempoan tidak jatuh
setiap hari.

**N1.** Untuk satu hari D:

```
patokan(D)    = angsuran berjalan harian akhir hari D−1   (potret posisi_harian D−1)
              − angsuran mati harian hari D               (pinjaman harian yang lunas,
                                                           digulung, atau diputihkan pada D)
persentase(D) = setoran murni harian hari D ÷ patokan(D) × 100
```

**N2.** Belum ada potret D−1 → patokan & persentase **kosong** (bukan nol).
Patokan ≤ 0 → persentase kosong (pembagian tak bermakna).

> Contoh: akhir kemarin 40 pinjaman harian berjalan, angsuran 50.000 → 2.000.000.
> Hari ini 2 di antaranya lunas (mati 100.000) → patokan 1.900.000. Setoran murni
> harian hari ini 1.710.000 → **90%**.

---

## Keputusan pemilik (23 Okt 2026)

| # | Keputusan |
|---|---|
| D2 | Selisih tabungan dikembalikan tunai di lapangan; otomatis mengurangi tunai yang diserahkan ke kasir. |
| F6 | Dibiarkan dulu; deteksi macet yang lebih canggih menyusul. |
| G3 | Server juga menolak libur pada angsuran terbayar 0 atau 1. |
| J5 | Storting negatif ikut dihitung dalam gaji. |

Usulan kelak: **deteksi macet yang lebih canggih** (F6).
