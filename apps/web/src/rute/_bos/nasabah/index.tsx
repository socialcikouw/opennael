import { createFileRoute } from "@tanstack/react-router";
import { LayarNasabah } from "@/fitur/nasabah/layar-nasabah";
import { saringNasabah } from "@/lib/pencarian";

export const Route = createFileRoute("/_bos/nasabah/")({
  validateSearch: saringNasabah,
  component: LayarNasabah,
});
