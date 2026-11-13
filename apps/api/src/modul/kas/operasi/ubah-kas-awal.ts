import type { UbahKasAwalInput } from "@opennael/contracts";
import { eq } from "drizzle-orm";
import { bukuKas } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { bukuKasBelumDibuka, melanggar } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { catatRiwayat } from "../../../platform/riwayat";
import { bacaBuku, type Konteks, keBuku } from "../data";

export function buatUbahKasAwal(k: Konteks) {
  /** Betulkan kas awal (bos) — hanya di hari pembukaan; dicatat di riwayat. */
  return async function ubahKasAwal(aktor: Aktor, input: UbahKasAwalInput) {
    wajibPeran(aktor, "bos");
    const tanggal = await k.hariIni(aktor);
    return k.db.transaction(async (tx) => {
      const b = await bacaBuku(tx, aktor.kantorId, true);
      if (!b) throw bukuKasBelumDibuka();
      if (b.tanggalBuka !== tanggal) {
        throw melanggar(
          "BATAL_HANYA_HARI_INI",
          "Kas awal hanya bisa dibetulkan di hari pembukaan — sesudahnya lewat mutasi lain-lain",
        );
      }
      const sesudah = {
        kasAwalTunai: input.tunai ?? b.kasAwalTunai,
        kasAwalBank: input.bank ?? b.kasAwalBank,
      };
      const [baru] = await tx
        .update(bukuKas)
        .set(sesudah)
        .where(eq(bukuKas.kantorId, aktor.kantorId))
        .returning();
      if (!baru) throw new Error("buku kas hilang");
      await catatRiwayat(tx, {
        kantorId: aktor.kantorId,
        tabel: "buku_kas",
        barisId: aktor.kantorId,
        aksi: "ubah_kas_awal",
        sebelum: { kasAwalTunai: b.kasAwalTunai, kasAwalBank: b.kasAwalBank },
        sesudah,
        pelakuId: aktor.penggunaId,
      });
      return keBuku(baru);
    });
  };
}
