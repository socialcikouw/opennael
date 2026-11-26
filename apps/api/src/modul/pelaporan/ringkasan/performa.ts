import {
  type BahanPatokan,
  geserTanggal,
  hitungPerforma,
  type PerpindahanStatus,
  patokanJatuhTagih,
  persentasePerforma,
} from "@opennael/domain";
import { and, asc, between, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import {
  nasabah,
  pinjaman,
  posisiHarian,
  riwayatStatusPinjaman,
  transaksi,
} from "../../../platform/db/skema";
import { jatuhTempoTempoan } from "../../../platform/db/tempo";
import type { Aktor } from "../../../platform/http/aktor";
import { jumlah, type Konteks } from "./data";

/** Setoran murni per tanggal untuk satu jenis (catatan berlaku, menurut pencatat). */
async function setoranMurniPer(
  k: Konteks,
  aktor: Aktor,
  jenis: "harian" | "mingguan" | "tempoan",
  kolektorId: string | undefined,
  mulai: string,
  selesai: string,
) {
  const baris = await k.db
    .select({ tanggal: transaksi.tanggal, murni: jumlah(transaksi.setoranMurni) })
    .from(transaksi)
    .innerJoin(pinjaman, eq(pinjaman.id, transaksi.pinjamanId))
    .where(
      and(
        eq(transaksi.kantorId, aktor.kantorId),
        between(transaksi.tanggal, mulai, selesai),
        isNull(transaksi.dibatalkanAt),
        eq(pinjaman.jenis, jenis),
        kolektorId ? eq(transaksi.pencatatId, kolektorId) : undefined,
      ),
    )
    .groupBy(transaksi.tanggal);
  return new Map(baris.map((b) => [b.tanggal as string, b.murni]));
}

/** Deret harian N1: patokan dari potret kemarin dikurangi angsuran yang mati hari itu. */
export async function performaHarian(
  k: Konteks,
  aktor: Aktor,
  kolektorId: string | undefined,
  mulai: string,
  selesai: string,
) {
  const murniPer = await setoranMurniPer(k, aktor, "harian", kolektorId, mulai, selesai);
  const potret = await k.db
    .select({ tanggal: posisiHarian.tanggal, angsuran: jumlah(posisiHarian.angsuranBerjalan) })
    .from(posisiHarian)
    .where(
      and(
        eq(posisiHarian.kantorId, aktor.kantorId),
        eq(posisiHarian.jenis, "harian"),
        between(posisiHarian.tanggal, geserTanggal(mulai, -1), geserTanggal(selesai, -1)),
        kolektorId ? eq(posisiHarian.kolektorId, kolektorId) : undefined,
      ),
    )
    .groupBy(posisiHarian.tanggal);
  const mati = await k.db
    .select({ tanggal: pinjaman.tanggalSelesai, angsuran: jumlah(pinjaman.angsuran) })
    .from(pinjaman)
    .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
    .where(
      and(
        eq(pinjaman.kantorId, aktor.kantorId),
        eq(pinjaman.jenis, "harian"),
        inArray(pinjaman.status, ["lunas", "digulung", "diputihkan"]),
        between(pinjaman.tanggalSelesai, mulai, selesai),
        kolektorId ? eq(nasabah.kolektorId, kolektorId) : undefined,
      ),
    )
    .groupBy(pinjaman.tanggalSelesai);

  const peta = <T extends { tanggal: string | null }>(b: T[], f: (x: T) => number) =>
    new Map(b.map((x) => [x.tanggal as string, f(x)]));
  const potretPer = peta(potret, (x) => x.angsuran);
  const matiPer = peta(mati, (x) => x.angsuran);
  const deret = [];
  for (let t = mulai; t <= selesai; t = geserTanggal(t, 1)) {
    const setoranMurni = murniPer.get(t) ?? 0;
    const kemarin = potretPer.get(geserTanggal(t, -1)) ?? null;
    deret.push({
      tanggal: t,
      setoranMurni,
      ...hitungPerforma(setoranMurni, kemarin, matiPer.get(t) ?? 0),
    });
  }
  return deret;
}

/**
 * Deret mingguan & tempoan N3: patokan = angsuran yang jatuh tagih pada hari itu
 * (berjalan pada akhir kemarin, tidak berakhir digulung/diputihkan hari itu).
 * Status akhir kemarin dari `riwayat_status_pinjaman`, bukan potret.
 */
export async function performaPeriodik(
  k: Konteks,
  aktor: Aktor,
  jenis: "mingguan" | "tempoan",
  kolektorId: string | undefined,
  mulai: string,
  selesai: string,
) {
  const murniPer = await setoranMurniPer(k, aktor, jenis, kolektorId, mulai, selesai);
  // Yang relevan: lahir sebelum hari terakhir dan belum selesai sebelum hari pertama.
  const kondisi = and(
    eq(pinjaman.kantorId, aktor.kantorId),
    eq(pinjaman.jenis, jenis),
    kolektorId ? eq(nasabah.kolektorId, kolektorId) : undefined,
    lt(pinjaman.tanggalAkad, selesai),
    or(isNull(pinjaman.tanggalSelesai), gte(pinjaman.tanggalSelesai, mulai)),
  );
  const pinjamanRelevan = await k.db
    .select({
      id: pinjaman.id,
      angsuran: pinjaman.angsuran,
      tanggalAkad: pinjaman.tanggalAkad,
      tenor: pinjaman.tenor,
      jatuhTempo: jatuhTempoTempoan(),
      status: pinjaman.status,
      tanggalSelesai: pinjaman.tanggalSelesai,
    })
    .from(pinjaman)
    .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
    .where(kondisi);
  const perpindahan = await k.db
    .select({
      pinjamanId: riwayatStatusPinjaman.pinjamanId,
      tanggal: riwayatStatusPinjaman.tanggal,
      sesudah: riwayatStatusPinjaman.statusSesudah,
    })
    .from(riwayatStatusPinjaman)
    .where(
      inArray(
        riwayatStatusPinjaman.pinjamanId,
        k.db
          .select({ id: pinjaman.id })
          .from(pinjaman)
          .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
          .where(kondisi),
      ),
    )
    .orderBy(asc(riwayatStatusPinjaman.dibuatAt));
  const riwayatPer = new Map<string, PerpindahanStatus[]>();
  for (const r of perpindahan) {
    const daftar = riwayatPer.get(r.pinjamanId) ?? [];
    daftar.push({ tanggal: r.tanggal, sesudah: r.sesudah });
    riwayatPer.set(r.pinjamanId, daftar);
  }
  const bahan: BahanPatokan[] = pinjamanRelevan.map((p) => ({
    jenis,
    angsuran: p.angsuran,
    tanggalAkad: p.tanggalAkad,
    tenor: p.tenor,
    jatuhTempo: p.jatuhTempo,
    status: p.status,
    tanggalSelesai: p.tanggalSelesai,
    riwayat: riwayatPer.get(p.id) ?? [],
  }));

  const deret = [];
  for (let t = mulai; t <= selesai; t = geserTanggal(t, 1)) {
    const setoranMurni = murniPer.get(t) ?? 0;
    const patokan = patokanJatuhTagih(bahan, t);
    deret.push({
      tanggal: t,
      setoranMurni,
      patokan,
      persentase: persentasePerforma(setoranMurni, patokan),
    });
  }
  return deret;
}
