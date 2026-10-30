import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { buatLog } from "../log";
import { ringkasGalat, tanganiGalat } from "./galat";
import { middlewareLog } from "./log";

function pasang(tingkat: Parameters<typeof buatLog>[0] = "debug") {
  const baris: Record<string, unknown>[] = [];
  const log = buatLog(tingkat, { write: (s: string) => void baris.push(JSON.parse(s)) });
  const app = new Hono();
  app.use("*", requestId());
  app.use("*", middlewareLog(log));
  app.onError((e, c) => tanganiGalat(e, c, log));
  app.get("/sehat", (c) => c.json({ status: "ok" }));
  app.get("/ok", (c) => c.json({ ok: true }));
  app.get("/hilang", (c) => c.json({}, 404));
  app.get("/rusak", () => {
    throw new Error("rahasia di pesan");
  });
  return { app, baris };
}

describe("middlewareLog", () => {
  test("satu baris per permintaan: metode, jalur tanpa query, status, ms, requestId", async () => {
    const { app, baris } = pasang();
    const res = await app.request("/ok?nik=3201234567890123", {
      headers: { Authorization: "Bearer token-rahasia" },
    });
    expect(res.status).toBe(200);
    expect(baris).toHaveLength(1);
    const b = baris[0] as Record<string, unknown>;
    expect(b).toMatchObject({
      level: 30,
      metode: "GET",
      jalur: "/ok",
      status: 200,
      msg: "permintaan",
    });
    expect(typeof b.ms).toBe("number");
    expect(b.requestId).toBe(res.headers.get("X-Request-Id"));
    const teks = JSON.stringify(b);
    expect(teks).not.toContain("3201234567890123");
    expect(teks).not.toContain("token-rahasia");
  });

  test("tingkat mengikuti status; /sehat hanya di debug", async () => {
    const { app, baris } = pasang();
    await app.request("/hilang");
    await app.request("/rusak");
    await app.request("/sehat");
    expect(baris.filter((b) => b.msg === "permintaan").map((b) => [b.jalur, b.level])).toEqual([
      ["/hilang", 40],
      ["/rusak", 50],
      ["/sehat", 20],
    ]);
    const info = pasang("info");
    await info.app.request("/sehat");
    expect(info.baris).toEqual([]);
  });
});

describe("galat tak terduga", () => {
  test("dijawab 500 generik ke klien; log memuat requestId yang sama dengan header", async () => {
    const { app, baris } = pasang();
    const res = await app.request("/rusak");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      kode: "GALAT_SERVER",
      pesan: "Terjadi kesalahan di server",
    });
    const galat = baris.find((b) => b.msg === "galat tak terduga");
    expect(galat).toMatchObject({ level: 50, requestId: res.headers.get("X-Request-Id") });
  });

  test("ringkasGalat galat Postgres: tanpa SQL, parameter, detail, dan pesan", () => {
    const pg = Object.assign(new Error('duplicate key value violates "uniq_x"'), {
      severity: "ERROR",
      code: "23505",
      constraint_name: "uniq_nasabah_kantor_nik",
      table_name: "nasabah",
      detail: "Key (nik)=(3201234567890123) already exists.",
    });
    const drizzle = Object.assign(new Error("Failed query: insert ... params: 3201234567890123"), {
      cause: pg,
    });
    const teks = JSON.stringify(ringkasGalat(drizzle));
    expect(teks).toContain("23505");
    expect(teks).toContain("uniq_nasabah_kantor_nik");
    expect(teks).not.toContain("3201234567890123");
    expect(teks).not.toContain("Failed query");
  });

  test("ringkasGalat galat biasa: jenis, pesan, dan tumpukan tanpa baris pesan", () => {
    const r = ringkasGalat(new TypeError("salah tipe"));
    expect(r).toMatchObject({ jenis: "TypeError", pesan: "salah tipe" });
    expect((r as { tumpukan?: string }).tumpukan).not.toContain("salah tipe");
    expect(ringkasGalat("teks")).toEqual({ jenis: "string" });
  });
});
