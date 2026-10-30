import { angka } from "@opennael/format";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Medan } from "@/komponen/formulir";
import { Input } from "@/komponen/ui/input";

/**
 * ISIAN RUPIAH — diketik dengan pemisah ribuan otomatis ("1.250.000");
 * nilainya bilangan bulat atau `null` saat kosong.
 */
export function IsianRupiah({
  label,
  nilai,
  ubah,
  petunjuk,
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  label: string;
  nilai: number | null;
  ubah: (n: number | null) => void;
  petunjuk?: ReactNode;
}) {
  return (
    <Medan label={label} petunjuk={petunjuk}>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
          Rp
        </span>
        <Input
          inputMode="numeric"
          autoComplete="off"
          className="pl-9 tabular-nums"
          value={nilai === null ? "" : angka(nilai)}
          onChange={(e) => {
            const digit = e.target.value.replace(/\D/g, "");
            ubah(digit === "" ? null : Number(digit.slice(0, 15)));
          }}
          {...input}
        />
      </div>
    </Medan>
  );
}
