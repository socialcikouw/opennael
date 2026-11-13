import type { RincianPinjaman } from "@opennael/contracts";
import {
  ATURAN_MACET,
  awalJendelaMacet,
  geserTanggal,
  mulaiDitagih,
  nilaiMacet,
  tanggalMasukPembukuan,
} from "@opennael/domain";
import { and, between, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { pinjaman, transaksi } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { tidakDitemukan } from "../../../platform/http/galat";
import { bacaKalender, hariTagihAntara } from "../../kantor";
import { aktif, type Baris, bolehBaca, type Konteks, pencair, pilih } from "./baris";
import { keKartuSemua } from "./kartu";

/** Aturan macet (F) dengan jendela 30 hari yang berakhir hari ini. */
async function aturanMacet(
  k: Konteks,
  db: Db,
  kantorId: string,
  p: {
    id: string;
    jenis: Baris["jenis"];
    status: "berjalan" | "macet";
    angsuran: number;
    tanggalAkad: string;
    tanggalDisalin: string | null;
    jatuhTempo: string | null;
  },
): Promise<RincianPinjaman["aturanMacet"]> {
  const { tanggal: hariIni } = await bacaKalender(db, kantorId, k.sekarang());
  const awal = awalJendelaMacet(hariIni);
  const [s] = await db
    .select({ murni: sql<number>`coalesce(sum(${transaksi.setoranMurni}), 0)`.mapWith(Number) })
    .from(transaksi)
    .where(
      and(
        eq(transaksi.pinjamanId, p.id),
        between(transaksi.tanggal, awal, hariIni),
        isNull(transaksi.dibatalkanAt),
      ),
    );
  const setoranJendela = s?.murni ?? 0;
  const mulai = mulaiDitagih(p);
  const hariTagih =
    p.jenis === "harian"
      ? (await hariTagihAntara(db, kantorId, [mulai, awal].sort()[1] ?? awal, hariIni)).length
      : null;
  const hasil = nilaiMacet(
    {
      jenis: p.jenis,
      status: p.status,
      angsuran: p.angsuran,
      tanggalMasuk: tanggalMasukPembukuan(p),
      jatuhTempo: p.jatuhTempo,
      hariTagih: hariTagih ?? 0,
      setoranMurni: setoranJendela,
    },
    hariIni,
  );
  const batasTempoan =
    p.jenis === "tempoan"
      ? geserTanggal(p.jatuhTempo ?? p.tanggalAkad, ATURAN_MACET.tempoan.tenggangHari)
      : null;
  return {
    jendelaAwal: awal,
    jendelaAkhir: hariIni,
    setoranJendela,
    ambang:
      p.jenis === "harian"
        ? p.angsuran * ATURAN_MACET.harian.ambangAngsuran
        : p.jenis === "mingguan"
          ? p.angsuran * ATURAN_MACET.mingguan.ambangAngsuran
          : null,
    hariTagih,
    batasTempoan,
    dievaluasi: hasil.dievaluasi,
    statusMalamIni: hasil.status,
  };
}

export async function rincian(
  k: Konteks,
  db: Db,
  aktor: Aktor,
  id: string,
): Promise<RincianPinjaman> {
  const [b] = await pilih(db).where(
    and(eq(pinjaman.id, id), eq(pinjaman.kantorId, aktor.kantorId)),
  );
  if (!b) throw tidakDitemukan("PINJAMAN_TIDAK_DITEMUKAN", "Pinjaman tidak ditemukan");
  bolehBaca(aktor, b.kolektorId);
  const [kartu] = await keKartuSemua(k, db, aktor.kantorId, [b]);
  const [x] = await db
    .select({
      pencairId: pencair.id,
      pencairNama: pencair.nama,
      tanggalMacet: pinjaman.tanggalMacet,
      pinjamanAsalId: pinjaman.pinjamanAsalId,
      jenisGulung: pinjaman.jenisGulung,
      saldoLama: pinjaman.saldoLama,
      dropBaru: pinjaman.dropBaru,
      dropGulung: pinjaman.dropGulung,
      pokokBerkurang: pinjaman.pokokBerkurang,
      fotoSerahTerimaId: pinjaman.fotoSerahTerimaId,
      diputihkanAt: pinjaman.diputihkanAt,
      alasanPemutihan: pinjaman.alasanPemutihan,
      keteranganPemutihan: pinjaman.keteranganPemutihan,
      dibatalkanAt: pinjaman.dibatalkanAt,
      alasanBatal: pinjaman.alasanBatal,
    })
    .from(pinjaman)
    .innerJoin(pencair, eq(pencair.id, pinjaman.pencairId))
    .where(eq(pinjaman.id, id));
  if (!kartu || !x) throw new Error("pinjaman hilang");
  return {
    ...kartu,
    pencair: { id: x.pencairId, nama: x.pencairNama },
    tanggalDisalin: b.tanggalDisalin,
    tanggalMacet: x.tanggalMacet,
    pinjamanAsalId: x.pinjamanAsalId,
    jenisGulung: x.jenisGulung,
    saldoLama: x.saldoLama,
    saldoAwal: b.saldoAwal,
    dropBaru: x.dropBaru,
    dropGulung: x.dropGulung,
    pokokBerkurang: x.pokokBerkurang,
    fotoSerahTerimaId: x.fotoSerahTerimaId,
    pemutihan:
      x.diputihkanAt && x.alasanPemutihan
        ? {
            at: x.diputihkanAt.toISOString(),
            alasan: x.alasanPemutihan,
            keterangan: x.keteranganPemutihan,
          }
        : null,
    batal:
      x.dibatalkanAt && x.alasanBatal
        ? { at: x.dibatalkanAt.toISOString(), alasan: x.alasanBatal }
        : null,
    aturanMacet: aktif(b.status)
      ? await aturanMacet(k, db, aktor.kantorId, {
          ...b,
          status: b.status as "berjalan" | "macet",
        })
      : null,
  };
}
