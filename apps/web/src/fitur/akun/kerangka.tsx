import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  Banknote,
  BookCopy,
  CalendarCheck,
  HandCoins,
  History,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  QrCode,
  Settings,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/komponen/ui/button";
import { api } from "@/lib/api";
import { sesi, useSesi } from "@/lib/sesi";
import { cn } from "@/lib/utils";

type Menu = { ke: string; label: string; ikon: LucideIcon; persis?: boolean };

/** Menu layar bos — urutan = urutan kerja harian. */
const MENU = [
  { ke: "/", label: "Beranda", ikon: LayoutDashboard, persis: true },
  { ke: "/aktivitas", label: "Aktivitas", ikon: History },
  { ke: "/harian", label: "Harian", ikon: CalendarCheck },
  { ke: "/nasabah", label: "Nasabah", ikon: Users, persis: true },
  { ke: "/pinjaman", label: "Pinjaman", ikon: HandCoins },
  { ke: "/nasabah/salin", label: "Salin dari buku", ikon: BookCopy },
  { ke: "/kas", label: "Kas", ikon: Wallet },
  { ke: "/gaji", label: "Gaji", ikon: Banknote },
  { ke: "/karyawan", label: "Karyawan", ikon: UserCog },
  { ke: "/tautkan", label: "Tautkan HP", ikon: QrCode },
  { ke: "/pengaturan", label: "Pengaturan", ikon: Settings },
] as const satisfies readonly Menu[];

function TautanMenu({ menu, ringkas }: { menu: Menu; ringkas?: boolean }) {
  const Ikon = menu.ikon;
  return (
    <Link
      to={menu.ke}
      activeOptions={{ exact: menu.persis ?? false }}
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        "data-[status=active]:bg-primary/10 data-[status=active]:text-primary",
        ringkas && "py-1.5",
      )}
    >
      <Ikon className="size-4" />
      {menu.label}
    </Link>
  );
}

/**
 * KERANGKA LAYAR BOS — menu samping di layar lebar, bilah atas bergulir di
 * HP. Isi halaman di `<Outlet />`.
 */
export function Kerangka() {
  const s = useSesi();
  const navigasi = useNavigate();
  const [keluarBerjalan, setKeluarBerjalan] = useState(false);
  if (!s) return null;

  const keluar = async () => {
    setKeluarBerjalan(true);
    await api.identitas.auth.keluar.$post().catch(() => null);
    sesi.hapus();
    void navigasi({ to: "/masuk" });
  };

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-card md:flex">
        <div className="border-b px-5 py-4">
          <p className="truncate font-semibold">{s.pengguna.kantor.nama}</p>
          <p className="text-xs text-muted-foreground">OpenNael · {s.pengguna.kantor.zonaWaktu}</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {MENU.map((m) => (
            <TautanMenu key={m.ke} menu={m} />
          ))}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
          <span className="truncate text-sm">{s.pengguna.nama}</span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Keluar"
            title="Keluar"
            disabled={keluarBerjalan}
            onClick={() => void keluar()}
          >
            <LogOut />
          </Button>
        </div>
      </aside>

      <div className="sticky top-0 z-40 border-b bg-card md:hidden">
        <div className="flex items-center justify-between px-4 py-2">
          <p className="truncate font-semibold">{s.pengguna.kantor.nama}</p>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Keluar"
            disabled={keluarBerjalan}
            onClick={() => void keluar()}
          >
            <LogOut />
          </Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {MENU.map((m) => (
            <TautanMenu key={m.ke} menu={m} ringkas />
          ))}
        </nav>
      </div>

      <main className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-6 md:px-8 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
