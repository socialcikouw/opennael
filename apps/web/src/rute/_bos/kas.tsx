import { createFileRoute } from "@tanstack/react-router";
import { LayarKas } from "@/fitur/kas/layar-kas";
import { saringKas } from "@/lib/pencarian";

export const Route = createFileRoute("/_bos/kas")({
  validateSearch: saringKas,
  component: LayarKas,
});
