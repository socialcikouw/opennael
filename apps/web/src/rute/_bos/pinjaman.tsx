import { createFileRoute } from "@tanstack/react-router";
import { LayarPinjaman } from "@/fitur/pinjaman/layar-pinjaman";
import { saringPinjaman } from "@/lib/pencarian";

export const Route = createFileRoute("/_bos/pinjaman")({
  validateSearch: saringPinjaman,
  component: LayarPinjaman,
});
