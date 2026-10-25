import { type Peran, peranSchema } from "@opennael/contracts";
import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { Kerangka } from "./komponen/kerangka";
import { LayarDaftar } from "./layar/daftar";
import { LayarMasuk } from "./layar/masuk";
import type { TabPengaturan } from "./layar/pengaturan";
import { tanggalSah, teksSah } from "./lib/kantor";
import { sesi } from "./lib/sesi";

// Layar bos dimuat saat dibuka (satu potongan per layar); masuk & daftar ikut bundel awal.
const akar = createRootRoute({ component: () => <Outlet /> });

/** Layar bos: tanpa sesi → masuk. */
const wajibMasuk = () => {
  if (!sesi.ambil()) throw redirect({ to: "/masuk" });
};
/** Layar masuk/daftar: sudah masuk → beranda. */
const sudahMasuk = () => {
  if (sesi.ambil()) throw redirect({ to: "/" });
};

/** Kerangka semua layar bos (menu + isi); id rute anak diawali `/bos`. */
const bos = createRoute({
  getParentRoute: () => akar,
  id: "bos",
  beforeLoad: wajibMasuk,
  component: Kerangka,
});

/** Saringan pencarian — semua kunci opsional supaya tautan tanpa `search` tetap sah. */
const saringTanggal = (s: Record<string, unknown>): { tanggal?: string } => ({
  tanggal: tanggalSah(s.tanggal),
});

const beranda = createRoute({
  getParentRoute: () => bos,
  path: "/",
  validateSearch: saringTanggal,
  component: lazyRouteComponent(() => import("./layar/beranda"), "LayarBeranda"),
});
const aktivitas = createRoute({
  getParentRoute: () => bos,
  path: "/aktivitas",
  validateSearch: (s: Record<string, unknown>): { tanggal?: string; pelaku?: string } => ({
    ...saringTanggal(s),
    pelaku: teksSah(s.pelaku),
  }),
  component: lazyRouteComponent(() => import("./layar/aktivitas"), "LayarAktivitas"),
});
const karyawan = createRoute({
  getParentRoute: () => bos,
  path: "/karyawan",
  validateSearch: (s: Record<string, unknown>): { peran?: Peran; nonaktif?: "ya" } => ({
    peran: peranSchema.safeParse(s.peran).data,
    nonaktif: s.nonaktif === "ya" ? "ya" : undefined,
  }),
  component: lazyRouteComponent(() => import("./layar/karyawan"), "LayarKaryawan"),
});
const TAB_HARIAN = ["setoran", "libur", "transfer", "biaya"] as const;
const harian = createRoute({
  getParentRoute: () => bos,
  path: "/harian",
  validateSearch: (
    s: Record<string, unknown>,
  ): { tanggal?: string; tab?: (typeof TAB_HARIAN)[number] } => ({
    ...saringTanggal(s),
    tab: TAB_HARIAN.find((t) => t === s.tab),
  }),
  component: lazyRouteComponent(() => import("./layar/harian"), "LayarHarian"),
});
const kas = createRoute({
  getParentRoute: () => bos,
  path: "/kas",
  validateSearch: (
    s: Record<string, unknown>,
  ): { mulai?: string; selesai?: string; tab?: "cocok" } => ({
    mulai: tanggalSah(s.mulai),
    selesai: tanggalSah(s.selesai),
    tab: s.tab === "cocok" ? "cocok" : undefined,
  }),
  component: lazyRouteComponent(() => import("./layar/kas"), "LayarKas"),
});
const gaji = createRoute({
  getParentRoute: () => bos,
  path: "/gaji",
  validateSearch: (
    s: Record<string, unknown>,
  ): { kolektor?: string; mulai?: string; selesai?: string } => ({
    kolektor: teksSah(s.kolektor),
    mulai: tanggalSah(s.mulai),
    selesai: tanggalSah(s.selesai),
  }),
  component: lazyRouteComponent(() => import("./layar/gaji"), "LayarGaji"),
});
const nasabah = createRoute({
  getParentRoute: () => bos,
  path: "/nasabah",
  validateSearch: (
    s: Record<string, unknown>,
  ): { cari?: string; kolektor?: string; pilih?: string } => ({
    cari: teksSah(s.cari),
    kolektor: teksSah(s.kolektor),
    pilih: teksSah(s.pilih),
  }),
  component: lazyRouteComponent(() => import("./layar/nasabah"), "LayarNasabah"),
});
const pinjaman = createRoute({
  getParentRoute: () => bos,
  path: "/pinjaman",
  validateSearch: (
    s: Record<string, unknown>,
  ): { kolektor?: string; status?: "selesai" | "semua"; tunggak?: "ya"; pilih?: string } => ({
    kolektor: teksSah(s.kolektor),
    status: s.status === "selesai" || s.status === "semua" ? s.status : undefined,
    tunggak: s.tunggak === "ya" ? "ya" : undefined,
    pilih: teksSah(s.pilih),
  }),
  component: lazyRouteComponent(() => import("./layar/pinjaman"), "LayarPinjaman"),
});
const TAB_PENGATURAN = ["rem", "libur", "tarif", "rute", "kampung"] as const;
const pengaturan = createRoute({
  getParentRoute: () => bos,
  path: "/pengaturan",
  validateSearch: (s: Record<string, unknown>): { tab?: Exclude<TabPengaturan, "kantor"> } => ({
    tab: TAB_PENGATURAN.find((t) => t === s.tab),
  }),
  component: lazyRouteComponent(() => import("./layar/pengaturan"), "LayarPengaturan"),
});
const salinBuku = createRoute({
  getParentRoute: () => bos,
  path: "/nasabah/salin",
  component: lazyRouteComponent(() => import("./layar/salin-buku"), "LayarSalinBuku"),
});
const tautkan = createRoute({
  getParentRoute: () => bos,
  path: "/tautkan",
  component: lazyRouteComponent(() => import("./layar/tautkan"), "LayarTautkan"),
});

const masuk = createRoute({
  getParentRoute: () => akar,
  path: "/masuk",
  beforeLoad: sudahMasuk,
  component: LayarMasuk,
});
const daftar = createRoute({
  getParentRoute: () => akar,
  path: "/daftar",
  beforeLoad: sudahMasuk,
  component: LayarDaftar,
});

export const router = createRouter({
  routeTree: akar.addChildren([
    bos.addChildren([
      beranda,
      aktivitas,
      harian,
      nasabah,
      pinjaman,
      salinBuku,
      kas,
      gaji,
      karyawan,
      tautkan,
      pengaturan,
    ]),
    masuk,
    daftar,
  ]),
});

// Sesi dicabut (refresh ditolak / keluar di tab lain) → muat ulang aturan rute.
sesi.dengar(() => void router.invalidate());

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
