import { describe, expect, test } from "bun:test";
import { geserTanggal } from "@opennael/domain";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../../uji/bantu";

/** Tarif gaji oleh bos — di SATU transaksi yang dibatalkan. */
describe.skipIf(!URL_DB)("tarif gaji", () => {
  test("tarif kantor, khusus kolektor, tak boleh mundur, jejak di riwayat", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const andiId = andi.pengguna.id;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];
      const [hariIni] = await baris<{ t: string }>(
        sql`select kantor_hari_ini(${kantorId})::text as t`,
      );
      const hari = hariIni?.t as string;
      const aksi = async (tabel: string) =>
        (
          await baris<{ aksi: string }>(sql`
            select aksi from riwayat_perubahan where kantor_id = ${kantorId} and tabel = ${tabel}
            order by dibuat_at`)
        ).map((r) => r.aksi);

      // ---- tarif gaji ----------------------------------------------------------------------
      const berlaku = async () => (await kirim("/tarif-gaji/berlaku", { token: k })).isi;
      const tarif = (isi: Record<string, unknown>) =>
        kirim("/tarif-gaji", { metode: "PUT", isi, token: b });
      expect(await berlaku()).toEqual({ tarifBp: 500, sumber: "kantor" });
      await tarif({ kolektorId: andiId, tarifBp: 600 });
      expect(await berlaku()).toEqual({ tarifBp: 600, sumber: "kolektor" });
      expect(kode(await tarif({ tarifBp: null }))).toBe("TARIF_KANTOR_WAJIB_PERSEN");
      expect(kode(await tarif({ tarifBp: 550, berlakuMulai: geserTanggal(hari, -1) }))).toBe(
        "TIDAK_BOLEH_MUNDUR",
      );
      // Tarif kantor hari ini ditimpa (baris registrasi); Andi tetap 6%.
      await tarif({ tarifBp: 550 });
      expect(await berlaku()).toEqual({ tarifBp: 600, sumber: "kolektor" });
      // Andi kembali ikut kantor.
      await tarif({ kolektorId: andiId, tarifBp: null });
      expect(await berlaku()).toEqual({ tarifBp: 550, sumber: "kantor" });
      expect((await kirim("/tarif-gaji", { token: b })).isi).toHaveLength(2);
      expect(await aksi("tarif_gaji")).toEqual(["timpa_tarif_gaji", "timpa_tarif_gaji"]);
    });
  }, 60_000);
});
