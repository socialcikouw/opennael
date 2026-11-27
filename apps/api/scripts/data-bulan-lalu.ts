import { geserTanggal, type JenisPinjaman } from "@opennael/domain";
import { buatDb } from "../src/platform/db/klien";
import { pastikanDatabasePengembangan } from "../src/platform/db/penjaga";
import {
  buatAcak,
  type HasilPinjaman,
  type Kalender,
  type Rencana,
  saldoPada,
  simulasikan,
  statusPada,
} from "./simulasi-lapangan";

/**
 * DATA UJI BULAN LALU — `bun run data:bulan-lalu` (28 Nov 2026): pembukuan lapangan dua bulan
 * terakhir untuk `rian-demo`, supaya Ringkasan, Performa, dan Portofolio HP punya pembanding.
 *
 * Nasabah salinan (`data:buat`) membawa pinjaman ke-2…ke-6 yang akadnya November; pinjaman
 * SEBELUMNYA (ke-1…ke-5) dibuat sebagai akad baru yang berjalan sejak awal bulan sebelum bulan
 * lalu dan lunas sebelum pinjaman sekarang dimulai — rantai mundur sampai pinjaman ke-1 atau
 * awal jendela. Ditambah dua nasabah yang macet di bulan lalu. Dari situ (simulasi-lapangan):
 *   - akad baru (droping, admin, tabungan, foto serah terima memakai berkas foto yang ada),
 *   - setoran harian / mingguan / tempoan, pelunasan bertabungan, sesekali transfer,
 *   - absen masuk kerja (dua hari tidak kerja), kas lapangan & uang jalan, laporan sore,
 *     serah terima kas ke kasir (sesekali tekor / lebih setor), biaya tak terduga,
 *   - potret `posisi_harian` tiap tanggal (sama dengan rumus sapuan tutup hari).
 * Jendela berakhir sehari sebelum data salinan (`tanggal_disalin`) supaya tak bertabrakan.
 *
 * Hanya Supabase dev. Menolak bila sudah pernah dijalankan (penanda sha256 foto `0000da7a…`)
 * kecuali `--ulang` (hapus hasil skrip ini lalu buat lagi). `--coba` = jalankan lalu batalkan
 * (periksa tanpa menulis). Sisa versi pertama skrip ini (nasabah riwayat bernama tetap
 * & potret acak) dibersihkan lebih dulu.
 */

const NAMA_KOLEKTOR = "rian-demo";
const PENANDA = "0000da7a";
/** Nasabah buatan versi pertama skrip (28 Nov 2026) — dibersihkan. */
const NAMA_LAMA = [
  "kasmini",
  "poniman",
  "sutarni",
  "marsudi",
  "painem",
  "rohmat",
  "sukinah",
  "parjo",
  "tumini",
  "karyadi",
  "sumiyati",
  "wagiman",
  "jumirah",
];
const NAMA_MACET = ["wagiman", "jumirah"];
const BIAYA = ["bensin tambahan", "tambal ban", "parkir pasar", "fotokopi kwitansi", "ganti oli"];

const lima = (n: number) => Math.ceil(n / 5_000) * 5_000;
const hariPekan = (t: string) => new Date(`${t}T00:00:00Z`).getUTCDay();
const jam = (t: string, j: string) => `${t}T${j}:00Z`;

pastikanDatabasePengembangan(process.env.DATABASE_URL);
const coba = process.argv.includes("--coba");
const ulang = process.argv.includes("--ulang");
const { sql: klien } = buatDb(process.env.DATABASE_URL as string);

class Batal extends Error {}

try {
  await klien.begin(async (tx) => {
    const [k] = await tx`
      select id, kantor_id from pengguna where nama = ${NAMA_KOLEKTOR} and peran = 'kolektor'`;
    if (!k) throw new Error(`Kolektor ${NAMA_KOLEKTOR} tidak ada.`);
    const kantorId = k.kantor_id as string;
    const kolektorId = k.id as string;
    const [kasir] = await tx`
      select id from pengguna where kantor_id = ${kantorId} and peran in ('kasir', 'bos')
      order by peran = 'kasir' desc limit 1`;
    const [ada] = await tx`
      select count(*)::int as n from foto where kantor_id = ${kantorId} and sha256 like ${`${PENANDA}%`}`;
    if ((ada?.n ?? 0) > 0 && !ulang) {
      throw new Error("Data bulan lalu sudah ada — tambahkan --ulang untuk membuatnya lagi.");
    }

    await tx`select set_config('nael.hapus_data_uji', 'ya', true)`;
    // ---- --ulang: hapus hasil skrip ini (penanda: sha256 foto, jam dibuat_at baku) ----------
    if (ulang) {
      const pj = tx`select p.id from pinjaman p join foto f on f.id = p.foto_serah_terima_id
        where f.kantor_id = ${kantorId} and f.sha256 like ${`${PENANDA}%`}`;
      await tx`delete from transfer_setoran where transaksi_id in (select id from transaksi where pinjaman_id in (${pj}))`;
      await tx`delete from transaksi where pinjaman_id in (${pj})`;
      await tx`delete from riwayat_status_pinjaman where pinjaman_id in (${pj})`;
      await tx`delete from libur_nasabah where pinjaman_id in (${pj})`;
      await tx`delete from pinjaman where id in (${pj})`;
      await tx`delete from foto where kantor_id = ${kantorId} and sha256 like ${`${PENANDA}%`}`;
      const hari = tx`select id from hari_kolektor where kolektor_id = ${kolektorId}
        and dibuat_at = (tanggal::text || 'T00:15:00Z')::timestamptz`;
      await tx`delete from serah_terima_kas where hari_kolektor_id in (${hari})`;
      await tx`delete from hari_kolektor where id in (${hari})`;
      await tx`delete from biaya_tak_terduga where kolektor_id = ${kolektorId}
        and dibuat_at = (tanggal::text || 'T06:00:00Z')::timestamptz`;
    }

    // ---- bersihkan versi pertama & nasabah macet buatan -------------------------------------
    const lama = await tx`
      select id from nasabah where kolektor_id = ${kolektorId} and nama in ${tx(NAMA_LAMA)}`;
    if (lama.length > 0) {
      const ids = lama.map((r) => r.id as string);
      const pj = tx`select id from pinjaman where nasabah_id in ${tx(ids)}`;
      await tx`delete from transfer_setoran where transaksi_id in (select id from transaksi where pinjaman_id in (${pj}))`;
      await tx`delete from transaksi where pinjaman_id in (${pj})`;
      await tx`delete from riwayat_status_pinjaman where pinjaman_id in (${pj})`;
      await tx`delete from libur_nasabah where pinjaman_id in (${pj})`;
      await tx`delete from pinjaman where nasabah_id in ${tx(ids)}`;
      await tx`delete from nasabah where id in ${tx(ids)}`;
    }
    await tx`select set_config('nael.hapus_data_uji', '', true)`;

    // ---- jendela & kalender -----------------------------------------------------------------
    const [h] = await tx`select kantor_hari_ini(${kantorId})::text as t`;
    const hariIni = h?.t as string;
    const awalBulanIni = `${hariIni.slice(0, 7)}-01`;
    const akhirBulanLalu = geserTanggal(awalBulanIni, -1);
    const awalBulanLalu = `${akhirBulanLalu.slice(0, 7)}-01`;
    const mulai = `${geserTanggal(awalBulanLalu, -1).slice(0, 7)}-01`;
    const [salin] = await tx`
      select min(coalesce(p.tanggal_disalin, p.tanggal_akad))::text as t from pinjaman p
      join nasabah n on n.id = p.nasabah_id where n.kolektor_id = ${kolektorId}`;
    const selesai = geserTanggal((salin?.t as string | null) ?? hariIni, -1);
    if (selesai < awalBulanLalu)
      throw new Error("Data salinan terlalu awal — tak ada ruang untuk bulan lalu.");

    const acak = buatAcak(Number(hariIni.replaceAll("-", "")));
    const libur = new Set(
      (
        await tx`select tanggal::text as t from libur_kantor
          where kantor_id = ${kantorId} and tanggal between ${mulai} and ${selesai}`
      ).map((r) => r.t as string),
    );
    const adaHari = new Map(
      (
        await tx`select tanggal::text as t, absensi from hari_kolektor
          where kolektor_id = ${kolektorId} and tanggal between ${mulai} and ${selesai}`
      ).map((r) => [r.t as string, r.absensi as string]),
    );
    const hariKerja: string[] = [];
    for (let t = mulai; t <= selesai; t = geserTanggal(t, 1)) {
      if (hariPekan(t) !== 0 && !libur.has(t)) hariKerja.push(t);
    }
    // Dua hari tidak kerja di bulan lalu (sakit, urusan keluarga).
    const bolong = new Set<string>();
    const kandidat = hariKerja.filter(
      (t) => t.startsWith(awalBulanLalu.slice(0, 7)) && !adaHari.has(t),
    );
    while (bolong.size < 2 && kandidat.length > 2) bolong.add(acak.pilih(kandidat));
    const masuk = hariKerja.filter((t) =>
      adaHari.has(t) ? adaHari.get(t) === "masuk_kerja" : !bolong.has(t),
    );
    const peluangBayar = new Map(masuk.map((t) => [t, 0.72 + acak.acak() * 0.27]));
    const kalender: Kalender = { masuk, peluangBayar };
    const masukSebelum = (t: string) => [...masuk].reverse().find((m) => m <= t);

    // ---- rencana pinjaman -------------------------------------------------------------------
    const awalPinjaman = await tx`
      select distinct on (n.id) n.id as nasabah, p.jenis, p.pinjaman_ke as ke, p.tanggal_akad::text as akad
      from pinjaman p join nasabah n on n.id = p.nasabah_id
      where n.kolektor_id = ${kolektorId} and p.status <> 'batal'
      order by n.id, p.pinjaman_ke`;
    const rencana: { nasabahId: string; ke: number; r: Rencana; h: HasilPinjaman }[] = [];
    /** Rentang lama pinjaman (hari) yang dicoba, dari pendek ke panjang. */
    const LAMA: Record<JenisPinjaman, [number, number]> = {
      harian: [27, 50],
      mingguan: [55, 85],
      tempoan: [8, 14],
    };
    for (const e of awalPinjaman) {
      let berikut = e.akad as string;
      for (let ke = (e.ke as number) - 1; ke >= 1; ke--) {
        const jenis = e.jenis as JenisPinjaman;
        // Tempoan biasanya meminjam lagi selang beberapa pekan; harian & mingguan langsung.
        const jeda = jenis === "tempoan" ? acak.bulat(3, 18) : acak.bulat(0, 2);
        const batas = geserTanggal(berikut, -1 - jeda);
        // Akad dicari supaya lunasnya jatuh alami beberapa hari sebelum batas (bukan dilunasi
        // sekaligus, bukan pula lunas jauh sebelum pinjaman berikutnya).
        const [a, b] = LAMA[jenis];
        let pilihan: { r: Rencana; h: HasilPinjaman } | null = null;
        for (let lama = a; lama <= b; lama++) {
          const akad = masukSebelum(geserTanggal(batas, -lama));
          if (!akad || akad < mulai) break;
          const r: Rencana = { jenis, akad, batas };
          const h = simulasikan(r, kalender, acak);
          pilihan = { r, h };
          if (!h.dipaksa) break;
        }
        if (!pilihan) break;
        rencana.push({ nasabahId: e.nasabah as string, ke, ...pilihan });
        berikut = pilihan.r.akad;
      }
    }
    const wilayah =
      await tx`select distinct wilayah_id as id from nasabah where kolektor_id = ${kolektorId}`;
    for (const nama of NAMA_MACET) {
      const id = crypto.randomUUID();
      await tx`insert into nasabah (id, kantor_id, kolektor_id, nama, wilayah_id)
        values (${id}, ${kantorId}, ${kolektorId}, ${nama}, ${acak.pilih(wilayah).id})`;
      // Membayar ±3 pekan lalu berhenti; macet 12 hari kerja kemudian (di bulan lalu).
      const akad = masukSebelum(geserTanggal(awalBulanLalu, -acak.bulat(18, 24))) ?? mulai;
      const berhenti = masukSebelum(geserTanggal(akad, acak.bulat(18, 24))) ?? akad;
      const sesudah = masuk.filter((t) => t > berhenti);
      const r: Rencana = {
        jenis: "harian",
        akad,
        batas: selesai,
        macet: { berhentiSesudah: berhenti, tanggalMacet: sesudah[11] ?? akhirBulanLalu },
      };
      rencana.push({ nasabahId: id, ke: 1, r, h: simulasikan(r, kalender, acak) });
    }

    const pinjaman = rencana.map((x) => ({ ...x, id: crypto.randomUUID() }));
    for (const p of pinjaman) {
      if (p.h.status === "berjalan")
        throw new Error(`Simulasi tak selesai: ${p.r.jenis} ${p.r.akad}`);
    }

    // ---- foto serah terima + pinjaman -------------------------------------------------------
    const [berkas] = await tx`
      select kunci_berkas from foto where kantor_id = ${kantorId} and jenis = 'serah_terima' limit 1`;
    const hex = () => Array.from({ length: 56 }, () => acak.bulat(0, 15).toString(16)).join("");
    const fotoBaris = pinjaman.map((p) => ({
      id: crypto.randomUUID(),
      kantor_id: kantorId,
      jenis: "serah_terima",
      kunci_berkas: (berkas?.kunci_berkas as string) ?? `kantor/${kantorId}/foto/data-uji.webp`,
      sha256: PENANDA + hex(),
      ukuran_byte: 150_000 + acak.bulat(0, 50_000),
      tipe_mime: "image/webp",
      diambil_at: jam(p.h.akad, "01:30"),
      diunggah_oleh: kolektorId,
      dibuat_at: jam(p.h.akad, "01:31"),
    }));
    await tx`insert into foto ${tx(fotoBaris)}`;
    const pinjamanBaris = pinjaman.map((p, i) => ({
      id: p.id,
      kantor_id: kantorId,
      pencair_id: kolektorId,
      dibuat_oleh: kolektorId,
      nasabah_id: p.nasabahId,
      pinjaman_ke: p.ke,
      jenis: p.h.jenis,
      tenor: p.h.tenor,
      asal: "baru",
      foto_serah_terima_id: fotoBaris[i]?.id,
      tanggal_akad: p.h.akad,
      pokok: p.h.pokok,
      potongan_admin: p.h.potonganAdmin,
      tabungan_masuk: p.h.tabunganMasuk,
      saldo_lama: 0,
      pencairan: p.h.pencairan,
      total_kembali: p.h.totalKembali,
      angsuran: p.h.angsuran,
      saldo_awal: p.h.totalKembali,
      drop_baru: p.h.pokok,
      drop_gulung: 0,
      pokok_berkurang: 0,
      status: p.h.status,
      saldo: p.h.saldo,
      tanggal_macet: p.h.tanggalMacet,
      tanggal_selesai: p.h.tanggalSelesai,
      dibuat_at: jam(p.h.akad, "01:32"),
    }));
    await tx`insert into pinjaman ${tx(pinjamanBaris)}`;

    // ---- setoran & transfer -----------------------------------------------------------------
    const transaksiBaris = pinjaman.flatMap((p) =>
      p.h.setoran.map((s) => ({
        id: crypto.randomUUID(),
        kantor_id: kantorId,
        pencatat_id: kolektorId,
        pinjaman_id: p.id,
        tanggal: s.tanggal,
        jenis: s.jenis,
        setoran_murni: s.setoranMurni,
        setoran_pelunasan: s.setoranPelunasan,
        tabungan_keluar: s.tabunganKeluar,
        saldo_sesudah: s.saldoSesudah,
        dibuat_at: jam(s.tanggal, `0${acak.bulat(1, 7)}:${String(acak.bulat(10, 59))}`),
      })),
    );
    for (let i = 0; i < transaksiBaris.length; i += 500) {
      await tx`insert into transaksi ${tx(transaksiBaris.slice(i, i + 500))}`;
    }
    const transferBaris = transaksiBaris
      .filter((t) => t.setoran_murni > 0 && acak.acak() < 0.04)
      .map((t) => ({
        kantor_id: kantorId,
        transaksi_id: t.id,
        nominal: t.setoran_murni,
        dibuat_oleh: kolektorId,
        dibuat_at: t.dibuat_at,
      }));
    if (transferBaris.length > 0) await tx`insert into transfer_setoran ${tx(transferBaris)}`;

    // ---- hari kolektor, biaya, serah terima kas ---------------------------------------------
    const per = <T>(f: (t: string) => T) => new Map(hariKerja.map((t) => [t, f(t)]));
    const storting = per(() => 0);
    for (const t of transaksiBaris) {
      storting.set(
        t.tanggal,
        (storting.get(t.tanggal) ?? 0) + t.setoran_murni + t.setoran_pelunasan - t.tabungan_keluar,
      );
    }
    const akadHari = per(() => ({ droping: 0, admin: 0, tabungan: 0 }));
    for (const p of pinjaman) {
      const a = akadHari.get(p.h.akad);
      if (a) {
        a.droping += p.h.pokok;
        a.admin += p.h.potonganAdmin;
        a.tabungan += p.h.tabunganMasuk;
      }
    }
    const transferPer = per(() => 0);
    for (const t of transferBaris) {
      const tg = transaksiBaris.find((x) => x.id === t.transaksi_id)?.tanggal as string;
      transferPer.set(tg, (transferPer.get(tg) ?? 0) + t.nominal);
    }
    const baru = hariKerja.filter((t) => !adaHari.has(t));
    const biayaBaris = baru
      .filter((t) => !bolong.has(t) && acak.acak() < 0.1)
      .map((t) => ({
        kantor_id: kantorId,
        kolektor_id: kolektorId,
        tanggal: t,
        nominal: acak.pilih([10_000, 15_000, 20_000, 25_000]),
        keterangan: acak.pilih(BIAYA),
        dibuat_oleh: kolektorId,
        dibuat_at: jam(t, "06:00"),
      }));
    if (biayaBaris.length > 0) await tx`insert into biaya_tak_terduga ${tx(biayaBaris)}`;
    const biayaPer = per(() => 0);
    for (const b of biayaBaris) biayaPer.set(b.tanggal, (biayaPer.get(b.tanggal) ?? 0) + b.nominal);

    const hariBaris = baru.map((t) => {
      const tidak = bolong.has(t);
      return {
        id: crypto.randomUUID(),
        kantor_id: kantorId,
        kolektor_id: kolektorId,
        tanggal: t,
        absensi: tidak ? "tidak_kerja" : "masuk_kerja",
        alasan_tidak_kerja: tidak ? acak.pilih(["sakit", "urusan keluarga"]) : null,
        kas_lapangan: tidak
          ? 0
          : lima((akadHari.get(t)?.droping ?? 0) * 0.9) + 5_000 * acak.bulat(10, 30),
        uang_jalan: tidak ? 0 : 5_000 * acak.bulat(2, 4),
        laporan_dibuka_at: tidak ? null : jam(t, "08:30"),
        dibuat_at: jam(t, "00:15"),
      };
    });
    await tx`insert into hari_kolektor ${tx(hariBaris)}`;
    const serahBaris = hariBaris
      .filter((r) => r.absensi === "masuk_kerja")
      .map((r) => {
        const a = akadHari.get(r.tanggal) ?? { droping: 0, admin: 0, tabungan: 0 };
        const seharusnya =
          r.kas_lapangan +
          (storting.get(r.tanggal) ?? 0) +
          a.tabungan +
          a.admin -
          a.droping -
          (transferPer.get(r.tanggal) ?? 0) -
          (biayaPer.get(r.tanggal) ?? 0);
        const u = acak.acak();
        const selisih =
          u < 0.08 ? -5_000 * acak.bulat(1, 5) : u < 0.13 ? 1_000 * acak.bulat(1, 10) : 0;
        return {
          kantor_id: kantorId,
          hari_kolektor_id: r.id,
          tunai_seharusnya: seharusnya,
          tunai_diterima: Math.max(0, seharusnya + selisih),
          diterima_oleh: kasir?.id as string,
          dibuat_at: jam(r.tanggal, "09:00"),
        };
      });
    await tx`insert into serah_terima_kas ${tx(serahBaris)}`;

    // ---- potret posisi harian (rumus sapuan tutup hari) -------------------------------------
    await tx`delete from posisi_harian where kolektor_id = ${kolektorId} and tanggal between ${mulai} and ${selesai}`;
    const potret = [];
    for (let t = mulai; t <= selesai; t = geserTanggal(t, 1)) {
      for (const jenis of ["harian", "mingguan", "tempoan"] as const) {
        const b = {
          jumlah_berjalan: 0,
          jumlah_macet: 0,
          saldo_berjalan: 0,
          saldo_macet: 0,
          angsuran_berjalan: 0,
          angsuran_macet: 0,
        };
        for (const p of pinjaman as { h: HasilPinjaman }[]) {
          if (p.h.jenis !== jenis) continue;
          const st = statusPada(p.h, t);
          if (!st) continue;
          const saldo = saldoPada(p.h, t) ?? 0;
          if (st === "berjalan") {
            b.jumlah_berjalan++;
            b.saldo_berjalan += saldo;
            b.angsuran_berjalan += p.h.angsuran;
          } else {
            b.jumlah_macet++;
            b.saldo_macet += saldo;
            b.angsuran_macet += p.h.angsuran;
          }
        }
        if (b.jumlah_berjalan + b.jumlah_macet > 0) {
          potret.push({ kantor_id: kantorId, kolektor_id: kolektorId, tanggal: t, jenis, ...b });
        }
      }
    }
    await tx`insert into posisi_harian ${tx(potret)}`;

    // ---- ringkasan ---------------------------------------------------------------------------
    const rp = (n: number) => n.toLocaleString("id-ID");
    const bulan = (b: string) => {
      const ps = pinjaman.filter((p) => p.h.akad.startsWith(b));
      const st = transaksiBaris.filter((t) => t.tanggal.startsWith(b));
      const lunas = pinjaman.filter((p) => p.h.tanggalSelesai?.startsWith(b)).length;
      return `${b}: ${ps.length} akad (droping ${rp(ps.reduce((n, p) => n + p.h.pokok, 0))}), ${st.length} setoran (murni ${rp(st.reduce((n, t) => n + t.setoran_murni, 0))}), ${lunas} lunas`;
    };
    console.log(
      `Jendela ${mulai} s/d ${selesai} untuk ${NAMA_KOLEKTOR}: ${pinjaman.length} pinjaman riwayat (${NAMA_MACET.length} macet), ${hariBaris.length} hari absen baru, ${serahBaris.length} serah terima, ${biayaBaris.length} biaya, ${transferBaris.length} transfer, ${potret.length} baris potret.`,
    );
    for (const b of [mulai, awalBulanLalu, awalBulanIni]) console.log(`  ${bulan(b.slice(0, 7))}`);
    if (lama.length > 0) console.log(`  (dibersihkan: ${lama.length} nasabah versi pertama)`);
    if (coba) throw new Batal();
  });
} catch (e) {
  if (!(e instanceof Batal)) throw e;
  console.log("--coba: semua dibatalkan, database tidak berubah.");
} finally {
  await klien.end();
}
