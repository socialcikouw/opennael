import { createRoute } from "@hono/zod-openapi";
import { galatSchema } from "@opennael/contracts";
import type { ZodType } from "zod";

/** Isi permintaan/jawaban JSON berskema Zod untuk definisi rute OpenAPI. */
export const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });

/** Rute yang butuh token akses (skema keamanan `bearer`). */
export const aman = [{ bearer: [] }];

/** Jawaban galat untuk definisi rute OpenAPI. */
export function jawabanGalat(...daftar: [number, string][]) {
  return Object.fromEntries(
    daftar.map(([status, description]) => [
      status,
      { description, content: { "application/json": { schema: galatSchema } } },
    ]),
  );
}

/**
 * Pembuat rute baku satu modul: GET (`baca`) dan PUT/PATCH/POST (`tulis`)
 * berjawaban 200 dengan daftar galat yang sama.
 */
export function pembuatRute(tags: string[], galat: ReturnType<typeof jawabanGalat>) {
  const berhasil = <S extends ZodType>(schema: S) => ({
    200: { description: "Berhasil", ...json(schema) },
    ...galat,
  });
  const baca = <P extends string, S extends ZodType>(path: P, summary: string, schema: S) =>
    createRoute({
      method: "get",
      path,
      tags,
      summary,
      security: aman,
      responses: berhasil(schema),
    });
  const tulis = <P extends string, B extends ZodType, S extends ZodType>(
    method: "put" | "patch" | "post",
    path: P,
    summary: string,
    body: B,
    schema: S,
  ) =>
    createRoute({
      method,
      path,
      tags,
      summary,
      security: aman,
      request: { body: { ...json(body), required: true } },
      responses: berhasil(schema),
    });
  return { berhasil, baca, tulis };
}

/** Galat umum rute `/lapangan/*` — dipakai rute lapangan di banyak konteks. */
export const galatLapangan = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Bukan kolektor / bukan pegangan Anda"],
  [404, "Tidak ditemukan"],
  [409, "Sudah ada catatan hari ini"],
  [422, "Melanggar aturan usaha (gerbang lapangan, rumus, rem bos)"],
);

/** Rute POST `/lapangan/*`: badan JSON, jawaban 201. */
export const tulisLapangan = <P extends string, B extends ZodType, S extends ZodType>(
  path: P,
  summary: string,
  body: B,
  schema: S,
) =>
  createRoute({
    method: "post",
    path,
    tags: ["lapangan"],
    summary,
    security: aman,
    request: { body: { content: { "application/json": { schema: body } }, required: true } },
    responses: {
      201: { description: "Berhasil", content: { "application/json": { schema } } },
      ...galatLapangan,
    },
  });
