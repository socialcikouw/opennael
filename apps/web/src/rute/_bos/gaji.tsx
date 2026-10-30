import { createFileRoute } from "@tanstack/react-router";
import { LayarGaji } from "@/fitur/gaji/layar-gaji";
import { tanggalSah, teksSah } from "@/lib/pencarian";

export const Route = createFileRoute("/_bos/gaji")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { kolektor?: string; mulai?: string; selesai?: string } => ({
    kolektor: teksSah(s.kolektor),
    mulai: tanggalSah(s.mulai),
    selesai: tanggalSah(s.selesai),
  }),
  component: LayarGaji,
});
