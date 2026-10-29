import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../../uji/bantu";

/** Profil kantor oleh bos — di SATU transaksi yang dibatalkan. */
describe.skipIf(!URL_DB)("profil kantor", () => {
  test("baca semua peran, ubah hanya bos, jam harus sah, jejak di riwayat", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];

      // ---- kantor --------------------------------------------------------------------
      expect((await kirim("/kantor", { token: k })).isi).toMatchObject({
        zonaWaktu: "WIB",
        hariKerja: [0, 1, 2, 3, 4, 5, 6],
        jamBuka: "00:00",
        jamTutup: "24:00",
      });
      const ubahKantor = (isi: Record<string, unknown>, token = b) =>
        kirim("/kantor", { metode: "PATCH", isi, token });
      expect(kode(await ubahKantor({ nama: "x" }, k))).toBe("PERAN_DILARANG");
      expect(kode(await ubahKantor({ jamBuka: "23:00", jamTutup: "22:00" }))).toBe("JAM_TIDAK_SAH");
      expect((await ubahKantor({ nama: "Nael Pule", jamBuka: "00:00" })).isi.nama).toBe(
        "Nael Pule",
      );
      const [jejakKantor] = await baris<{ sesudah: Record<string, unknown> }>(sql`
        select sesudah from riwayat_perubahan where kantor_id = ${kantorId} and aksi = 'ubah_kantor'`);
      expect(jejakKantor?.sesudah).toEqual({ nama: "Nael Pule" });
    });
  }, 60_000);
});
