import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { MigrasiInput } from "@opennael/contracts";
import { geserTanggal, hariPekanDari, syaratAkad } from "@opennael/domain";
import { sql } from "drizzle-orm";
import { buatLayananMigrasiIdempoten } from "../src/modul/migrasi";
import { buatDb, type Db } from "../src/platform/db/klien";
import { pastikanDatabasePengembangan } from "../src/platform/db/penjaga";

/**
 * DATA UJI LAPANGAN — "saklar" untuk mencoba HP lewat Expo Go dengan nasabah sungguhan.
 *
 *   bun run data:buat   → 35 nasabah lama (salinan migrasi, aturan-usaha A10) untuk
 *                          kolektor `rian-demo`: 25 harian, 5 mingguan, 5 tempoan.
 *   bun run data:hapus  → kembali bersih: semua data dihapus KECUALI kantor, pengguna,
 *                          pengaturan kantor (pekan kerja, libur kantor, tarif gaji, rem
 *                          kantor/kolektor) dan tautan HP (perangkat & tautan) — HP tetap
 *                          tertaut. Berkas foto ikut dihapus.
 *
 * Hanya ke Supabase dev (`pastikanDatabasePengembangan`). Akad lewat layanan migrasi yang
 * sama dengan Salin Buku web, jadi semua aturan & CHECK berlaku.
 *
 * Tempoan dihitung dari hari masuk kerja kolektor (A4); supaya kelimanya langsung berada di
 * tahap berbeda, `buat` juga mengisi riwayat absen masuk kerja rian-demo di hari kerja
 * (Senin–Sabtu) sebelum hari ini — kas lapangan & uang jalan Rp 5.000.
 * Sesudah rian-demo absen hari ini, tempoan berada di hari ke-3, ke-5, ke-6 (jatuh tempo),
 * ke-8 (meleset 2), dan ke-10 (batas lunas).
 */

const NAMA_KOLEKTOR = "rian-demo";
const KAMPUNG = ["pule", "sumber rejo", "tanjung sari", "kebon agung", "sido mulyo"];
const NAMA = [
  "sri wahyuni",
  "budi santoso",
  "siti aminah",
  "agus salim",
  "dewi lestari",
  "joko susilo",
  "rina marlina",
  "eko prasetyo",
  "nur aini",
  "bambang irawan",
  "yuli astuti",
  "hadi wibowo",
  "lilis suryani",
  "wahyu hidayat",
  "tuti handayani",
  "slamet riyadi",
  "endang sulastri",
  "dedi kurniawan",
  "suparmi",
  "rudi hartono",
  "mulyani",
  "heri setiawan",
  "ani rahmawati",
  "darmaji",
  "fitri yanti",
  "sugeng",
  "warsini",
  "imam fauzi",
  "tri wulandari",
  "sutrisno",
  "kartini",
  "paijo",
  "umi kulsum",
  "anton wijaya",
  "sumarni",
];

const acak = (min: number, maks: number) => min + Math.floor(Math.random() * (maks - min + 1));
const pilih = <T>(daftar: readonly T[]): T => daftar[acak(0, daftar.length - 1)] as T;
const acakUrut = <T>(daftar: readonly T[]): T[] =>
  daftar
    .map((x) => ({ x, k: Math.random() }))
    .sort((a, b) => a.k - b.k)
    .map((v) => v.x);
const pokokAcak = (min: number, maks: number) => acak(min / 100_000, maks / 100_000) * 100_000;

/** Hari kerja (Senin–Sabtu) ke-n sebelum `hariIni`: n = 1 → hari kerja terakhir. */
function hariKerjaLalu(hariIni: string, n: number): string {
  let t = hariIni;
  for (let i = 0; i < n; ) {
    t = geserTanggal(t, -1);
    if (hariPekanDari(t) !== 0) i++;
  }
  return t;
}

async function bacaSasaran(db: Db) {
  const [r] = (await db.execute(sql`
    select k.id as kolektor_id, k.kantor_id, b.id as bos_id, kantor_hari_ini(k.kantor_id)::text as hari
    from pengguna k
    join pengguna b on b.kantor_id = k.kantor_id and b.peran = 'bos'
    where k.nama = ${NAMA_KOLEKTOR} and k.peran = 'kolektor'
    limit 1`)) as unknown as {
    kolektor_id: string;
    kantor_id: string;
    bos_id: string;
    hari: string;
  }[];
  if (!r) throw new Error(`kolektor "${NAMA_KOLEKTOR}" tidak ditemukan`);
  return r;
}

async function buat(db: Db) {
  const s = await bacaSasaran(db);
  const [ada] = (await db.execute(
    sql`select count(*)::int as n from nasabah where kantor_id = ${s.kantor_id}`,
  )) as unknown as { n: number }[];
  if ((ada?.n ?? 0) > 0) {
    throw new Error(`sudah ada ${ada?.n} nasabah di kantor ini — jalankan "data:hapus" dulu`);
  }

  // Riwayat absen masuk kerja 12 hari kerja terakhir (bahan hari ke-N tempoan, A4).
  for (let n = 12; n >= 1; n--) {
    await db.execute(sql`
      insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi, kas_lapangan, uang_jalan)
      values (${s.kantor_id}, ${s.kolektor_id}, ${hariKerjaLalu(s.hari, n)}, 'masuk_kerja', 5000, 5000)
      on conflict do nothing`);
  }

  const layanan = buatLayananMigrasiIdempoten({ db })();
  const aktor = {
    penggunaId: s.bos_id,
    kantorId: s.kantor_id,
    peran: "bos" as const,
    perangkatId: "00000000-0000-0000-0000-000000000000",
  };
  const nama = acakUrut(NAMA);
  let i = 0;
  const salin = async (isi: Omit<MigrasiInput, "nasabah" | "kolektorId">) => {
    const n = nama[i++] as string;
    await layanan.salin(aktor, {
      ...isi,
      nasabah: { nama: n, kampung: { nama: pilih(KAMPUNG) } },
      kolektorId: s.kolektor_id,
    });
    return n;
  };

  // ---- harian 25: angsuran terbayar acak; dua di antaranya sudah macet di buku. ----
  for (let k = 0; k < 25; k++) {
    const pokok = pokokAcak(500_000, 3_000_000);
    const { totalKembali, angsuran } = syaratAkad("harian", pokok, 25);
    const terbayar = acak(0, 20);
    await salin({
      jenis: "harian",
      tenor: 25,
      pokok,
      tanggalAkad: hariKerjaLalu(s.hari, terbayar + acak(1, 4)),
      saldo: totalKembali - terbayar * angsuran,
      tabungan: acak(0, 20) * 5_000,
      pinjamanKe: acak(1, 6),
      macet: k < 2,
    });
  }

  // ---- mingguan 5: dua di antaranya hari tagihnya hari ini (akad + 7k). ----
  for (let k = 0; k < 5; k++) {
    const pokok = pokokAcak(500_000, 2_000_000);
    const { totalKembali, angsuran } = syaratAkad("mingguan", pokok, 8);
    const minggu = acak(1, 6);
    await salin({
      jenis: "mingguan",
      tenor: 8,
      pokok,
      tanggalAkad: geserTanggal(s.hari, -(7 * minggu + (k < 2 ? 0 : acak(1, 6)))),
      saldo: totalKembali - acak(0, minggu - 1) * angsuran,
      tabungan: 0,
      pinjamanKe: acak(1, 4),
    });
  }

  // ---- tempoan 5: sesudah absen hari ini berada di hari ke-3, 5, 6, 8, 10. ----
  for (const ke of [3, 5, 6, 8, 10]) {
    const pokok = pokokAcak(200_000, 1_000_000);
    const { totalKembali } = syaratAkad("tempoan", pokok, 6);
    await salin({
      jenis: "tempoan",
      tenor: 6,
      pokok,
      tanggalAkad: hariKerjaLalu(s.hari, ke),
      saldo: totalKembali,
      tabungan: 0,
      pinjamanKe: acak(1, 3),
    });
  }

  console.log(
    `Selesai: 35 nasabah untuk ${NAMA_KOLEKTOR} (25 harian, 5 mingguan, 5 tempoan) di ${KAMPUNG.length} kampung; riwayat absen 12 hari kerja.`,
  );
}

/** Tabel yang TETAP: kantor, pengguna, pengaturan kantor, tautan HP. Lainnya dikosongkan. */
const TETAP = [
  "kantor",
  "pengguna",
  "pekan_kerja",
  "libur_kantor",
  "tarif_gaji",
  "perangkat",
  "tautan",
];

async function hapus(db: Db) {
  await db.transaction(async (tx) => {
    const tabel = (
      (await tx.execute(sql`
        select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'`)) as unknown as {
        table_name: string;
      }[]
    )
      .map((r) => r.table_name)
      .filter((n) => !TETAP.includes(n));
    // Rem bos tingkat kantor/kolektor = pengaturan: disimpan, lalu dipasang lagi (rem per
    // nasabah ikut terhapus bersama nasabahnya).
    await tx.execute(
      sql`create temp table rem_tetap on commit drop as select * from kebijakan where nasabah_id is null`,
    );
    await tx.execute(sql.raw(`truncate table ${tabel.map((n) => `"${n}"`).join(", ")}`));
    await tx.execute(sql`insert into kebijakan select * from rem_tetap`);
  });
  await rm(fileURLToPath(new URL("../.berkas/kantor", import.meta.url)), {
    recursive: true,
    force: true,
  });
  console.log("Selesai: data nasabah, pinjaman, transaksi, absen, kas, dan foto dihapus.");
}

const perintah = process.argv[2];
if (perintah !== "buat" && perintah !== "hapus") {
  console.error("Pakai: bun scripts/data-uji.ts buat | hapus");
  process.exit(1);
}
pastikanDatabasePengembangan(process.env.DATABASE_URL);
const { db, sql: klien } = buatDb(process.env.DATABASE_URL as string);
try {
  await (perintah === "buat" ? buat(db) : hapus(db));
} finally {
  await klien.end();
}
