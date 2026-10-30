import type { Peran } from "@opennael/contracts";
import { LABEL_PERAN, tanggal } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { Pencil, Power, PowerOff, QrCode, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";
import { GalatMuat, KepalaHalaman, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/komponen/ui/tabs";
import { useSesi } from "@/lib/sesi";
import { type Aksi, ambilPengguna, type Karyawan } from "./data";
import { DialogAktifkan } from "./komponen/dialog-aktifkan";
import { DialogNonaktifkan } from "./komponen/dialog-nonaktifkan";
import { DialogPerangkat } from "./komponen/dialog-perangkat";
import { DialogSunting } from "./komponen/dialog-sunting";

const rute = getRouteApi("/_bos/karyawan");

const SARINGAN: { nilai: Peran | "semua"; label: string }[] = [
  { nilai: "semua", label: "Semua" },
  { nilai: "kolektor", label: "Kolektor" },
  { nilai: "kasir", label: "Kasir" },
  { nilai: "pengawas", label: "Pengawas" },
];

/** Daftar karyawan: sunting, nonaktifkan / aktifkan, tautkan HP. */
export function LayarKaryawan() {
  const s = useSesi();
  const { peran, nonaktif } = rute.useSearch();
  const navigasi = rute.useNavigate();
  const [aksi, setAksi] = useState<Aksi>(null);
  const q = useQuery({ queryKey: ["pengguna", "semua"], queryFn: ambilPengguna });

  const data = useMemo(
    () =>
      (q.data ?? []).filter((o) => (!peran || o.peran === peran) && (nonaktif === "ya" || o.aktif)),
    [q.data, peran, nonaktif],
  );

  const kolom = useMemo(() => {
    const k = pembantuKolom<Karyawan>();
    return [
      k.accessor("nama", {
        header: "Nama",
        cell: (c) => (
          <span className="font-medium">
            {c.getValue()}
            {c.row.original.id === s?.pengguna.id ? (
              <span className="text-muted-foreground"> (Anda)</span>
            ) : null}
          </span>
        ),
      }),
      k.accessor("peran", {
        header: "Peran",
        cell: (c) => <Badge variant="secondary">{LABEL_PERAN[c.getValue()]}</Badge>,
      }),
      k.accessor("nomorHp", { header: "Nomor HP", cell: (c) => c.getValue() ?? "—" }),
      k.accessor("resort", { header: "Resort", cell: (c) => c.getValue() ?? "—" }),
      k.accessor("perangkatAktif", {
        header: "HP tertaut",
        meta: { kanan: true },
        cell: (c) => (
          <Button
            size="sm"
            variant="ghost"
            className="tabular-nums"
            title="Lihat perangkat"
            onClick={() => setAksi({ jenis: "perangkat", orang: c.row.original })}
          >
            <Smartphone />
            {c.getValue()}
          </Button>
        ),
      }),
      k.accessor("aktif", {
        header: "Status",
        cell: (c) => {
          const o = c.row.original;
          return o.aktif ? (
            <Badge variant="success">Aktif</Badge>
          ) : (
            <span className="space-y-0.5">
              <Badge variant="destructive">Nonaktif</Badge>
              <span className="block max-w-56 truncate text-xs text-muted-foreground">
                {o.dinonaktifkanAt ? tanggal(o.dinonaktifkanAt.slice(0, 10), "tanpa") : ""}
                {o.alasanNonaktif ? ` · ${o.alasanNonaktif}` : ""}
              </span>
            </span>
          );
        },
      }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const o = c.row.original;
          const diri = o.id === s?.pengguna.id;
          return (
            <div className="flex justify-end gap-1">
              <Button
                size="icon"
                variant="ghost"
                title="Sunting"
                aria-label={`Sunting ${o.nama}`}
                onClick={() => setAksi({ jenis: "sunting", orang: o })}
              >
                <Pencil />
              </Button>
              {diri ? null : o.aktif ? (
                <Button
                  size="icon"
                  variant="ghost"
                  title="Nonaktifkan"
                  aria-label={`Nonaktifkan ${o.nama}`}
                  className="text-red-700 hover:text-red-800"
                  onClick={() => setAksi({ jenis: "nonaktifkan", orang: o })}
                >
                  <PowerOff />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  title="Aktifkan"
                  aria-label={`Aktifkan ${o.nama}`}
                  onClick={() => setAksi({ jenis: "aktifkan", orang: o })}
                >
                  <Power />
                </Button>
              )}
            </div>
          );
        },
      }),
    ] as Kolom<Karyawan>[];
  }, [s?.pengguna.id]);

  const tutup = () => setAksi(null);

  return (
    <>
      <KepalaHalaman
        judul="Karyawan"
        keterangan="Akun kasir, pengawas, dan kolektor. Akun baru dibuat saat menautkan HP."
        aksi={
          <Button asChild>
            <Link to="/tautkan">
              <QrCode />
              Tautkan HP
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={peran ?? "semua"}
          onValueChange={(v) =>
            void navigasi({
              search: (x) => ({ ...x, peran: v === "semua" ? undefined : (v as Peran) }),
            })
          }
        >
          <TabsList>
            {SARINGAN.map((p) => (
              <TabsTrigger key={p.nilai} value={p.nilai}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={nonaktif === "ya"}
            onChange={(e) =>
              void navigasi({
                search: (x) => ({ ...x, nonaktif: e.target.checked ? "ya" : undefined }),
              })
            }
          />
          Tampilkan yang nonaktif
        </label>
      </div>
      {q.isPending ? (
        <Memuat />
      ) : q.isError ? (
        <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />
      ) : (
        <TabelData kolom={kolom} data={data} idBaris={(o) => o.id} kosong="Belum ada karyawan" />
      )}
      {aksi?.jenis === "sunting" ? <DialogSunting orang={aksi.orang} tutup={tutup} /> : null}
      {aksi?.jenis === "nonaktifkan" ? (
        <DialogNonaktifkan orang={aksi.orang} tutup={tutup} />
      ) : null}
      {aksi?.jenis === "aktifkan" ? <DialogAktifkan orang={aksi.orang} tutup={tutup} /> : null}
      {aksi?.jenis === "perangkat" ? <DialogPerangkat orang={aksi.orang} tutup={tutup} /> : null}
    </>
  );
}
