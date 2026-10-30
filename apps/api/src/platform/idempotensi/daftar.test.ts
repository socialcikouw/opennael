import { describe, expect, test } from "bun:test";
import { OPERASI_IDEMPOTEN, operasiIdempoten } from "@opennael/contracts";
import { buatApp } from "../../app";
import type { Db } from "../db/klien";

describe("daftar operasi idempoten (contracts)", () => {
  test("setiap entri adalah rute tulis yang ada di dokumen OpenAPI", async () => {
    const app = buatApp({ db: {} as Db, jwtRahasia: "x".repeat(32), sesiRahasia: "y".repeat(32) });
    const doc = (await (await app.request("/openapi.json")).json()) as {
      paths: Record<string, Record<string, unknown>>;
    };
    for (const operasi of OPERASI_IDEMPOTEN) {
      const [metode = "", jalur = ""] = operasi.split(" ");
      expect(metode, operasi).toMatch(/^(POST|PUT|PATCH|DELETE)$/);
      expect(
        doc.paths[jalur]?.[metode.toLowerCase()],
        `${operasi} tidak ada di OpenAPI`,
      ).toBeDefined();
    }
  });

  test("tanpa entri ganda", () => {
    expect(new Set(OPERASI_IDEMPOTEN).size).toBe(OPERASI_IDEMPOTEN.length);
  });
});

describe("operasiIdempoten", () => {
  test("mencocokkan parameter jalur, metode, dan bentuk persis", () => {
    expect(operasiIdempoten("POST", "/lapangan/bayar")).toBe(true);
    expect(operasiIdempoten("post", "/lapangan/bayar")).toBe(true);
    expect(operasiIdempoten("POST", "/nasabah/9f3c/penarikan-tabungan")).toBe(true);
    expect(operasiIdempoten("POST", "/transaksi/libur/ab12/hapus")).toBe(true);
    expect(operasiIdempoten("POST", "/transaksi/ab12/batal")).toBe(true);
  });

  test("menolak metode lain, jalur lain, dan sisa jalur", () => {
    expect(operasiIdempoten("GET", "/lapangan/bayar")).toBe(false);
    expect(operasiIdempoten("PATCH", "/lapangan/bayar")).toBe(false);
    expect(operasiIdempoten("PATCH", "/kas/buka")).toBe(true);
    expect(operasiIdempoten("POST", "/lapangan/bayar/lagi")).toBe(false);
    expect(operasiIdempoten("POST", "/x/lapangan/bayar")).toBe(false);
    expect(operasiIdempoten("POST", "/nasabah//penarikan-tabungan")).toBe(false);
    expect(operasiIdempoten("POST", "/nasabah/a/b/penarikan-tabungan")).toBe(false);
  });

  test("operasi tulis yang tidak dibungkus idempotensi tidak masuk daftar", () => {
    expect(operasiIdempoten("POST", "/foto")).toBe(false);
    expect(operasiIdempoten("POST", "/auth/login")).toBe(false);
    expect(operasiIdempoten("POST", "/auth/refresh")).toBe(false);
    expect(operasiIdempoten("PUT", "/rute-kolektor")).toBe(false);
    expect(operasiIdempoten("PATCH", "/nasabah/ab12")).toBe(false);
  });
});
