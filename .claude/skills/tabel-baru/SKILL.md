---
name: tabel-baru
description: Membangun satu tabel database baru di apps/api dari rancangannya di docs/skema/schema-<tabel>.md — skema Drizzle, migrasi (termasuk SQL kustom untuk trigger/fungsi), uji skema yang membuktikan setiap aturan menolak data salah, lalu terapkan ke Supabase dev, periksa, commit, dan push. Pakai saat diminta "bangun tabel X", "lanjut tabel berikutnya", atau saat fitur butuh tabel yang belum ada.
---

# Membangun tabel baru dari rancangannya

Rancangan di `docs/skema/` adalah acuan; kode mengikutinya, bukan sebaliknya.
Bila rancangan ternyata kurang atau keliru, **ubah dokumennya dulu** (dan
tanyakan pemilik bila menyangkut aturan usaha), baru kodenya.

## 1. Baca

1. `docs/skema/schema-<tabel>.md` — kolom, aturan database (PK, FK, UNIQUE,
   CHECK, index, trigger), catatan migrasi.
2. `docs/skema/README.md` — konvensi penamaan (#1–#9).
3. Tabel yang dirujuk FK-nya harus sudah ada di `apps/api/src/platform/db/skema/`.
   Belum ada → bangun tabel itu lebih dulu.
4. Abaikan kolom "Sekarang" & "Catatan migrasi" — itu untuk memindahkan data
   dari sistem lama, bukan untuk membuat tabel.

## 2. Skema Drizzle — `apps/api/src/platform/db/skema/<tabel-kebab>.ts`

Ikuti pola berkas yang sudah ada (`pengguna.ts`, `tarif-gaji.ts`, `tautan.ts`):

- Komentar kepala tabel: satu baris = apa, aturan inti, rujukan ke dokumennya.
- Nama kolom camelCase di TS (casing `snake_case` mengubahnya otomatis).
- `*_at` memakai `waktu()`; standar `dibuat_at`/`diubah_at` memakai
  `...jejakWaktu()` (dari `./kolom`). Tabel yang hanya bertambah tidak punya
  `diubah_at`.
- Tanggal pembukuan: `date({ mode: "string" })`. Uang: `bigint({ mode: "number" })`.
- **Semua FK lewat `foreignKey({ name: "<tabel>_<kolom>_fk", ... })`**, bukan
  `.references()` (nama bawaan Drizzle melanggar konvensi #8). FK pelaku &
  sasaran selalu GABUNGAN dengan `kantor_id`; kolektor → `pengguna(id,
  kolektor_kantor_id)`.
- UNIQUE parsial → `uniqueIndex("uniq_...").on(...).where(sql\`...\`)`.
- CHECK yang melibatkan kolom boleh kosong ditulis dengan `IS NOT NULL`
  eksplisit (CHECK meloloskan NULL). Nilai enum yang ditambahkan belakangan
  dibandingkan lewat `::text`.
- Ekspor dari `apps/api/src/platform/db/skema/index.ts`.

## 3. Migrasi

Di `apps/api`:

1. `bun run db:generate --name <nama_singkat>` → periksa SQL di
   `src/platform/db/migrasi/`: nama constraint, `IS NOT NULL`, urutan FK.
2. Trigger, fungsi, `EXCLUDE`, ekstensi → migrasi kustom:
   `bunx --bun drizzle-kit generate --custom --name <nama>`, lalu isi SQL-nya.
   Pakai ulang fungsi yang ada (cek migrasi sebelumnya):
   - `atur_diubah_at()` — setiap tabel ber-`diubah_at`;
   - `berlaku_tidak_mundur()` — tabel bertanggal `berlaku_mulai` + `kantor_id`;
   - `hanya_bertambah()` — tabel yang tak pernah diubah/dihapus;
   - `kantor_hari_ini(kantor_id)`, `nael_jalan_pintas()`.
   Tabel uang yang hanya boleh ditandai batal butuh fungsi `uang_hanya_batal()`
   — buat sekali bila belum ada.
   Ingat: di trigger **BEFORE**, kolom turunan (`GENERATED`) masih NULL di
   `NEW` — jangan membandingkan atau membacanya di sana.
3. **Migrasi yang sudah diterapkan tidak pernah disunting** — perubahan selalu
   lewat migrasi baru.
4. `bun run db:migrate` (Supabase dev; `.env` di `apps/api`).

## 4. Uji skema — `apps/api/src/platform/db/skema.test.ts`

Tambahkan bagian untuk tabel itu di dalam transaksi yang dibatalkan (pola
`tolak(tx, "<nama_constraint>", (sp) => sp\`...\`)` yang sudah ada):

- satu sisipan sah;
- **setiap** CHECK, UNIQUE, FK (termasuk FK gabungan lintas kantor), dan
  trigger dibuktikan menolak data salah dengan nama constraint yang tepat;
- jalan pintas yang sah (`nael.migrasi_data`, `nael.hapus_data_uji`) bila ada.

Sesudahnya pastikan database dev kembali bersih (hitung baris tabel itu = 0).

## 5. Periksa, catat, commit, push

Dari root repo — **tanpa pipa** di rangkaian pemeriksaan:

```
bun run typecheck && bun run test && bun run lint
```

Lalu:

- `docs/skema/README.md`: tandai tabel itu "dibangun" bila README punya kolom
  status pembangunan; keputusan baru yang muncul → `docs/keputusan.md`.
- Commit (pesan bahasa Indonesia: `feat(db): tabel <nama> — <inti>`), lalu
  `git push`.

## Yang tidak dilakukan skill ini

Rute API, layanan, dan layar — itu langkah terpisah sesudah tabelnya ada.
