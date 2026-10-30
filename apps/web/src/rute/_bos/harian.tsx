import { createFileRoute } from "@tanstack/react-router";
import { LayarHarian } from "@/fitur/setoran-sore/layar-harian";
import { saringTanggal } from "@/lib/pencarian";

const TAB_HARIAN = ["setoran", "libur", "transfer", "biaya"] as const;

export const Route = createFileRoute("/_bos/harian")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { tanggal?: string; tab?: (typeof TAB_HARIAN)[number] } => ({
    ...saringTanggal(s),
    tab: TAB_HARIAN.find((t) => t === s.tab),
  }),
  component: LayarHarian,
});
