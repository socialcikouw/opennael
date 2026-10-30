import { createFileRoute } from "@tanstack/react-router";
import { LayarPengaturan, type TabPengaturan } from "@/fitur/pengaturan/layar-pengaturan";

const TAB_PENGATURAN = ["rem", "libur", "tarif", "rute", "kampung"] as const;

export const Route = createFileRoute("/_bos/pengaturan")({
  validateSearch: (s: Record<string, unknown>): { tab?: Exclude<TabPengaturan, "kantor"> } => ({
    tab: TAB_PENGATURAN.find((t) => t === s.tab),
  }),
  component: LayarPengaturan,
});
