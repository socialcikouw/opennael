import { createFileRoute } from "@tanstack/react-router";
import { LayarAktivitas } from "@/fitur/aktivitas/layar-aktivitas";
import { saringTanggal, teksSah } from "@/lib/pencarian";

export const Route = createFileRoute("/_bos/aktivitas")({
  validateSearch: (s: Record<string, unknown>): { tanggal?: string; pelaku?: string } => ({
    ...saringTanggal(s),
    pelaku: teksSah(s.pelaku),
  }),
  component: LayarAktivitas,
});
