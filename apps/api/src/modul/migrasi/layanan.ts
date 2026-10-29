import type { HasilMigrasi, MigrasiInput, NasabahBaruInput } from "@opennael/contracts";
import { syaratMigrasi } from "@opennael/domain";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "../../platform/db/klien";
import { nasabah, pengguna, pinjaman } from "../../platform/db/skema";
import type { Aktor } from "../../platform/http/aktor";
import { bentrok, melanggar, tidakDitemukan } from "../../platform/http/galat";
import { wajibPeran } from "../../platform/http/peran";
import { bacaKalender } from "../kantor";
import { daftarkanNasabahBaru, pinjamanKeBerikut } from "../pembiayaan";

/**
 * SALINAN MIGRASI (bos, aturan-usaha A10) — pinjaman yang masih berjalan di
 * buku lama disalin tanpa uang keluar: tanpa foto, tanpa rem, tanpa gerbang
 * lapangan. Total kembali & angsuran dihitung seperti akad baru; saldo awal =
 * sisa saldo di buku; tabungan pembuka masuk tabungan nasabah.
 */
export interface MigrasiDeps {
  db: Db;
  sekarang?: () => Date;
}

export function buatLayananMigrasi(deps: MigrasiDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());

  return {
    async salin(aktor: Aktor, input: MigrasiInput): Promise<HasilMigrasi> {
      wajibPeran(aktor, "bos");
      const { tanggal } = await bacaKalender(deps.db, aktor.kantorId, sekarang());
      if (input.tanggalAkad > tanggal) {
        throw melanggar("TANGGAL_AKAD_DEPAN", "Tanggal akad di buku tidak boleh sesudah hari ini");
      }
      const syarat = syaratMigrasi(
        input.jenis,
        input.pokok,
        input.tenor,
        input.saldo,
        input.tabungan,
      );

      return deps.db.transaction(async (tx) => {
        // Nasabah lama tetap pada pemegangnya; orang baru dipegang kolektor pilihan bos.
        let lama: { id: string; pemegang: string } | null = null;
        if ("nasabahId" in input.nasabah) {
          const [n] = await tx
            .select({
              id: nasabah.id,
              pemegang: nasabah.kolektorId,
              diblokirAt: nasabah.diblokirAt,
            })
            .from(nasabah)
            .where(
              and(eq(nasabah.id, input.nasabah.nasabahId), eq(nasabah.kantorId, aktor.kantorId)),
            )
            .for("update")
            .limit(1);
          if (!n) throw tidakDitemukan("NASABAH_TIDAK_DITEMUKAN", "Nasabah tidak ditemukan");
          if (n.diblokirAt) throw melanggar("NASABAH_DIBLOKIR", "Nasabah ini diblokir");
          const [aktif] = await tx
            .select({ id: pinjaman.id })
            .from(pinjaman)
            .where(
              and(eq(pinjaman.nasabahId, n.id), inArray(pinjaman.status, ["berjalan", "macet"])),
            )
            .limit(1);
          if (aktif) {
            throw bentrok("PINJAMAN_MASIH_AKTIF", "Nasabah ini masih punya pinjaman aktif");
          }
          lama = { id: n.id, pemegang: n.pemegang };
        }
        const kolektorId = lama?.pemegang ?? input.kolektorId;
        if (!kolektorId) {
          throw melanggar("KOLEKTOR_WAJIB", "Pilih kolektor pemegang untuk nasabah baru");
        }

        const [k] = await tx
          .select({ nama: pengguna.nama })
          .from(pengguna)
          .where(
            and(
              eq(pengguna.id, kolektorId),
              eq(pengguna.kantorId, aktor.kantorId),
              eq(pengguna.peran, "kolektor"),
              isNull(pengguna.dinonaktifkanAt),
            ),
          )
          .limit(1);
        if (!k) throw tidakDitemukan("KOLEKTOR_TIDAK_DITEMUKAN", "Kolektor aktif tidak ditemukan");

        const baru = lama === null;
        const nasabahId =
          lama?.id ??
          (await daftarkanNasabahBaru(tx, aktor, input.nasabah as NasabahBaruInput, kolektorId));

        const berikut = await pinjamanKeBerikut(tx, nasabahId);
        const pinjamanKe = input.pinjamanKe ?? berikut;
        if (pinjamanKe < berikut) {
          throw melanggar(
            "PINJAMAN_KE_TERPAKAI",
            `Nomor pinjaman ${pinjamanKe} sudah terpakai — paling kecil ${berikut}`,
          );
        }
        const status = input.macet ? ("macet" as const) : ("berjalan" as const);

        const [p] = await tx
          .insert(pinjaman)
          .values({
            kantorId: aktor.kantorId,
            pencairId: kolektorId,
            dibuatOleh: aktor.penggunaId,
            nasabahId,
            pinjamanKe,
            jenis: syarat.jenis,
            tenor: syarat.tenor,
            asal: "migrasi",
            tanggalAkad: input.tanggalAkad,
            tanggalDisalin: tanggal,
            tanggalMacet: input.macet ? tanggal : null,
            pokok: syarat.pokok,
            potonganAdmin: 0,
            tabunganMasuk: syarat.tabunganMasuk,
            pencairan: 0,
            totalKembali: syarat.totalKembali,
            angsuran: syarat.angsuran,
            saldoAwal: syarat.saldoAwal,
            dropBaru: 0,
            saldo: syarat.saldoAwal,
            status,
          })
          .returning({ id: pinjaman.id });
        if (!p) throw new Error("gagal menyalin pinjaman");
        const [n] = await tx
          .update(nasabah)
          .set({ saldoTabungan: sql`${nasabah.saldoTabungan} + ${syarat.tabunganMasuk}` })
          .where(eq(nasabah.id, nasabahId))
          .returning({ nama: nasabah.nama });

        return {
          id: p.id,
          nasabah: { id: nasabahId, nama: n?.nama ?? "", baru },
          kolektor: { id: kolektorId, nama: k.nama },
          pinjamanKe,
          jenis: syarat.jenis,
          tenor: syarat.tenor,
          pokok: syarat.pokok,
          totalKembali: syarat.totalKembali,
          angsuran: syarat.angsuran,
          angsuranKe: syarat.angsuranKe,
          saldo: syarat.saldoAwal,
          tabunganMasuk: syarat.tabunganMasuk,
          status,
          tanggalAkad: input.tanggalAkad,
          tanggalDisalin: tanggal,
        };
      });
    },
  };
}

export type LayananMigrasi = ReturnType<typeof buatLayananMigrasi>;
