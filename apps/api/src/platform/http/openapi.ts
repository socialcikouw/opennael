import { galatSchema } from "@opennael/contracts";

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
