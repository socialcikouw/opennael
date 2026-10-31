import { createFileRoute } from "@tanstack/react-router";
import { LayarGaji } from "@/fitur/gaji/layar-gaji";
import { saringGaji } from "@/lib/pencarian";

export const Route = createFileRoute("/_bos/gaji")({
  validateSearch: saringGaji,
  component: LayarGaji,
});
