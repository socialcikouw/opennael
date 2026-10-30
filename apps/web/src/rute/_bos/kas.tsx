import { createFileRoute } from "@tanstack/react-router";
import { LayarKas } from "@/fitur/kas/layar-kas";
import { tanggalSah } from "@/lib/pencarian";

export const Route = createFileRoute("/_bos/kas")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { mulai?: string; selesai?: string; tab?: "cocok" } => ({
    mulai: tanggalSah(s.mulai),
    selesai: tanggalSah(s.selesai),
    tab: s.tab === "cocok" ? "cocok" : undefined,
  }),
  component: LayarKas,
});
