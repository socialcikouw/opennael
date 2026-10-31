import { createFileRoute } from "@tanstack/react-router";
import { LayarAktivitas } from "@/fitur/aktivitas/layar-aktivitas";
import { saringAktivitas } from "@/lib/pencarian";

export const Route = createFileRoute("/_bos/aktivitas")({
  validateSearch: saringAktivitas,
  component: LayarAktivitas,
});
