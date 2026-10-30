import type { HariKas } from "@opennael/contracts";
import { rupiah } from "@opennael/format";
import { cn } from "@/lib/utils";

export function RincianKas({ hari }: { hari: HariKas }) {
  const r = hari.rincian;
  const st = hari.serahTerima;
  if (!r || !st) return null;
  const baris: [string, number][] = [
    ["Kas lapangan (dibawa pagi)", r.kasLapangan],
    ["+ Storting", r.storting],
    ["+ Tabungan masuk akad", r.tabunganMasuk],
    ["+ Potongan admin", r.potonganAdmin],
    ["− Droping", -r.droping],
    ["− Transfer setoran", -r.transfer],
    ["− Biaya tak terduga", -r.biaya],
  ];
  return (
    <div className="space-y-1 text-sm">
      {baris.map(([l, n]) => (
        <div key={l} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{l}</span>
          <span className="tabular-nums">{rupiah(n)}</span>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t pt-1 font-medium">
        <span>Tunai seharusnya</span>
        <span className="tabular-nums">{rupiah(st.tunaiSeharusnya)}</span>
      </div>
      <div className="flex justify-between gap-4 font-medium">
        <span>Tunai diterima</span>
        <span className="tabular-nums">{rupiah(st.tunaiDiterima)}</span>
      </div>
      <div
        className={cn(
          "flex justify-between gap-4 font-semibold",
          st.selisihSetor < 0 && "text-red-700",
          st.selisihSetor > 0 && "text-emerald-700",
        )}
      >
        <span>{st.selisihSetor < 0 ? "Tekor" : st.selisihSetor > 0 ? "Lebih setor" : "Pas"}</span>
        <span className="tabular-nums">{rupiah(st.selisihSetor)}</span>
      </div>
    </div>
  );
}
