import type { KartuPinjaman } from "@opennael/contracts";
import {
  type BarisRem,
  gabungRem,
  geserTanggal,
  mulaiDitagih,
  posisiTagih,
} from "@opennael/domain";
import { and, count, eq, inArray, lt } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { kebijakan, liburNasabah } from "../../../platform/db/skema";
import { bacaKalender, hariTagihAntara, kolomRem } from "../../kantor";
import { aktif, type Baris, type Konteks } from "./baris";
import { keKartu } from "./data";

/** Baris → kartu: posisi tagih (B5) & kunci gulung untuk yang aktif. */
export async function keKartuSemua(
  k: Konteks,
  db: Db,
  kantorId: string,
  baris: Baris[],
): Promise<KartuPinjaman[]> {
  const { tanggal: hariIni } = await bacaKalender(db, kantorId, k.sekarang());
  const kemarin = geserTanggal(hariIni, -1);
  const berjalan = baris.filter((b) => aktif(b.status));

  // Hari tagih kantor s/d kemarin sejak mulai ditagih paling awal (harian).
  // Tanggal teks YYYY-MM-DD: urut leksikal = urut waktu.
  const [mulaiTerawal] = berjalan
    .filter((b) => b.jenis === "harian")
    .map((b) => mulaiDitagih(b))
    .sort();
  const hariTagih = mulaiTerawal ? await hariTagihAntara(db, kantorId, mulaiTerawal, kemarin) : [];
  const ids = berjalan.map((b) => b.id);
  const libur = new Map<string, number>();
  const rem: BarisRem[] = [];
  if (ids.length > 0) {
    const hitung = await db
      .select({ pinjamanId: liburNasabah.pinjamanId, banyak: count() })
      .from(liburNasabah)
      .where(and(inArray(liburNasabah.pinjamanId, ids), lt(liburNasabah.tanggal, hariIni)))
      .groupBy(liburNasabah.pinjamanId);
    for (const h of hitung) libur.set(h.pinjamanId, h.banyak);
    rem.push(
      ...(await db.select(kolomRem).from(kebijakan).where(eq(kebijakan.kantorId, kantorId))),
    );
  }

  return baris.map((b) => {
    const { kolektorId, kolektorNama, tanggalSelesai, tanggalDisalin, saldoAwal, ...k } = b;
    const kartu = {
      ...keKartu(k),
      kolektor: { id: kolektorId, nama: kolektorNama },
      tanggalSelesai,
    };
    if (!aktif(b.status)) return { ...kartu, tagih: null, kunciGulung: null };
    const mulai = mulaiDitagih(b);
    const r = gabungRem(rem, { kolektorId, nasabahId: b.nasabahId });
    return {
      ...kartu,
      tagih: posisiTagih(
        {
          ...b,
          tanggalDisalin,
          saldoAwal,
          hariTagihLewat: b.jenis === "harian" ? hariTagih.filter((t) => t >= mulai).length : 0,
          liburLewat: libur.get(b.id) ?? 0,
        },
        hariIni,
      ),
      kunciGulung: {
        gulung: r.gulung,
        naik: r.naik,
        alasan: r.gulung ? r.alasan("gulung") : r.naik ? r.alasan("naik") : null,
      },
    };
  });
}
