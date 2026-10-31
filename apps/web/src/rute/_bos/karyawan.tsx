import { createFileRoute } from "@tanstack/react-router";
import { LayarKaryawan } from "@/fitur/karyawan/layar-karyawan";
import { saringKaryawan } from "@/lib/pencarian";

export const Route = createFileRoute("/_bos/karyawan")({
  validateSearch: saringKaryawan,
  component: LayarKaryawan,
});
