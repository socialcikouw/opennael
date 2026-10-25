import { describe, expect, test } from "bun:test";
import type { Sesi } from "@opennael/contracts";
import { dalamTransaksi, type Jawaban, siapkanKantor, URL_DB } from "../../uji/bantu";

/**
 * Perangkat yang masuk: daftar menurut peran, riwayat (bos), memutus milik
 * sendiri (`keluar`) dan milik orang lain (bos, `diputus`). Semua di SATU
 * transaksi yang dibatalkan.
 */
describe.skipIf(!URL_DB)("perangkat", () => {
  test("daftar, riwayat, putus milik sendiri & milik orang lain", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const id = (r: Jawaban) => r.isi.map((p: { id: string }) => p.id).sort();

      // Bos masuk lagi dari browser kedua.
      const bos2 = (
        await kirim("/auth/login", { isi: { nomorHp: "081299990099", sandi: "sandi-rahasia-uji" } })
      ).isi as Sesi;

      const milikBos = await kirim("/auth/perangkat", { token: b });
      expect(milikBos.status).toBe(200);
      expect(milikBos.isi).toHaveLength(3);
      const [ini] = milikBos.isi.filter((p: { sedangDipakai: boolean }) => p.sedangDipakai);
      expect(ini).toMatchObject({ pengguna: { id: bos.pengguna.id, peran: "bos" }, diputus: null });

      const milikAndi = await kirim("/auth/perangkat", { token: k });
      expect(milikAndi.isi).toHaveLength(1);
      expect(milikAndi.isi[0]).toMatchObject({
        pengguna: { id: andi.pengguna.id, nama: "Andi", peran: "kolektor" },
        sedangDipakai: true,
      });
      const hpAndi = milikAndi.isi[0].id as string;
      expect((await kirim("/auth/perangkat?termasukDiputus=true", { token: k })).status).toBe(403);

      // Kolektor tak boleh memutus perangkat orang lain.
      const putus = (perangkatId: string, token: string) =>
        kirim(`/auth/perangkat/${perangkatId}`, { metode: "DELETE", token });
      expect((await putus(ini.id, k)).isi.kode).toBe("BUKAN_MILIK_ANDA");

      // Bos memutus HP Andi → `diputus`; token segar Andi langsung ditolak.
      expect((await putus(hpAndi, b)).isi).toEqual({ id: hpAndi, alasan: "diputus" });
      expect((await kirim("/auth/refresh", { isi: { tokenSegar: andi.tokenSegar } })).status).toBe(
        401,
      );
      expect((await putus(hpAndi, b)).isi.kode).toBe("PERANGKAT_SUDAH_DIPUTUS");

      // Bos menutup browser keduanya dari browser pertama → milik sendiri: `keluar`.
      const lain = milikBos.isi.find(
        (p: { sedangDipakai: boolean; pengguna: { id: string } }) =>
          !p.sedangDipakai && p.pengguna.id === bos.pengguna.id,
      );
      expect((await putus(lain.id, b)).isi.alasan).toBe("keluar");
      expect((await kirim("/auth/refresh", { isi: { tokenSegar: bos2.tokenSegar } })).status).toBe(
        401,
      );

      // Daftar aktif tinggal satu; riwayat (bos) memuat semuanya beserta pemutusnya.
      expect(id(await kirim("/auth/perangkat", { token: b }))).toEqual([ini.id]);
      const riwayat = await kirim("/auth/perangkat?termasukDiputus=true", { token: b });
      expect(riwayat.isi).toHaveLength(3);
      expect(riwayat.isi.find((p: { id: string }) => p.id === hpAndi).diputus).toMatchObject({
        oleh: { id: bos.pengguna.id, nama: "Bos" },
        alasan: "diputus",
      });
      expect((await putus("00000000-0000-4000-8000-000000000000", b)).status).toBe(404);
    });
  }, 60_000);
});
