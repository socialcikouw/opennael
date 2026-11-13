import { and, eq, gte, inArray, lt, ne } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { nasabah, pinjaman, riwayatPerubahan } from "../../../platform/db/skema";
import { bacaOrang, type Kejadian, LABEL_AKSI, SASARAN_PENGGUNA } from "./data";

/** Jejak riwayat dalam rentang waktu → kejadian, dengan nama sasaran bila dikenal. */
export async function dariRiwayat(
  db: Db,
  kantorId: string,
  mulai: Date,
  selesai: Date,
  bos: boolean,
) {
  const jejak = await db
    .select({
      id: riwayatPerubahan.id,
      tabel: riwayatPerubahan.tabel,
      barisId: riwayatPerubahan.barisId,
      aksi: riwayatPerubahan.aksi,
      alasan: riwayatPerubahan.alasanPerubahan,
      pelakuId: riwayatPerubahan.pelakuId,
      waktu: riwayatPerubahan.dibuatAt,
    })
    .from(riwayatPerubahan)
    .where(
      and(
        eq(riwayatPerubahan.kantorId, kantorId),
        gte(riwayatPerubahan.dibuatAt, mulai),
        lt(riwayatPerubahan.dibuatAt, selesai),
        bos ? undefined : ne(riwayatPerubahan.tabel, "buku_kas"),
      ),
    );
  const idDari = (tabel: string) => [
    ...new Set(jejak.filter((j) => j.tabel === tabel).map((j) => j.barisId)),
  ];
  const idPengguna = [
    ...new Set(jejak.filter((j) => SASARAN_PENGGUNA.has(j.tabel)).map((j) => j.barisId)),
  ];
  const nama = new Map<string, string>();
  for (const [id, o] of await bacaOrang(db, kantorId, idPengguna)) nama.set(id, o.nama);
  const idNasabah = idDari("nasabah");
  if (idNasabah.length) {
    const baris = await db
      .select({ id: nasabah.id, nama: nasabah.nama })
      .from(nasabah)
      .where(and(eq(nasabah.kantorId, kantorId), inArray(nasabah.id, idNasabah)));
    for (const b of baris) nama.set(b.id, b.nama);
  }
  const idPinjaman = idDari("pinjaman");
  if (idPinjaman.length) {
    const baris = await db
      .select({ id: pinjaman.id, nama: nasabah.nama })
      .from(pinjaman)
      .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
      .where(and(eq(pinjaman.kantorId, kantorId), inArray(pinjaman.id, idPinjaman)));
    for (const b of baris) nama.set(b.id, b.nama);
  }
  return jejak.map(
    (j): Kejadian => ({
      waktu: j.waktu,
      pelakuId: j.pelakuId,
      kejadian: j.aksi,
      ringkasan: [LABEL_AKSI[j.aksi] ?? j.aksi.replaceAll("_", " "), nama.get(j.barisId)]
        .filter(Boolean)
        .join(" "),
      nominal: null,
      alasan: j.alasan,
      rujukan: { tabel: j.tabel, id: j.barisId },
    }),
  );
}
