import { createFileRoute, redirect } from "@tanstack/react-router";
import { Kerangka } from "@/fitur/akun/kerangka";
import { sesi } from "@/lib/sesi";

/** Kerangka semua layar bos (menu + isi): tanpa sesi → masuk. */
export const Route = createFileRoute("/_bos")({
  beforeLoad: () => {
    if (!sesi.ambil()) throw redirect({ to: "/masuk" });
  },
  component: Kerangka,
});
