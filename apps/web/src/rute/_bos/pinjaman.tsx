import { createFileRoute } from "@tanstack/react-router";
import { LayarPinjaman } from "@/fitur/pinjaman/layar-pinjaman";
import { teksSah } from "@/lib/pencarian";

export const Route = createFileRoute("/_bos/pinjaman")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { kolektor?: string; status?: "selesai" | "semua"; tunggak?: "ya"; pilih?: string } => ({
    kolektor: teksSah(s.kolektor),
    status: s.status === "selesai" || s.status === "semua" ? s.status : undefined,
    tunggak: s.tunggak === "ya" ? "ya" : undefined,
    pilih: teksSah(s.pilih),
  }),
  component: LayarPinjaman,
});
