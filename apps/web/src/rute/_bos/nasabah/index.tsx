import { createFileRoute } from "@tanstack/react-router";
import { LayarNasabah } from "@/fitur/nasabah/layar-nasabah";
import { teksSah } from "@/lib/pencarian";

export const Route = createFileRoute("/_bos/nasabah/")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { cari?: string; kolektor?: string; pilih?: string } => ({
    cari: teksSah(s.cari),
    kolektor: teksSah(s.kolektor),
    pilih: teksSah(s.pilih),
  }),
  component: LayarNasabah,
});
