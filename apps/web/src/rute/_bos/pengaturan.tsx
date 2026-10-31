import { createFileRoute } from "@tanstack/react-router";
import { LayarPengaturan } from "@/fitur/pengaturan/layar-pengaturan";
import { saringPengaturan } from "@/lib/pencarian";

export const Route = createFileRoute("/_bos/pengaturan")({
  validateSearch: saringPengaturan,
  component: LayarPengaturan,
});
