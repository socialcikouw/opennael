import type { BukaKasInput } from "@opennael/contracts";
import { bukuKas } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { bentrok } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { bacaBuku, type Konteks, keBuku } from "../data";

export function buatBukaKas(k: Konteks) {
  /** Buka buku kas (bos, sekali) — tanggal buka = hari ini. */
  return async function bukaKas(aktor: Aktor, input: BukaKasInput) {
    wajibPeran(aktor, "bos");
    const tanggal = await k.hariIni(aktor);
    if (await bacaBuku(k.db, aktor.kantorId)) {
      throw bentrok("BUKU_KAS_SUDAH_DIBUKA", "Buku kas kantor sudah dibuka");
    }
    const [b] = await k.db
      .insert(bukuKas)
      .values({
        kantorId: aktor.kantorId,
        tanggalBuka: tanggal,
        kasAwalTunai: input.tunai,
        kasAwalBank: input.bank,
        dibukaOleh: aktor.penggunaId,
      })
      .returning();
    if (!b) throw new Error("buku kas tak tersimpan");
    return keBuku(b);
  };
}
