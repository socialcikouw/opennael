import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { Button } from "@/komponen/ui/button";
import { Input } from "@/komponen/ui/input";
import { cn } from "@/lib/utils";

/**
 * FORMULIR — pembungkus isian berlabel di atas komponen shadcn/ui, dipakai
 * layar masuk, daftar, tautkan, dan dialog-dialog layar bos.
 */

/** Kartu di tengah layar untuk layar masuk, daftar, dan formulir pendek. */
export function KartuTengah({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-8 shadow-xs">
        <h1 className="text-2xl font-bold">{judul}</h1>
        {children}
      </div>
    </main>
  );
}

/** Kartu formulir pendek di dalam kerangka layar bos. */
export function KartuFormulir({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md space-y-5 rounded-2xl border bg-card p-6 shadow-xs sm:p-8">
      <h1 className="text-2xl font-bold">{judul}</h1>
      {children}
    </div>
  );
}

/** Label + isian apa saja di bawahnya, dengan petunjuk opsional. */
export function Medan({
  label,
  petunjuk,
  children,
  className,
}: {
  label: string;
  petunjuk?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: isian dikirim lewat children
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {petunjuk ? <span className="block text-xs text-muted-foreground">{petunjuk}</span> : null}
    </label>
  );
}

export function Isian({
  label,
  petunjuk,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; petunjuk?: ReactNode }) {
  return (
    <Medan label={label} petunjuk={petunjuk}>
      <Input {...input} />
    </Medan>
  );
}

/** `<select>` bawaan peramban bergaya shadcn — nyaman di HP. */
export function PilihanAsli({ className, ...select }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm",
        className,
      )}
      {...select}
    />
  );
}

export function Pilihan({
  label,
  children,
  ...select
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <Medan label={label}>
      <PilihanAsli {...select}>{children}</PilihanAsli>
    </Medan>
  );
}

/** Tombol lebar penuh untuk formulir; `memuat` menahan klik ganda. */
export function Tombol({
  jenis = "utama",
  memuat,
  children,
  ...tombol
}: ButtonHTMLAttributes<HTMLButtonElement> & { jenis?: "utama" | "kedua"; memuat?: boolean }) {
  return (
    <Button
      size="lg"
      variant={jenis === "utama" ? "default" : "outline"}
      {...tombol}
      disabled={memuat || tombol.disabled}
      className={cn("w-full", tombol.className)}
    >
      {memuat ? "Memproses…" : children}
    </Button>
  );
}

export function PesanGalat({ pesan }: { pesan: string | null | undefined }) {
  if (!pesan) return null;
  return <p className="rounded-md bg-bahaya-lembut px-3 py-2 text-sm text-bahaya">{pesan}</p>;
}
