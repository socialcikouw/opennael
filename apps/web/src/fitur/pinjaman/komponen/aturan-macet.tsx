import type { RincianPinjaman } from "@opennael/contracts";
import { tanggal as formatTanggal, rupiah } from "@opennael/format";
import { LABEL_STATUS } from "@/lib/status-pinjaman";

// ---- dialog rincian pinjaman --------------------------------------------------------

/** Aturan macet (aturan-usaha F) dengan jendela 30 hari yang berakhir hari ini. */
export function AturanMacet({ p }: { p: RincianPinjaman }) {
  const m = p.aturanMacet;
  if (!m) return null;
  return (
    <div className="space-y-1 rounded-lg bg-muted/50 px-3 py-2 text-sm">
      <p className="font-medium">Aturan macet</p>
      {p.jenis === "tempoan" ? (
        <p>
          Macet bila belum lunas sesudah {m.batasTempoan ? formatTanggal(m.batasTempoan) : "—"}.
        </p>
      ) : (
        <p>
          Setoran {formatTanggal(m.jendelaAwal, "tanpa")} – {formatTanggal(m.jendelaAkhir, "tanpa")}
          : <span className="font-medium tabular-nums">{rupiah(m.setoranJendela)}</span> dari
          minimal <span className="tabular-nums">{rupiah(m.ambang ?? 0)}</span>.
          {!m.dievaluasi && m.hariTagih !== null
            ? ` Belum dinilai — baru ${m.hariTagih} hari tagih (perlu 15).`
            : ""}
        </p>
      )}
      <p className="text-muted-foreground">
        Bila tak ada setoran lagi hari ini, sapuan malam ini memberi status{" "}
        <span className="font-medium text-foreground">
          {LABEL_STATUS[m.statusMalamIni].label.toLowerCase()}
        </span>
        .
      </p>
    </div>
  );
}
