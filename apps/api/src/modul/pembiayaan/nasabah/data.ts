import type { NasabahBaruInput } from "@opennael/contracts";
import { kunciWilayah } from "@opennael/domain";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { nasabah } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { bentrok, melanggar } from "../../../platform/http/galat";
import { pastikanWilayah } from "../../kantor";

export async function daftarkanNasabahBaru(
  tx: Db,
  aktor: Aktor,
  baru: NasabahBaruInput,
  kolektorId: string,
): Promise<string> {
  if (baru.nik) {
    const [sama] = await tx
      .select({ diblokirAt: nasabah.diblokirAt })
      .from(nasabah)
      .where(and(eq(nasabah.kantorId, aktor.kantorId), eq(nasabah.nik, baru.nik)))
      .limit(1);
    if (sama) {
      throw sama.diblokirAt
        ? melanggar("NASABAH_DIBLOKIR", "Pemilik NIK ini nasabah yang diblokir")
        : bentrok("NIK_SUDAH_TERDAFTAR", "NIK ini sudah terdaftar — pilih nasabah lamanya");
    }
  }
  const wilayahId = await pastikanWilayah(tx, aktor, baru.kampung);
  const kunciNama = kunciWilayah(baru.nama);
  const [mirip] = await tx
    .select({ nik: nasabah.nik })
    .from(nasabah)
    .where(
      and(
        eq(nasabah.kantorId, aktor.kantorId),
        eq(nasabah.wilayahId, wilayahId),
        sql`lower(btrim(regexp_replace(${nasabah.nama}, '\\s+', ' ', 'g'))) = ${kunciNama}`,
        sql`${nasabah.diblokirAt} IS NOT NULL`,
      ),
    )
    .limit(1);
  if (mirip && !(baru.nik && mirip.nik && mirip.nik !== baru.nik)) {
    throw melanggar(
      "NASABAH_MIRIP_DIBLOKIR",
      "Ada nasabah diblokir dengan nama & kampung yang sama — hubungi bos",
    );
  }
  const [n] = await tx
    .insert(nasabah)
    .values({
      kantorId: aktor.kantorId,
      kolektorId,
      nama: baru.nama,
      wilayahId,
      nik: baru.nik ?? null,
      nomorHp: baru.nomorHp ?? null,
    })
    .returning({ id: nasabah.id });
  if (!n) throw new Error("gagal mencatat nasabah");
  return n.id;
}
