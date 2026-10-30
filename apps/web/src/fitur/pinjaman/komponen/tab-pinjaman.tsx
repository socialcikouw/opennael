import { tanggal as formatTanggal, rupiah } from "@opennael/format";
import { useState } from "react";
import { GalatMuat, Kosong, Memuat } from "@/komponen/halaman";
import { useBuku } from "../data";
import { judulPinjaman } from "../inti";
import { DialogPinjaman } from "./dialog-pinjaman";
import { LencanaStatus } from "./lencana-status";
import { LencanaTagih } from "./lencana-tagih";

// ---- tab pinjaman -------------------------------------------------------------------

export function TabPinjaman({ nasabahId }: { nasabahId: string }) {
  const q = useBuku(nasabahId);
  const [pilih, setPilih] = useState<string | null>(null);
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  // Terbaru di atas.
  const daftar = [...q.data.pinjaman].reverse();
  if (daftar.length === 0) return <Kosong>Belum pernah meminjam</Kosong>;
  return (
    <>
      <ul className="space-y-2">
        {daftar.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="w-full space-y-1 rounded-lg border px-3 py-2.5 text-left text-sm hover:bg-muted/50"
              onClick={() => setPilih(p.id)}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{judulPinjaman(p)}</span>
                <LencanaStatus status={p.status} />
                <LencanaTagih p={p} />
              </span>
              <span className="block text-xs text-muted-foreground tabular-nums">
                Akad {formatTanggal(p.tanggalAkad, "tanpa")} · pokok {rupiah(p.pokok)} · saldo{" "}
                {rupiah(p.saldo)}
                {p.jenis === "tempoan"
                  ? p.jatuhTempo
                    ? ` · jatuh tempo ${formatTanggal(p.jatuhTempo, "tanpa")}`
                    : ""
                  : ` · angsuran ${rupiah(p.angsuran)} · ke-${p.angsuranKe}/${p.tenor}`}
                {p.tanggalSelesai ? ` · selesai ${formatTanggal(p.tanggalSelesai, "tanpa")}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {pilih ? (
        <DialogPinjaman id={pilih} nasabahId={nasabahId} tutup={() => setPilih(null)} />
      ) : null}
    </>
  );
}
