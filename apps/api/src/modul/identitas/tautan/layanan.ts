import type { HasilKlaim, SetujuiTautanInput } from "@opennael/contracts";
import { isiQr, tampilanKode } from "@opennael/domain";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { pengguna, perangkat, tautan } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { bentrok, dilarang, GalatApp, galatPostgres } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { catatRiwayat } from "../../../platform/riwayat";
import type { LayananAuth } from "../auth/layanan";
import { buatKlaim, buatKode, klaimCocok } from "./kode";

/** Kode menunggu dipindai bos. */
const UMUR_KODE_MS = 2 * 60_000;
/** Sesudah disetujui: batas HP peminta mengambil sesinya. */
const UMUR_KLAIM_MS = 10 * 60_000;
/** Baris yang kedaluwarsa lebih lama dari ini dibersihkan. */
const SIMPAN_KEDALUWARSA_MS = 24 * 60 * 60_000;

const tidakDitemukan = (kode: string, pesan: string) => new GalatApp(404, kode, pesan);
const TAUTAN_TIDAK_DITEMUKAN = () =>
  tidakDitemukan("TAUTAN_TIDAK_DITEMUKAN", "Kode penautan tidak ditemukan atau sudah kedaluwarsa");

type InfoPerangkat = {
  nama?: string | undefined;
  platform?: "android" | "ios" | "web" | undefined;
};

export interface TautanDeps {
  db: Db;
  auth: Pick<LayananAuth, "bukaSesi">;
  sekarang?: () => Date;
}

/**
 * PENAUTAN HP lewat QR — jalan masuk kasir, pengawas, dan kolektor.
 *   1. HP yang belum masuk meminta kode → kode + kunci klaim (sekali).
 *   2. Bos memindai/mengetik kode, memilih atau membuat akun → disetujui.
 *   3. HP yang SAMA menukar kunci klaim dengan sesi — sekali saja; perangkat
 *      lama akun itu diputus di transaksi yang sama.
 * QR yang difoto & dikirim ke orang lain tak berguna tanpa kunci klaim.
 * Lihat docs/skema/schema-tautan.md.
 */
export function buatLayananTautan(deps: TautanDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());

  return {
    async minta(info: InfoPerangkat | undefined) {
      const kini = sekarang();
      // Pembersihan tanpa penjadwal: tabel hampir selalu kosong.
      await deps.db
        .delete(tautan)
        .where(lt(tautan.kedaluwarsaAt, new Date(kini.getTime() - SIMPAN_KEDALUWARSA_MS)));

      const { klaim, hash } = buatKlaim();
      const kedaluwarsaAt = new Date(kini.getTime() + UMUR_KODE_MS);
      for (let coba = 0; coba < 3; coba++) {
        const kode = buatKode();
        try {
          const baris = await deps.db.transaction(async (tx) => {
            const [b] = await tx
              .insert(tautan)
              .values({
                kode,
                hashKlaim: hash,
                nama: info?.nama ?? null,
                platform: info?.platform ?? null,
                kedaluwarsaAt,
              })
              .returning({ id: tautan.id });
            return b;
          });
          if (!baris) throw new Error("gagal membuat tautan");
          return {
            id: baris.id,
            kode: tampilanKode(kode),
            qr: isiQr(kode),
            klaim,
            kedaluwarsaAt: kedaluwarsaAt.toISOString(),
          };
        } catch (e) {
          // Kode kembar (sangat jarang) → coba kode lain.
          if (galatPostgres(e)?.constraint_name !== "uniq_tautan_kode") throw e;
        }
      }
      throw new Error("gagal membuat kode penautan unik");
    },

    /** Bos menyetujui: akun yang ada (bukan bos) atau akun baru kasir/pengawas/kolektor. */
    async setujui(aktor: Aktor, input: SetujuiTautanInput) {
      wajibPeran(aktor, "bos");
      const kini = sekarang();
      return deps.db.transaction(async (tx) => {
        const [t] = await tx
          .select({ id: tautan.id, nama: tautan.nama, platform: tautan.platform })
          .from(tautan)
          .where(
            and(
              eq(tautan.kode, input.kode),
              isNull(tautan.disetujuiAt),
              gt(tautan.kedaluwarsaAt, kini),
            ),
          )
          .for("update")
          .limit(1);
        if (!t) throw TAUTAN_TIDAK_DITEMUKAN();

        let akun: { id: string; nama: string; peran: "bos" | "kasir" | "pengawas" | "kolektor" };
        if ("penggunaId" in input.akun) {
          const [ada] = await tx
            .select({ id: pengguna.id, nama: pengguna.nama, peran: pengguna.peran })
            .from(pengguna)
            .where(
              and(
                eq(pengguna.id, input.akun.penggunaId),
                eq(pengguna.kantorId, aktor.kantorId),
                isNull(pengguna.dinonaktifkanAt),
              ),
            )
            .limit(1);
          if (!ada) {
            throw tidakDitemukan("PENGGUNA_TIDAK_DITEMUKAN", "Akun tidak ditemukan di kantor ini");
          }
          if (ada.peran === "bos") {
            throw dilarang("BOS_TIDAK_DITAUTKAN", "Akun bos masuk dengan kata sandi, bukan tautan");
          }
          akun = ada;
        } else {
          const [baru] = await tx
            .insert(pengguna)
            .values({
              kantorId: aktor.kantorId,
              peran: input.akun.peran,
              nama: input.akun.nama,
              nomorHp: input.akun.nomorHp ?? null,
              resort: input.akun.resort ?? null,
            })
            .returning({ id: pengguna.id, nama: pengguna.nama, peran: pengguna.peran });
          if (!baru) throw new Error("gagal membuat akun");
          await catatRiwayat(tx, {
            kantorId: aktor.kantorId,
            tabel: "pengguna",
            barisId: baru.id,
            aksi: "buat_pengguna",
            sesudah: { peran: baru.peran, nama: baru.nama, resort: input.akun.resort ?? null },
            pelakuId: aktor.penggunaId,
          });
          akun = baru;
        }

        await tx
          .update(tautan)
          .set({
            kantorId: aktor.kantorId,
            penggunaId: akun.id,
            disetujuiAt: kini,
            disetujuiOleh: aktor.penggunaId,
            kedaluwarsaAt: new Date(kini.getTime() + UMUR_KLAIM_MS),
          })
          .where(eq(tautan.id, t.id));
        // Jejak permanen: baris tautan dihapus sehari sesudah kedaluwarsa.
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "pengguna",
          barisId: akun.id,
          aksi: "setujui_tautan",
          sesudah: { peran: akun.peran, perangkat: t.nama, platform: t.platform, kode: input.kode },
          pelakuId: aktor.penggunaId,
        });

        return {
          pengguna: akun,
          perangkat: { nama: t.nama, platform: t.platform },
        };
      });
    },

    /** HP peminta bertanya berulang; sesudah disetujui menukar kunci klaim dengan sesi, sekali. */
    async klaim(id: string, klaim: string): Promise<HasilKlaim> {
      const kini = sekarang();
      return deps.db.transaction(async (tx) => {
        const [t] = await tx.select().from(tautan).where(eq(tautan.id, id)).for("update").limit(1);
        // Id asing dan kunci salah dijawab sama — tak membocorkan id mana yang ada.
        if (!t || !klaimCocok(klaim, t.hashKlaim)) throw TAUTAN_TIDAK_DITEMUKAN();
        if (t.perangkatId) throw bentrok("TAUTAN_SUDAH_DIPAKAI", "Tautan ini sudah dipakai");
        if (t.kedaluwarsaAt <= kini) return { status: "kedaluwarsa" as const };
        if (!t.disetujuiAt || !t.penggunaId || !t.kantorId || !t.disetujuiOleh) {
          return { status: "menunggu" as const };
        }

        const [akun] = await tx
          .select({ id: pengguna.id, kantorId: pengguna.kantorId, peran: pengguna.peran })
          .from(pengguna)
          .where(and(eq(pengguna.id, t.penggunaId), isNull(pengguna.dinonaktifkanAt)))
          .limit(1);
        if (!akun) throw dilarang("AKUN_NONAKTIF", "Akun ini sudah dinonaktifkan");

        // Satu akun, satu HP: perangkat lama diputus `tautan_baru`.
        await tx
          .update(perangkat)
          .set({ diputusAt: kini, diputusOleh: t.disetujuiOleh, alasanPutus: "tautan_baru" })
          .where(and(eq(perangkat.penggunaId, akun.id), isNull(perangkat.diputusAt)));

        const { sesi, perangkatId } = await deps.auth.bukaSesi(tx, akun, {
          nama: t.nama ?? undefined,
          platform: t.platform ?? undefined,
        });
        const dipakai = await tx
          .update(tautan)
          .set({ perangkatId })
          .where(and(eq(tautan.id, t.id), isNull(tautan.perangkatId)))
          .returning({ id: tautan.id });
        if (dipakai.length === 0) throw bentrok("TAUTAN_SUDAH_DIPAKAI", "Tautan ini sudah dipakai");
        return { status: "tertaut" as const, ...sesi };
      });
    },
  };
}

export type LayananTautan = ReturnType<typeof buatLayananTautan>;
