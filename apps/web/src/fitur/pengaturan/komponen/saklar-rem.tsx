import { Isian } from "@/komponen/formulir";
import type { IsiRem } from "../inti";

export function SaklarRem({ isi, ubah }: { isi: IsiRem; ubah: (r: IsiRem) => void }) {
  return (
    <div className="space-y-2">
      {(
        [
          ["baru", "Kunci pinjaman baru (orang baru & pinjam lagi)"],
          ["naik", "Kunci naik pinjaman"],
          ["gulung", "Kunci gulung"],
        ] as const
      ).map(([k, label]) => (
        <label key={k} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={isi[k]}
            onChange={(e) => ubah({ ...isi, [k]: e.target.checked })}
          />
          {label}
        </label>
      ))}
      <Isian
        label="Alasan (tampil di HP kolektor)"
        value={isi.alasan}
        maxLength={100}
        onChange={(e) => ubah({ ...isi, alasan: e.target.value })}
      />
    </div>
  );
}
