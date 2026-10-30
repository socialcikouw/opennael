import type { KartuPinjaman } from "@opennael/contracts";
import { rupiah } from "@opennael/format";
import { Badge } from "@/komponen/ui/badge";

/** Tertinggal & tunggakan (aturan-usaha B5) dan rem gulung yang berlaku. */
export function LencanaTagih({ p }: { p: KartuPinjaman }) {
  return (
    <>
      {p.tagih && p.tagih.tertinggal > 0 ? (
        <Badge variant="warning">
          Tertinggal {p.jenis === "tempoan" ? "jatuh tempo" : `${p.tagih.tertinggal}×`} ·{" "}
          {rupiah(p.tagih.tunggakan)}
        </Badge>
      ) : null}
      {p.kunciGulung?.gulung ? (
        <Badge variant="outline">Gulung dikunci</Badge>
      ) : p.kunciGulung?.naik ? (
        <Badge variant="outline">Naik dikunci</Badge>
      ) : null}
    </>
  );
}
