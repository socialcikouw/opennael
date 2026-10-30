import { createFileRoute } from "@tanstack/react-router";
import { LayarSalinBuku } from "@/fitur/salin-buku/layar-salin-buku";

export const Route = createFileRoute("/_bos/nasabah/salin")({
  component: LayarSalinBuku,
});
