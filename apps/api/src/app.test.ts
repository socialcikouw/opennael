import { describe, expect, test } from "bun:test";
import { sehatSchema } from "@opennael/contracts";
import { buatApp } from "./app";
import type { Db } from "./platform/db/klien";

describe("app", () => {
  // Rute di sini tidak menyentuh database.
  const app = buatApp({ db: {} as Db, jwtRahasia: "x".repeat(32), sesiRahasia: "y".repeat(32) });

  test("GET /sehat menjawab sesuai kontrak", async () => {
    const res = await app.request("/sehat");
    expect(res.status).toBe(200);
    expect(sehatSchema.safeParse(await res.json()).success).toBe(true);
  });

  test("dokumen OpenAPI memuat rute sistem & auth", async () => {
    const res = await app.request("/openapi.json");
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { paths: Record<string, unknown> };
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        "/sehat",
        "/auth/register",
        "/auth/login",
        "/auth/refresh",
        "/auth/keluar",
        "/auth/me",
      ]),
    );
  });
});
