import { geserTanggal } from "@opennael/domain";
import { tanggal as formatTanggal } from "@opennael/format";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/komponen/ui/button";
import { Card } from "@/komponen/ui/card";
import { Input } from "@/komponen/ui/input";
import { cn } from "@/lib/utils";

/** Judul halaman, keterangan pendek, dan tombol aksi di kanan. */
export function KepalaHalaman({
  judul,
  keterangan,
  aksi,
}: {
  judul: string;
  keterangan?: ReactNode;
  aksi?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{judul}</h1>
        {keterangan ? <p className="text-sm text-muted-foreground">{keterangan}</p> : null}
      </div>
      {aksi ? <div className="flex flex-wrap items-center gap-2">{aksi}</div> : null}
    </header>
  );
}

/** Satu angka besar berlabel — baris ringkasan. */
export function KartuAngka({
  label,
  nilai,
  catatan,
  nada,
}: {
  label: string;
  nilai: ReactNode;
  catatan?: ReactNode;
  nada?: "baik" | "buruk";
}) {
  return (
    <Card className="gap-1 px-5 py-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-xl font-semibold tabular-nums sm:text-2xl",
          nada === "baik" && "text-emerald-700",
          nada === "buruk" && "text-red-700",
        )}
      >
        {nilai}
      </span>
      {catatan ? <span className="text-xs text-muted-foreground">{catatan}</span> : null}
    </Card>
  );
}

/** Satu baris label — nilai (nilai rata kanan) di rincian. */
export function BarisNilai({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{children}</span>
    </div>
  );
}

export function Memuat({ teks = "Memuat…" }: { teks?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin" />
      {teks}
    </div>
  );
}

export function Kosong({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/** Galat memuat data + tombol coba lagi. */
export function GalatMuat({ galat, ulangi }: { galat: Error; ulangi?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{galat.message}</span>
      {ulangi ? (
        <Button size="sm" variant="outline" onClick={ulangi}>
          Coba lagi
        </Button>
      ) : null}
    </div>
  );
}

/** Tanggal kantor dengan tombol mundur/maju sehari; tidak bisa melewati `paling`. */
export function PilihTanggal({
  nilai,
  ubah,
  paling,
}: {
  nilai: string;
  ubah: (t: string) => void;
  paling?: string;
}) {
  const bisaMaju = !paling || nilai < paling;
  return (
    <div className="flex items-center gap-1">
      <Button
        size="icon"
        variant="outline"
        aria-label="Sehari sebelumnya"
        onClick={() => ubah(geserTanggal(nilai, -1))}
      >
        <ChevronLeft />
      </Button>
      <Input
        type="date"
        className="w-40"
        value={nilai}
        max={paling}
        aria-label={formatTanggal(nilai)}
        onChange={(e) => e.target.value && ubah(e.target.value)}
      />
      <Button
        size="icon"
        variant="outline"
        aria-label="Sehari sesudahnya"
        disabled={!bisaMaju}
        onClick={() => ubah(geserTanggal(nilai, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
