import { describe, expect, test } from "bun:test";
import { buatLog, TINGKAT_LOG } from "./log";

function tangkap(tingkat: Parameters<typeof buatLog>[0] = "info") {
  const baris: Record<string, unknown>[] = [];
  const log = buatLog(tingkat, { write: (s: string) => void baris.push(JSON.parse(s)) });
  return { log, baris };
}

describe("buatLog", () => {
  test("JSON terstruktur dengan nama layanan dan waktu ISO", () => {
    const { log, baris } = tangkap();
    log.info({ kantorId: "k1" }, "halo");
    expect(baris[0]).toMatchObject({ layanan: "opennael-api", kantorId: "k1", msg: "halo" });
    expect(String(baris[0]?.time)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("tingkat dihormati; silent membuang semuanya", () => {
    const a = tangkap("warn");
    a.log.info("diam");
    a.log.warn("bunyi");
    expect(a.baris.map((b) => b.msg)).toEqual(["bunyi"]);
    const b = tangkap("silent");
    b.log.fatal("tetap diam");
    expect(b.baris).toEqual([]);
  });

  test("token dan kata sandi disensor bila terlanjur dicatat", () => {
    const { log, baris } = tangkap();
    log.info({ tokenSegar: "abc", masuk: { tokenAkses: "def", kataSandi: "ghi" } }, "uji");
    const teks = JSON.stringify(baris[0]);
    for (const rahasia of ["abc", "def", "ghi"]) expect(teks).not.toContain(rahasia);
    expect(teks).toContain("[disensor]");
  });

  test("daftar tingkat memuat semua tingkat pino", () => {
    expect(TINGKAT_LOG).toEqual(["fatal", "error", "warn", "info", "debug", "trace", "silent"]);
  });
});
