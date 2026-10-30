import { z } from "zod";

/** `GET /sehat` — server hidup dan menjawab. */
export const sehatSchema = z.object({
  status: z.literal("ok"),
  /** Jam server (ISO 8601). */
  waktu: z.iso.datetime(),
});

export type Sehat = z.infer<typeof sehatSchema>;
