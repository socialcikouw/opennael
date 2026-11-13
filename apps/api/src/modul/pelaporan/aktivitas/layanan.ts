import type { Aktivitas, JejakRiwayat } from "@opennael/contracts";
import { rentangTanggalKantor } from "@opennael/domain";
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import {
  kantor,
  pengguna,
  riwayatPerubahan,
  type tabelBerjejakEnum,
} from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { wajibPeran } from "../../../platform/http/peran";
import { bacaKalender } from "../../kantor";
import { dariRiwayat } from "./dari-riwayat";
import { dariUang } from "./dari-uang";
import { bacaOrang } from "./data";

/**
 * AKTIVITAS — siapa melakukan apa pada satu tanggal kantor. Menggabungkan
 * `riwayat_perubahan` (data ditimpa/dihapus) dengan baris tabel uang yang
 * dicatat atau dibatalkan hari itu. Pembatalan uang hanya di hari yang sama,
 * jadi saringan `tanggal` tiap tabel menangkap keduanya. Pengawas tidak
 * melihat kas kantor (mutasi & buku kas) — bacaannya milik bos.
 */
export interface AktivitasDeps {
  db: Db;
  sekarang?: () => Date;
}

export function buatLayananAktivitas(deps: AktivitasDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());

  return {
    /** `GET /aktivitas` — terbaru dulu; bawaan hari ini. */
    async aktivitas(
      aktor: Aktor,
      saring: { tanggal?: string; pelakuId?: string },
    ): Promise<Aktivitas[]> {
      wajibPeran(aktor, "bos", "pengawas");
      const tanggal =
        saring.tanggal ?? (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal;
      const [k] = await deps.db
        .select({ zona: kantor.zonaWaktu })
        .from(kantor)
        .where(eq(kantor.id, aktor.kantorId))
        .limit(1);
      if (!k) throw new Error("kantor tidak ditemukan");
      const { mulai, selesai } = rentangTanggalKantor(tanggal, k.zona);
      const bos = aktor.peran === "bos";
      const semua = [
        ...(await dariRiwayat(deps.db, aktor.kantorId, mulai, selesai, bos)),
        ...(await dariUang(deps.db, aktor.kantorId, tanggal, mulai, selesai, bos)),
      ].filter((k) => !saring.pelakuId || k.pelakuId === saring.pelakuId);
      const orang = await bacaOrang(deps.db, aktor.kantorId, [
        ...new Set(semua.map((k) => k.pelakuId)),
      ]);
      return semua
        .sort((a, b) => b.waktu.getTime() - a.waktu.getTime())
        .map(({ waktu, pelakuId, ...isi }) => {
          const o = orang.get(pelakuId);
          return {
            waktu: waktu.toISOString(),
            pelaku: { id: pelakuId, nama: o?.nama ?? "?" },
            peran: o?.peran ?? "bos",
            ...isi,
          };
        });
    },

    /** `GET /riwayat` — jejak satu baris, terbaru dulu. */
    async riwayat(
      aktor: Aktor,
      saring: { tabel: (typeof tabelBerjejakEnum.enumValues)[number]; barisId: string },
    ): Promise<JejakRiwayat[]> {
      wajibPeran(aktor, "bos", "pengawas");
      const bos = aktor.peran === "bos";
      if (!bos && saring.tabel === "buku_kas") return [];
      const baris = await deps.db
        .select({
          waktu: riwayatPerubahan.dibuatAt,
          pelakuId: riwayatPerubahan.pelakuId,
          nama: pengguna.nama,
          peran: pengguna.peran,
          aksi: riwayatPerubahan.aksi,
          sebelum: riwayatPerubahan.sebelum,
          sesudah: riwayatPerubahan.sesudah,
          alasan: riwayatPerubahan.alasanPerubahan,
        })
        .from(riwayatPerubahan)
        .innerJoin(pengguna, eq(pengguna.id, riwayatPerubahan.pelakuId))
        .where(
          and(
            eq(riwayatPerubahan.kantorId, aktor.kantorId),
            eq(riwayatPerubahan.tabel, saring.tabel),
            eq(riwayatPerubahan.barisId, saring.barisId),
          ),
        )
        .orderBy(desc(riwayatPerubahan.dibuatAt));
      return baris.map((b) => ({
        waktu: b.waktu.toISOString(),
        pelaku: { id: b.pelakuId, nama: b.nama },
        peran: b.peran,
        aksi: b.aksi,
        sebelum: b.sebelum as Record<string, unknown> | null,
        sesudah: b.sesudah as Record<string, unknown> | null,
        alasan: b.alasan,
      }));
    },
  };
}

export type LayananAktivitas = ReturnType<typeof buatLayananAktivitas>;
