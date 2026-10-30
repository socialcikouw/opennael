import { describe, expect, test } from "bun:test";
import { buatPanggil, PESAN_JARINGAN_BAWAAN } from "./panggil";

const jawaban = <S extends number>(status: S, isi: unknown) => ({
  status,
  json: async () => isi,
});

describe("panggil", () => {
  test("jawaban yang diharapkan dikembalikan; ambil membaca isinya", async () => {
    const { panggil, ambil } = buatPanggil();
    expect((await panggil(async () => jawaban(201, { a: 1 }))).status).toBe(201);
    expect(await ambil(async () => jawaban(200, { a: 1 }))).toEqual({ a: 1 });
  });

  test("galat server menjadi Error berpesan; rincian validasi hanya bila diminta", async () => {
    const galat = { kode: "VALIDASI", pesan: "Data tidak sah", rincian: [{ pesan: "nama wajib" }] };
    await expect(buatPanggil().panggil(async () => jawaban(400, galat))).rejects.toThrow(
      "Data tidak sah",
    );
    await expect(
      buatPanggil({ rincian: true }).panggil(async () => jawaban(400, galat)),
    ).rejects.toThrow("Data tidak sah (nama wajib)");
  });

  test("tanpa isi galat: Gagal (status); gangguan jaringan: pesan jaringan", async () => {
    const { panggil } = buatPanggil({ pesanJaringan: "Tidak ada sinyal" });
    await expect(
      panggil(async () => ({
        status: 500,
        json: async () => {
          throw new Error("bukan json");
        },
      })),
    ).rejects.toThrow("Gagal (500)");
    await expect(
      panggil(async () => {
        throw new TypeError("network");
      }),
    ).rejects.toThrow("Tidak ada sinyal");
    expect(buatPanggil().PESAN_JARINGAN).toBe(PESAN_JARINGAN_BAWAAN);
  });

  test("status di luar daftar diharapkan ditolak", async () => {
    const { panggil } = buatPanggil();
    await expect(panggil(async () => jawaban(404, { pesan: "Tidak ada" }), [200])).rejects.toThrow(
      "Tidak ada",
    );
  });
});
