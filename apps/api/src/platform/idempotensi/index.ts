import { createHash } from "node:crypto";
import { kunciIdempotenSchema } from "@opennael/contracts";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../../db/klien";
import { operasiIdempoten } from "../../db/skema";
import { bentrok, GalatApp } from "../../galat";
import type { Aktor } from "../../modul/auth/token";

/** Urutan properti JSON tidak mengubah identitas input. */
function kanonik(isi: unknown): unknown {
  if (Array.isArray(isi)) return isi.map(kanonik);
  if (isi && typeof isi === "object") {
    return Object.fromEntries(
      Object.entries(isi)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, kanonik(v)]),
    );
  }
  return isi;
}

export async function jalankanIdempoten<T>(
  db: Db,
  aktor: Aktor,
  kunci: string | undefined,
  operasi: string,
  isi: unknown,
  kerjakan: (tx: Db) => Promise<T>,
): Promise<T> {
  if (kunci === undefined) return kerjakan(db);
  if (!kunciIdempotenSchema.safeParse(kunci).success) {
    throw new GalatApp(400, "KUNCI_IDEMPOTEN_TIDAK_SAH", "Idempotency-Key harus berupa UUID");
  }
  const baku = kunci.toLowerCase();
  const sidikIsi = createHash("sha256")
    .update(JSON.stringify(kanonik({ peran: aktor.peran, isi })))
    .digest("hex");
  return db.transaction(async (tx) => {
    // Lock transaksi, aman pada pooler Supabase. Tabrakan hash hanya mengantrekan
    // operasi tak terkait; identitas sebenarnya tetap diperiksa pada tabel.
    const lingkup = `${aktor.kantorId}:${aktor.penggunaId}:${baku}`;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lingkup}, 0))`);
    const [lama] = await tx
      .select()
      .from(operasiIdempoten)
      .where(
        and(
          eq(operasiIdempoten.kantorId, aktor.kantorId),
          eq(operasiIdempoten.penggunaId, aktor.penggunaId),
          eq(operasiIdempoten.kunci, baku),
        ),
      );
    if (lama) {
      if (lama.operasi !== operasi || lama.sidikIsi !== sidikIsi) {
        throw bentrok(
          "KUNCI_IDEMPOTEN_BERBEDA",
          "Kunci ini sudah dipakai untuk operasi atau isi berbeda",
        );
      }
      return lama.hasil as T;
    }
    const hasil = await kerjakan(tx);
    // Simpan representasi wire, sehingga tanggal/undefined konsisten saat replay.
    const jawaban = JSON.parse(JSON.stringify(hasil)) as T;
    await tx.insert(operasiIdempoten).values({
      kantorId: aktor.kantorId,
      penggunaId: aktor.penggunaId,
      kunci: baku,
      operasi,
      sidikIsi,
      hasil: jawaban,
    });
    return jawaban;
  });
}

/** Adapter HTTP: mutasi terpilih memakai layanan baru dengan transaksi yang sama.
 * Bacaan dan klien lama tetap memakai layanan biasa. Tidak ada konteks global.
 */
export function denganIdempotensi<T extends object>(
  db: Db,
  nama: string,
  buat: (db: Db) => T,
  mutasi: readonly (keyof T & string)[],
): (kunci?: string) => T {
  const biasa = buat(db);
  return (kunci) => {
    if (kunci === undefined) return biasa;
    const layanan = { ...biasa };
    for (const metode of mutasi) {
      const panggil = (aktor: Aktor, ...args: unknown[]) =>
        jalankanIdempoten(db, aktor, kunci, `${nama}/${metode}`, args, (tx) => {
          const fungsi = buat(tx)[metode] as (aktor: Aktor, ...args: unknown[]) => Promise<unknown>;
          return fungsi(aktor, ...args);
        });
      // Tipe publik tetap persis layanan asal; hanya implementasinya dibungkus.
      Object.assign(layanan, { [metode]: panggil });
    }
    return layanan;
  };
}
