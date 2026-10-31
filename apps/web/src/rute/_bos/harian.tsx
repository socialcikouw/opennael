import { createFileRoute } from "@tanstack/react-router";
import { LayarHarian } from "@/fitur/setoran-sore/layar-harian";
import { saringHarian } from "@/lib/pencarian";

export const Route = createFileRoute("/_bos/harian")({
  validateSearch: saringHarian,
  component: LayarHarian,
});
