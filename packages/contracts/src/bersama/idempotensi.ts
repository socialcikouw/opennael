import { z } from "zod";

export const kunciIdempotenSchema = z.uuid();
/** Opsional selama klien lama beredar. Klien baru mempertahankan UUID saat retry. */
export const kepalaIdempotenSchema = z.object({
  "idempotency-key": kunciIdempotenSchema.optional(),
});
