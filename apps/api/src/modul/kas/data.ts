import { eq } from "drizzle-orm";
import type { Db } from "../../platform/db/klien";
import { bukuKas, type mutasiKasKantor, pencocokanKas, pengguna } from "../../platform/db/skema";
import type { Aktor } from "../../platform/http/aktor";
import { bukuKasBelumDibuka } from "../../platform/http/galat";
import { kasDiLapangan, saldoAkun } from "./saldo";

/** Pembantu privat KAS: pemeta baris, buku kas, dan saldo buku. Dipakai `kueri.ts` dan `operasi/*.ts`. */

/** Yang dibutuhkan semua kueri & operasi satu layanan: database, jam, dan "hari ini" kantor aktor. */
export interface Konteks {
  db: Db;
  sekarang: () => Date;
  hariIni: (aktor: Aktor) => Promise<string>;
}

const iso = (d: Date | null) => d?.toISOString() ?? null;

export type BarisBuku = typeof bukuKas.$inferSelect;
export const keBuku = (b: BarisBuku) => ({
  tanggalBuka: b.tanggalBuka,
  kasAwalTunai: b.kasAwalTunai,
  kasAwalBank: b.kasAwalBank,
  dibukaAt: b.dibukaAt.toISOString(),
});

type BarisMutasi = typeof mutasiKasKantor.$inferSelect;
export const keMutasi = (m: BarisMutasi) => ({
  id: m.id,
  tanggal: m.tanggal,
  jenis: m.jenis,
  dariAkun: m.dariAkun,
  keAkun: m.keAkun,
  nominal: m.nominal,
  keterangan: m.keterangan,
  dibuatAt: m.dibuatAt.toISOString(),
  dibatalkanAt: iso(m.dibatalkanAt),
  alasanBatal: m.alasanBatal,
});

export async function bacaBuku(db: Db, kantorId: string, kunci = false) {
  const pilih = db.select().from(bukuKas).where(eq(bukuKas.kantorId, kantorId));
  const [b] = kunci ? await pilih.for("update") : await pilih;
  return b ?? null;
}

export async function wajibBuku(db: Db, kantorId: string) {
  const b = await bacaBuku(db, kantorId);
  if (!b) throw bukuKasBelumDibuka();
  return b;
}

/** Yang seharusnya ada saat ini: tunai = brankas seharusnya; bank = saldo bank. */
export async function saldoBukuSekarang(db: Db, buku: BarisBuku, akun: "tunai" | "bank") {
  const saldo = await saldoAkun(db, buku);
  return akun === "bank" ? saldo.bank : saldo.tunai - (await kasDiLapangan(db, buku));
}

const kolomPencocokan = {
  id: pencocokanKas.id,
  tanggal: pencocokanKas.tanggal,
  akun: pencocokanKas.akun,
  saldoBuku: pencocokanKas.saldoBuku,
  saldoNyata: pencocokanKas.saldoNyata,
  selisih: pencocokanKas.selisih,
  keterangan: pencocokanKas.keterangan,
  olehId: pengguna.id,
  olehNama: pengguna.nama,
  dibuatAt: pencocokanKas.dibuatAt,
  dibatalkanAt: pencocokanKas.dibatalkanAt,
  alasanBatal: pencocokanKas.alasanBatal,
};
export const pilihPencocokan = (db: Db) =>
  db
    .select(kolomPencocokan)
    .from(pencocokanKas)
    .innerJoin(pengguna, eq(pengguna.id, pencocokanKas.dicocokkanOleh));
export const kePencocokan = ({
  olehId,
  olehNama,
  dibuatAt,
  dibatalkanAt,
  ...p
}: Awaited<ReturnType<ReturnType<typeof pilihPencocokan>["execute"]>>[number]) => ({
  ...p,
  dicocokkanOleh: { id: olehId, nama: olehNama },
  dibuatAt: dibuatAt.toISOString(),
  dibatalkanAt: iso(dibatalkanAt),
});
