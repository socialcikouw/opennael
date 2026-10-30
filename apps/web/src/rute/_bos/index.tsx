import { createFileRoute } from "@tanstack/react-router";
import { LayarBeranda } from "@/fitur/beranda/layar-beranda";
import { saringTanggal } from "@/lib/pencarian";

export const Route = createFileRoute("/_bos/")({
  validateSearch: saringTanggal,
  component: LayarBeranda,
});
