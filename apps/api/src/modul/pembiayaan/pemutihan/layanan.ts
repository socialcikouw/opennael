import type { BatalInput, PutihkanInput } from "@opennael/contracts";
import { and, eq, ne, sql } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { nasabah, pinjaman } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { bentrok, melanggar, tidakDitemukan } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { catatRiwayat } from "../../../platform/riwayat";
import { bacaKalender } from "../../kantor";

/**
 * PEMUTIHAN (bos, aturan-usaha K):
 *
 *   putihkan       : status diputihkan, saldo & tabungan tak disentuh, tanpa
 *                    transaksi; tanggal macet tetap tersimpan; nasabah diblokir
 *   batal putihkan : kembali macet (bila tanggal macet tersimpan) atau
 *                    berjalan; blokir dibuka bila itu pemutihan terakhirnya
 *   buka blokir    : bos membuka blokir nasabah
 *
 * Riwayat (data ditimpa): blokir & buka blokir nasabah, batal pemutihan.
 * Pemutihan sendiri berjejak di kolom `diputihkan_*` pinjamannya.
 */
export interface PemutihanDeps {
  db: Db;
  sekarang?: () => Date;
}

const LABEL_ALASAN = { macet_lama: "macet lama", meninggal: "meninggal", lainnya: "lainnya" };

export function buatLayananPemutihan(deps: PemutihanDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const hariIni = async (aktor: Aktor) =>
    (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal;

  async function kunciPinjaman(tx: Db, aktor: Aktor, id: string) {
    const [p] = await tx
      .select()
      .from(pinjaman)
      .where(and(eq(pinjaman.id, id), eq(pinjaman.kantorId, aktor.kantorId)))
      .for("update");
    if (!p) throw tidakDitemukan("PINJAMAN_TIDAK_DITEMUKAN", "Pinjaman tidak ditemukan");
    return p;
  }

  async function kunciNasabah(tx: Db, aktor: Aktor, id: string) {
    const [n] = await tx
      .select({
        id: nasabah.id,
        diblokirAt: nasabah.diblokirAt,
        diblokirOleh: nasabah.diblokirOleh,
        alasanBlokir: nasabah.alasanBlokir,
      })
      .from(nasabah)
      .where(and(eq(nasabah.id, id), eq(nasabah.kantorId, aktor.kantorId)))
      .for("update");
    if (!n) throw tidakDitemukan("NASABAH_TIDAK_DITEMUKAN", "Nasabah tidak ditemukan");
    return n;
  }

  /** Buka blokir + catat nilai lamanya di riwayat. */
  async function bukaBlokir(
    tx: Db,
    aktor: Aktor,
    n: Awaited<ReturnType<typeof kunciNasabah>>,
    aksi: string,
    alasan: string,
  ) {
    await tx
      .update(nasabah)
      .set({ diblokirAt: null, diblokirOleh: null, alasanBlokir: null })
      .where(eq(nasabah.id, n.id));
    await catatRiwayat(tx, {
      kantorId: aktor.kantorId,
      tabel: "nasabah",
      barisId: n.id,
      aksi,
      sebelum: {
        diblokirAt: n.diblokirAt?.toISOString() ?? null,
        diblokirOleh: n.diblokirOleh,
        alasanBlokir: n.alasanBlokir,
      },
      sesudah: { diblokirAt: null },
      alasan,
      pelakuId: aktor.penggunaId,
    });
  }

  const keNasabah = async (tx: Db, id: string) => {
    const [n] = await tx
      .select({
        id: nasabah.id,
        diblokirAt: nasabah.diblokirAt,
        alasanBlokir: nasabah.alasanBlokir,
      })
      .from(nasabah)
      .where(eq(nasabah.id, id));
    if (!n) throw new Error("nasabah hilang");
    return { id: n.id, diblokir: n.diblokirAt !== null, alasanBlokir: n.alasanBlokir };
  };

  return {
    /** Putihkan pinjaman aktif (bos) — nasabah diblokir. */
    async putihkan(aktor: Aktor, id: string, input: PutihkanInput) {
      wajibPeran(aktor, "bos");
      const tanggal = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
        const p = await kunciPinjaman(tx, aktor, id);
        if (p.status === "diputihkan") {
          throw bentrok("SUDAH_DIPUTIHKAN", "Pinjaman ini sudah diputihkan");
        }
        if (p.status !== "berjalan" && p.status !== "macet") {
          throw melanggar("PINJAMAN_SUDAH_SELESAI", "Hanya pinjaman aktif yang bisa diputihkan");
        }
        const n = await kunciNasabah(tx, aktor, p.nasabahId);
        const [baru] = await tx
          .update(pinjaman)
          .set({
            status: "diputihkan",
            tanggalSelesai: tanggal,
            diputihkanAt: sekarang(),
            diputihkanOleh: aktor.penggunaId,
            alasanPemutihan: input.alasan,
            keteranganPemutihan: input.keterangan,
          })
          .where(eq(pinjaman.id, p.id))
          .returning();
        if (!baru) throw new Error("pinjaman hilang");
        if (!n.diblokirAt) {
          const alasanBlokir = `Pinjaman ke-${p.pinjamanKe} diputihkan (${LABEL_ALASAN[input.alasan]})`;
          await tx
            .update(nasabah)
            .set({ diblokirAt: sekarang(), diblokirOleh: aktor.penggunaId, alasanBlokir })
            .where(eq(nasabah.id, n.id));
          await catatRiwayat(tx, {
            kantorId: aktor.kantorId,
            tabel: "nasabah",
            barisId: n.id,
            aksi: "blokir",
            sebelum: { diblokirAt: null },
            sesudah: { alasanBlokir, pinjamanId: p.id },
            pelakuId: aktor.penggunaId,
          });
        }
        return {
          id: baru.id,
          status: "diputihkan" as const,
          saldo: baru.saldo,
          alasanPemutihan: baru.alasanPemutihan,
          keteranganPemutihan: baru.keteranganPemutihan,
          nasabah: await keNasabah(tx, n.id),
        };
      });
    },

    /** Batal pemutihan (bos) — status kembali; blokir dibuka bila pemutihan terakhir. */
    async batalPutihkan(aktor: Aktor, id: string, input: BatalInput) {
      wajibPeran(aktor, "bos");
      const tanggal = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
        const p = await kunciPinjaman(tx, aktor, id);
        if (p.status !== "diputihkan") {
          throw melanggar("BUKAN_DIPUTIHKAN", "Pinjaman ini tidak sedang diputihkan");
        }
        const n = await kunciNasabah(tx, aktor, p.nasabahId);
        const status = p.tanggalMacet ? ("macet" as const) : ("berjalan" as const);
        // Trigger riwayat status membaca tanggal pembukuan perpindahan ini.
        await tx.execute(sql`select set_config('nael.tanggal_pembukuan', ${tanggal}, true)`);
        const [baru] = await tx
          .update(pinjaman)
          .set({
            status,
            tanggalSelesai: null,
            diputihkanAt: null,
            diputihkanOleh: null,
            alasanPemutihan: null,
            keteranganPemutihan: null,
          })
          .where(eq(pinjaman.id, p.id))
          .returning();
        await tx.execute(sql`select set_config('nael.tanggal_pembukuan', '', true)`);
        if (!baru) throw new Error("pinjaman hilang");
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "pinjaman",
          barisId: p.id,
          aksi: "batal_pemutihan",
          sebelum: {
            diputihkanAt: p.diputihkanAt?.toISOString() ?? null,
            diputihkanOleh: p.diputihkanOleh,
            alasanPemutihan: p.alasanPemutihan,
            keteranganPemutihan: p.keteranganPemutihan,
            tanggalSelesai: p.tanggalSelesai,
          },
          sesudah: { status },
          alasan: input.alasan,
          pelakuId: aktor.penggunaId,
        });
        // K3: blokir dibuka bila tak ada pemutihan lain milik nasabah ini.
        const [lain] = await tx
          .select({ id: pinjaman.id })
          .from(pinjaman)
          .where(
            and(
              eq(pinjaman.nasabahId, n.id),
              eq(pinjaman.status, "diputihkan"),
              ne(pinjaman.id, p.id),
            ),
          )
          .limit(1);
        if (!lain && n.diblokirAt) await bukaBlokir(tx, aktor, n, "buka_blokir", input.alasan);
        return {
          id: baru.id,
          status,
          saldo: baru.saldo,
          alasanPemutihan: null,
          keteranganPemutihan: null,
          nasabah: await keNasabah(tx, n.id),
        };
      });
    },

    /** Buka blokir nasabah (bos). */
    async bukaBlokir(aktor: Aktor, nasabahId: string, input: BatalInput) {
      wajibPeran(aktor, "bos");
      return deps.db.transaction(async (tx) => {
        const n = await kunciNasabah(tx, aktor, nasabahId);
        if (!n.diblokirAt) throw melanggar("TIDAK_DIBLOKIR", "Nasabah ini tidak diblokir");
        await bukaBlokir(tx, aktor, n, "buka_blokir", input.alasan);
        return keNasabah(tx, n.id);
      });
    },
  };
}

export type LayananPemutihan = ReturnType<typeof buatLayananPemutihan>;
