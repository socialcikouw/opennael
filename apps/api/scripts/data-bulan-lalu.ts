import { geserTanggal, type JenisPinjaman } from "@opennael/domain";
import { sql } from "drizzle-orm";
import { buatDb, type Db } from "../src/platform/db/klien";
import { pastikanDatabasePengembangan } from "../src/platform/db/penjaga";

/**
 * DATA UJI BULAN LALU — `bun run data:bulan-lalu` (28 Nov 2026): supaya delta Portofolio HP
 * (bulan ini vs bulan lalu) terlihat tanpa menunggu sebulan. Untuk kolektor `rian-demo`:
 *
 *   1. riwayat pinjaman salinan (`asal = migrasi`) yang LUNAS di bulan lalu, tanggal 1–28
 *      (nasabah lama baru, ikut tampil di Buku) — harian ditutup pelunasan bertabungan
 *      sehingga "tabungan keluar" bulan lalu terisi;
 *   2. dua pinjaman harian yang MACET di bulan lalu (masih macet sekarang);
 *   3. potret `posisi_harian` setiap tanggal bulan lalu, menanjak menuju posisi akhir bulan
 *      yang sedikit di bawah posisi sekarang (acak) — pembanding "akhir <bulan>".
 *
 * Menolak bila potret bulan lalu sudah ada (hapus barisnya untuk mengisi ulang potret saja —
 * riwayat lunas/macet tak dibuat dua kali). Hanya ke Supabase dev; `data:hapus` ikut
 * membersihkannya.
 */

const NAMA_KOLEKTOR = "rian-demo";
const NAMA_LUNAS: [string, JenisPinjaman][] = [
  ["kasmini", "harian"],
  ["poniman", "harian"],
  ["sutarni", "harian"],
  ["marsudi", "harian"],
  ["painem", "harian"],
  ["rohmat", "harian"],
  ["sukinah", "mingguan"],
  ["parjo", "mingguan"],
  ["tumini", "tempoan"],
  ["karyadi", "tempoan"],
  ["sumiyati", "tempoan"],
];
const NAMA_MACET = ["wagiman", "jumirah"];

/** Persen kembali & tabungan (bilangan bulat — rupiah tanpa pecahan). */
const TARIF: Record<JenisPinjaman, { tenor: number; kembali: number; tabungan: number }> = {
  harian: { tenor: 25, kembali: 125, tabungan: 5 },
  mingguan: { tenor: 8, kembali: 120, tabungan: 0 },
  tempoan: { tenor: 6, kembali: 125, tabungan: 0 },
};
const persen = (pokok: number, p: number) => (pokok * p) / 100;

const acak = (min: number, maks: number) => min + Math.random() * (maks - min);
const acakBulat = (min: number, maks: number) => Math.floor(acak(min, maks + 1));
const ratusRibu = (n: number) => Math.max(100_000, Math.round(n / 100_000) * 100_000);
const ribu = (n: number) => Math.round(n / 1_000) * 1_000;

async function baris<T>(db: Db, q: ReturnType<typeof sql>): Promise<T[]> {
  return (await db.execute(q)) as unknown as T[];
}

async function jalankan(db: Db) {
  await db.transaction(async (tx) => {
    const q = <T>(s: ReturnType<typeof sql>) => baris<T>(tx as unknown as Db, s);
    const [k] = await q<{ id: string; kantor_id: string }>(sql`
      select id, kantor_id from pengguna where nama = ${NAMA_KOLEKTOR} and peran = 'kolektor'`);
    if (!k) throw new Error(`Kolektor ${NAMA_KOLEKTOR} tidak ada.`);
    const [h] = await q<{ t: string }>(sql`select kantor_hari_ini(${k.kantor_id})::text as t`);
    const hariIni = h?.t as string;
    const akhir = geserTanggal(`${hariIni.slice(0, 7)}-01`, -1);
    const awal = `${akhir.slice(0, 7)}-01`;
    const [ada] = await q<{ n: number }>(sql`
      select count(*)::int as n from posisi_harian
      where kolektor_id = ${k.id} and tanggal between ${awal} and ${akhir}`);
    if ((ada?.n ?? 0) > 0)
      throw new Error(`Potret ${awal.slice(0, 7)} sudah ada — tidak diisi ulang.`);
    const wilayah = await q<{ id: string }>(sql`
      select distinct n.wilayah_id as id from nasabah n where n.kolektor_id = ${k.id}`);
    if (wilayah.length === 0)
      throw new Error("Belum ada nasabah/kampung — jalankan data:buat dulu.");
    const kampung = () => wilayah[acakBulat(0, wilayah.length - 1)]?.id as string;

    const nasabahBaru = async (nama: string) =>
      (
        await q<{ id: string }>(sql`
          insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
          values (${k.kantor_id}, ${k.id}, ${nama}, ${kampung()}) returning id`)
      )[0]?.id as string;

    const pinjaman = async (isi: {
      nasabahId: string;
      jenis: JenisPinjaman;
      pokok: number;
      tanggalAkad: string;
      saldo: number;
      status: "lunas" | "macet";
      tanggal: string;
    }) => {
      const t = TARIF[isi.jenis];
      const total = persen(isi.pokok, t.kembali);
      const angsuran = isi.jenis === "tempoan" ? total : total / t.tenor;
      return (
        await q<{ id: string }>(sql`
          insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis,
            tenor, asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk,
            pencairan, total_kembali, angsuran, saldo_awal, drop_baru, saldo, status,
            tanggal_macet, tanggal_selesai)
          values (${k.kantor_id}, ${k.id}, ${k.id}, ${isi.nasabahId}, 1, ${isi.jenis}, ${t.tenor},
            'migrasi', ${isi.tanggalAkad}, ${isi.tanggalAkad}, ${isi.pokok}, 0,
            ${persen(isi.pokok, t.tabungan)}, 0, ${total}, ${angsuran}, ${total}, 0, ${isi.saldo},
            ${isi.status}, ${isi.status === "macet" ? isi.tanggal : null},
            ${isi.status === "lunas" ? isi.tanggal : null})
          returning id`)
      )[0]?.id as string;
    };

    // Riwayat lunas/macet cukup sekali (transaksi tak bisa dihapus); potret boleh diisi ulang
    // sesudah baris posisi_harian bulan lalu dihapus.
    const [riwayat] = await q<{ n: number }>(sql`
      select count(*)::int as n from nasabah where kolektor_id = ${k.id} and nama = ${NAMA_LUNAS[0]?.[0]}`);
    const riwayatAda = (riwayat?.n ?? 0) > 0;
    if (!riwayatAda) {
      // 1. Lunas bulan lalu (tanggal 1–28 supaya masuk rentang sepadan).
      for (const [nama, jenis] of NAMA_LUNAS) {
        const t = TARIF[jenis];
        const pokok = ratusRibu(acak(jenis === "mingguan" ? 500_000 : 300_000, 2_000_000));
        const selesai = `${akhir.slice(0, 7)}-${String(acakBulat(1, 28)).padStart(2, "0")}`;
        const lama = jenis === "harian" ? 30 : jenis === "mingguan" ? 56 : 8;
        const id = await pinjaman({
          nasabahId: await nasabahBaru(nama),
          jenis,
          pokok,
          tanggalAkad: geserTanggal(selesai, -lama),
          saldo: 0,
          status: "lunas",
          tanggal: selesai,
        });
        // Pelunasan: harian dua angsuran terakhir, satu dari tabungan; lainnya angsuran penuh.
        const total = persen(pokok, t.kembali);
        const angsuran = jenis === "tempoan" ? total : total / t.tenor;
        const tabungan = persen(pokok, t.tabungan);
        const murni = jenis === "harian" ? 2 * angsuran - tabungan : angsuran;
        await tx.execute(sql`
          insert into transaksi (kantor_id, pencatat_id, pinjaman_id, tanggal, jenis, setoran_murni,
            setoran_pelunasan, tabungan_keluar, saldo_sesudah)
          values (${k.kantor_id}, ${k.id}, ${id}, ${selesai}, 'pelunasan', ${murni},
            ${tabungan}, ${tabungan}, 0)`);
      }

      // 2. Macet di bulan lalu (masih macet).
      for (const nama of NAMA_MACET) {
        const pokok = ratusRibu(acak(500_000, 1_500_000));
        const total = persen(pokok, 125);
        const macet = `${akhir.slice(0, 7)}-${String(acakBulat(3, 25)).padStart(2, "0")}`;
        await pinjaman({
          nasabahId: await nasabahBaru(nama),
          jenis: "harian",
          pokok,
          tanggalAkad: geserTanggal(macet, -40),
          saldo: (total / 25) * acakBulat(6, 12),
          status: "macet",
          tanggal: macet,
        });
      }
    }

    // 3. Potret bulan lalu: posisi sekarang dikali faktor acak → akhir bulan; awal bulan ±85%.
    const kini = await q<{
      jenis: JenisPinjaman;
      jb: number;
      jm: number;
      sb: number;
      sm: number;
      ab: number;
      am: number;
    }>(sql`
      select p.jenis,
        count(*) filter (where p.status = 'berjalan')::int as jb,
        count(*) filter (where p.status = 'macet')::int as jm,
        coalesce(sum(p.saldo) filter (where p.status = 'berjalan'), 0)::bigint::float8 as sb,
        coalesce(sum(p.saldo) filter (where p.status = 'macet'), 0)::bigint::float8 as sm,
        coalesce(sum(p.angsuran) filter (where p.status = 'berjalan'), 0)::bigint::float8 as ab,
        coalesce(sum(p.angsuran) filter (where p.status = 'macet'), 0)::bigint::float8 as am
      from pinjaman p join nasabah n on n.id = p.nasabah_id
      where n.kolektor_id = ${k.id} and p.status in ('berjalan', 'macet')
      group by p.jenis`);
    const hari = Number(akhir.slice(8, 10));
    for (const jenis of ["harian", "mingguan", "tempoan"] as const) {
      const c = kini.find((x) => x.jenis === jenis) ?? { jb: 0, jm: 0, sb: 0, sm: 0, ab: 0, am: 0 };
      const fB = acak(0.82, 0.95);
      const fM = acak(0.6, 0.9);
      const ujung = {
        // Turun ±15% (paling tidak satu), tetapi tak pernah nol bila saldonya ada.
        jb: Math.max(c.jb > 0 ? 1 : 0, c.jb - acakBulat(1, Math.max(1, Math.round(c.jb * 0.15)))),
        jm: Math.max(0, c.jm - 1),
        sb: c.sb * fB,
        sm: c.sm * fM,
        ab: c.ab * acak(0.85, 0.97),
        am: c.am * fM,
      };
      for (let d = 1; d <= hari; d++) {
        const tanggal = `${akhir.slice(0, 7)}-${String(d).padStart(2, "0")}`;
        const r = 0.85 + (0.15 * (d - 1)) / Math.max(1, hari - 1);
        const goyang = d === hari ? 1 : acak(0.98, 1.02);
        await tx.execute(sql`
          insert into posisi_harian (kantor_id, kolektor_id, tanggal, jenis, jumlah_berjalan,
            jumlah_macet, saldo_berjalan, saldo_macet, angsuran_berjalan, angsuran_macet)
          values (${k.kantor_id}, ${k.id}, ${tanggal}, ${jenis}, ${Math.round(ujung.jb * r)},
            ${Math.round(ujung.jm * r)}, ${ribu(ujung.sb * r * goyang)}, ${ribu(ujung.sm * r * goyang)},
            ${ribu(ujung.ab * r)}, ${ribu(ujung.am * r)})`);
      }
    }
    console.log(
      `Selesai (${awal.slice(0, 7)}): ${riwayatAda ? "riwayat sudah ada, " : `${NAMA_LUNAS.length} pinjaman lunas, ${NAMA_MACET.length} macet, `}potret ${hari} hari × 3 jenis untuk ${NAMA_KOLEKTOR}.`,
    );
  });
}

pastikanDatabasePengembangan(process.env.DATABASE_URL);
const { db, sql: klien } = buatDb(process.env.DATABASE_URL as string);
try {
  await jalankan(db);
} finally {
  await klien.end();
}
