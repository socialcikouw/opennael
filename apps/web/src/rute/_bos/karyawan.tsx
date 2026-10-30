import { type Peran, peranSchema } from "@opennael/contracts";
import { createFileRoute } from "@tanstack/react-router";
import { LayarKaryawan } from "@/fitur/karyawan/layar-karyawan";

export const Route = createFileRoute("/_bos/karyawan")({
  validateSearch: (s: Record<string, unknown>): { peran?: Peran; nonaktif?: "ya" } => ({
    peran: peranSchema.safeParse(s.peran).data,
    nonaktif: s.nonaktif === "ya" ? "ya" : undefined,
  }),
  component: LayarKaryawan,
});
