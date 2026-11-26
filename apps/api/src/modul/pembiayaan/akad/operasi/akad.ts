import type { AkadInput, PeriksaAkadInput, PinjamanKartu } from "@opennael/contracts";
import { type SyaratAkad, syaratAkad } from "@opennael/domain";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "../../../../platform/db/klien";
import { nasabah, pinjaman } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import { bentrok, dilarang, melanggar, tidakDitemukan } from "../../../../platform/http/galat";
import { bukaGerbang, type GerbangDeps } from "../../../hari-kolektor";
import { remBerlaku, VALIDASI_PENUH } from "../../../kantor";
import { pastikanFoto } from "../../foto/data";
import { daftarkanNasabahBaru } from "../../nasabah/data";
import { kartu, pinjamanKeBerikut } from "../../pinjaman/data";

/** Pembatal transaksi pemeriksaan — semua tulisan `periksaAkad` (nasabah baru) dibuang. */
class PeriksaSelesai extends Error {}

export function buatAkad(deps: GerbangDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const validasi = deps.validasiKalender ?? VALIDASI_PENUH;

  /**
   * Semua aturan akad SEBELUM foto & uang (A8, A9, rem, gerbang lapangan): dipakai akad
   * sungguhan dan pemeriksaan sebelum kamera (`periksa`) — satu aturan, dua pemakai.
   */
  async function cekAkad(tx: Db, aktor: Aktor, input: PeriksaAkadInput) {
    const { tanggal } = await bukaGerbang(tx, aktor, sekarang(), {
      perluAbsen: true,
      validasi,
    });
    const rem = await remBerlaku(
      tx,
      aktor,
      "nasabahId" in input.nasabah ? input.nasabah.nasabahId : null,
    );
    if (rem.pinjamanBaru) {
      const alasan = rem.alasan("pinjamanBaru");
      throw melanggar(
        "PINJAMAN_BARU_DIKUNCI",
        alasan ? `Akad baru dikunci bos: ${alasan}` : "Akad baru sedang dikunci bos",
      );
    }

    let nasabahId: string;
    if ("nasabahId" in input.nasabah) {
      const [n] = await tx
        .select({
          id: nasabah.id,
          pemegang: nasabah.kolektorId,
          diblokirAt: nasabah.diblokirAt,
        })
        .from(nasabah)
        .where(and(eq(nasabah.id, input.nasabah.nasabahId), eq(nasabah.kantorId, aktor.kantorId)))
        .for("update")
        .limit(1);
      if (!n) throw tidakDitemukan("NASABAH_TIDAK_DITEMUKAN", "Nasabah tidak ditemukan");
      if (n.pemegang !== aktor.penggunaId) {
        throw dilarang("BUKAN_PEGANGAN_ANDA", "Nasabah ini dipegang kolektor lain");
      }
      if (n.diblokirAt) throw melanggar("NASABAH_DIBLOKIR", "Nasabah ini diblokir");
      nasabahId = n.id;
    } else {
      nasabahId = await daftarkanNasabahBaru(tx, aktor, input.nasabah, aktor.penggunaId);
    }

    const [aktif] = await tx
      .select({ id: pinjaman.id })
      .from(pinjaman)
      .where(
        and(eq(pinjaman.nasabahId, nasabahId), inArray(pinjaman.status, ["berjalan", "macet"])),
      )
      .limit(1);
    if (aktif) throw bentrok("PINJAMAN_MASIH_AKTIF", "Nasabah ini masih punya pinjaman aktif");
    return { nasabahId, tanggal };
  }

  async function catatAkad(
    tx: Db,
    aktor: Aktor,
    input: AkadInput,
    syarat: SyaratAkad,
    kini: Date,
  ): Promise<PinjamanKartu> {
    const { nasabahId, tanggal } = await cekAkad(tx, aktor, input);
    await pastikanFoto(tx, aktor, input.fotoSerahTerimaId, kini);

    const [p] = await tx
      .insert(pinjaman)
      .values({
        kantorId: aktor.kantorId,
        pencairId: aktor.penggunaId,
        dibuatOleh: aktor.penggunaId,
        nasabahId,
        pinjamanKe: await pinjamanKeBerikut(tx, nasabahId),
        jenis: syarat.jenis,
        tenor: syarat.tenor,
        asal: "baru",
        fotoSerahTerimaId: input.fotoSerahTerimaId,
        tanggalAkad: tanggal,
        pokok: syarat.pokok,
        potonganAdmin: syarat.potonganAdmin,
        tabunganMasuk: syarat.tabunganMasuk,
        pencairan: syarat.pencairan,
        totalKembali: syarat.totalKembali,
        angsuran: syarat.angsuran,
        saldoAwal: syarat.totalKembali,
        dropBaru: syarat.pokok,
        saldo: syarat.totalKembali,
      })
      .returning({ id: pinjaman.id });
    if (!p) throw new Error("gagal mencatat akad");
    await tx
      .update(nasabah)
      .set({ saldoTabungan: sql`${nasabah.saldoTabungan} + ${syarat.tabunganMasuk}` })
      .where(eq(nasabah.id, nasabahId));
    return kartu(tx, p.id);
  }

  return {
    async akad(aktor: Aktor, input: AkadInput): Promise<PinjamanKartu> {
      const kini = sekarang();
      const syarat = syaratAkad(input.jenis, input.pokok, input.tenor);
      return deps.db.transaction((tx) => catatAkad(tx, aktor, input, syarat, kini));
    },

    /**
     * PERIKSA SEBELUM FOTO — HP memanggilnya sebelum membuka kamera serah terima, supaya
     * uang tak berpindah tangan untuk akad yang akan ditolak. Menjalankan aturan yang sama
     * dengan akad di transaksi yang selalu dibatalkan; galatnya sama dengan akad.
     */
    async periksa(aktor: Aktor, input: PeriksaAkadInput): Promise<{ pencairan: number }> {
      const syarat = syaratAkad(input.jenis, input.pokok, input.tenor);
      try {
        await deps.db.transaction(async (tx) => {
          await cekAkad(tx, aktor, input);
          throw new PeriksaSelesai();
        });
      } catch (e) {
        if (!(e instanceof PeriksaSelesai)) throw e;
      }
      return { pencairan: syarat.pencairan };
    },
  };
}
