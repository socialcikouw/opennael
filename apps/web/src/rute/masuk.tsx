import { createFileRoute, redirect } from "@tanstack/react-router";
import { LayarMasuk } from "@/fitur/akun/layar-masuk";
import { sesi } from "@/lib/sesi";

export const Route = createFileRoute("/masuk")({
  /** Sudah masuk → beranda. */
  beforeLoad: () => {
    if (sesi.ambil()) throw redirect({ to: "/" });
  },
  component: LayarMasuk,
});
