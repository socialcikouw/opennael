import { createFileRoute, redirect } from "@tanstack/react-router";
import { LayarDaftar } from "@/fitur/akun/layar-daftar";
import { sesi } from "@/lib/sesi";

export const Route = createFileRoute("/daftar")({
  /** Sudah masuk → beranda. */
  beforeLoad: () => {
    if (sesi.ambil()) throw redirect({ to: "/" });
  },
  component: LayarDaftar,
});
