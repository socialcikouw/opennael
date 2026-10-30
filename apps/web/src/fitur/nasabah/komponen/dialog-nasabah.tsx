import { rupiah } from "@opennael/format";
import {
  ArrowRightLeft,
  Ban,
  Eraser,
  History,
  LockOpen,
  MapPin,
  Pencil,
  PencilLine,
  PiggyBank,
  ShieldAlert,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { DialogRiwayat } from "@/fitur/aktivitas";
import { TabPeristiwa, TabPinjaman } from "@/fitur/pinjaman";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/komponen/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/komponen/ui/tabs";
import type { Kolektor, Nasabah } from "../inti";
import { DialogBukaBlokir } from "./dialog-buka-blokir";
import { DialogKoreksiTabungan } from "./dialog-koreksi-tabungan";
import { DialogPindah } from "./dialog-pindah";
import { DialogPutihkan } from "./dialog-putihkan";
import { DialogRem } from "./dialog-rem";
import { DialogSunting } from "./dialog-sunting";
import { DialogTarikTabungan } from "./dialog-tarik-tabungan";
import { Neraca } from "./neraca";
import { RiwayatTabungan } from "./riwayat-tabungan";

// ---- dialog rincian ---------------------------------------------------------------

type Aksi = "sunting" | "pindah" | "tarik" | "koreksi" | "putihkan" | "buka-blokir" | "rem";

/** Rincian satu nasabah: identitas, neraca, tabungan, dan semua aksi bos. */
export function DialogNasabah({
  n,
  kolektor,
  kampung,
  tutup,
}: {
  n: Nasabah;
  kolektor: Kolektor[];
  kampung: string[];
  tutup: () => void;
}) {
  const [aksi, setAksi] = useState<Aksi | null>(null);
  const [riwayat, setRiwayat] = useState(false);
  const selesai = () => setAksi(null);
  const p = n.pinjamanAktif;

  const tombol: { aksi: Aksi; label: string; ikon: ReactNode; tampil: boolean }[] = [
    { aksi: "sunting", label: "Sunting", ikon: <Pencil />, tampil: true },
    { aksi: "pindah", label: "Pindah pemegang", ikon: <ArrowRightLeft />, tampil: true },
    { aksi: "tarik", label: "Tarik tabungan", ikon: <PiggyBank />, tampil: !!n.saldoTabungan },
    { aksi: "koreksi", label: "Koreksi tabungan", ikon: <PencilLine />, tampil: true },
    { aksi: "rem", label: "Rem", ikon: <ShieldAlert />, tampil: true },
    { aksi: "putihkan", label: "Putihkan", ikon: <Eraser />, tampil: !!p },
    { aksi: "buka-blokir", label: "Buka blokir", ikon: <LockOpen />, tampil: !!n.diblokir },
  ];

  return (
    <>
      <Dialog open onOpenChange={(b) => !b && tutup()}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {n.nama}
              {n.diblokir ? (
                <Badge variant="destructive">
                  <Ban />
                  Diblokir
                </Badge>
              ) : null}
              {p ? (
                <Badge variant={p.status === "macet" ? "warning" : "success"}>
                  {p.status === "macet" ? "Macet" : "Berjalan"} · {rupiah(p.saldo)}
                </Badge>
              ) : (
                <Badge variant="secondary">Tanpa pinjaman aktif</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {n.kampung.nama} · dipegang {n.kolektor?.nama ?? "—"}
              {n.nomorHp ? ` · ${n.nomorHp}` : ""}
              {n.nik ? ` · NIK ${n.nik}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {tombol
              .filter((t) => t.tampil)
              .map((t) => (
                <Button
                  key={t.aksi}
                  size="sm"
                  variant={t.aksi === "putihkan" ? "destructive" : "outline"}
                  onClick={() => setAksi(t.aksi)}
                >
                  {t.ikon}
                  {t.label}
                </Button>
              ))}
            <Button size="sm" variant="ghost" onClick={() => setRiwayat(true)}>
              <History />
              Riwayat suntingan
            </Button>
            {n.lokasi ? (
              <Button size="sm" variant="ghost" asChild>
                <a
                  href={`https://www.google.com/maps?q=${n.lokasi.latitude},${n.lokasi.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin />
                  Titik rumah
                </a>
              </Button>
            ) : null}
          </div>

          <Tabs defaultValue="pinjaman">
            <TabsList>
              <TabsTrigger value="pinjaman">Pinjaman</TabsTrigger>
              <TabsTrigger value="peristiwa">Setoran & libur</TabsTrigger>
              <TabsTrigger value="neraca">Neraca</TabsTrigger>
              <TabsTrigger value="tabungan">Tabungan · {rupiah(n.saldoTabungan ?? 0)}</TabsTrigger>
            </TabsList>
            <TabsContent value="pinjaman">
              <TabPinjaman nasabahId={n.id} />
            </TabsContent>
            <TabsContent value="peristiwa">
              <TabPeristiwa nasabahId={n.id} />
            </TabsContent>
            <TabsContent value="neraca">
              <Neraca id={n.id} />
            </TabsContent>
            <TabsContent value="tabungan">
              <RiwayatTabungan id={n.id} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {aksi === "sunting" ? <DialogSunting n={n} kampung={kampung} tutup={selesai} /> : null}
      {aksi === "pindah" ? <DialogPindah n={n} kolektor={kolektor} tutup={selesai} /> : null}
      {aksi === "tarik" ? <DialogTarikTabungan n={n} tutup={selesai} /> : null}
      {aksi === "koreksi" ? <DialogKoreksiTabungan n={n} tutup={selesai} /> : null}
      {aksi === "putihkan" ? <DialogPutihkan n={n} tutup={selesai} /> : null}
      {aksi === "buka-blokir" ? <DialogBukaBlokir n={n} tutup={selesai} /> : null}
      {aksi === "rem" ? <DialogRem n={n} tutup={selesai} /> : null}
      {riwayat ? (
        <DialogRiwayat
          tabel="nasabah"
          barisId={n.id}
          judul={`Riwayat suntingan ${n.nama}`}
          tutup={() => setRiwayat(false)}
        />
      ) : null}
    </>
  );
}
