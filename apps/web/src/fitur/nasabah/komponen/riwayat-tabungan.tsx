import { tanggal as formatTanggal, rupiah } from "@opennael/format";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Undo2 } from "lucide-react";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Medan } from "@/komponen/formulir";
import { GalatMuat, Kosong, Memuat } from "@/komponen/halaman";
import { Button } from "@/komponen/ui/button";
import { Textarea } from "@/komponen/ui/textarea";
import { ambil, api } from "@/lib/api";
import { useHariIni } from "@/lib/kantor";
import { cn } from "@/lib/utils";
import { useSegarkanNasabah } from "../data";

export function RiwayatTabungan({ id }: { id: string }) {
  const hariIni = useHariIni();
  const segarkan = useSegarkanNasabah();
  const [batal, setBatal] = useState<{ id: string; nominal: number } | null>(null);
  const [alasan, setAlasan] = useState("");
  const tarik = useQuery({
    queryKey: ["nasabah", "penarikan", id],
    queryFn: () =>
      ambil(() => api.pembiayaan.nasabah[":id"]["penarikan-tabungan"].$get({ param: { id } })),
  });
  const koreksi = useQuery({
    queryKey: ["nasabah", "koreksi", id],
    queryFn: () =>
      ambil(() => api.pembiayaan.nasabah[":id"]["koreksi-tabungan"].$get({ param: { id } })),
  });
  const kirimBatal = useMutation({
    mutationFn: (penarikanId: string) =>
      ambil(() =>
        api.pembiayaan["penarikan-tabungan"][":id"].batal.$post({
          param: { id: penarikanId },
          json: { alasan: alasan.trim() },
        }),
      ),
    onSuccess: () => {
      segarkan();
      setBatal(null);
      setAlasan("");
    },
  });
  if (tarik.isPending || koreksi.isPending) return <Memuat />;
  if (tarik.isError) return <GalatMuat galat={tarik.error} />;
  if (koreksi.isError) return <GalatMuat galat={koreksi.error} />;

  const baris = [
    ...tarik.data.map((t) => ({
      kunci: `t-${t.id}`,
      tanggal: t.tanggal,
      judul: `Penarikan (${t.dariAkun})`,
      nominal: -t.nominal,
      alasan: t.dibatalkanAt ? `Dibatalkan: ${t.alasanBatal}` : t.alasan,
      oleh: t.dibuatOleh.nama,
      batal: !!t.dibatalkanAt,
      bisaBatal: !t.dibatalkanAt && t.tanggal === hariIni ? t : null,
    })),
    ...koreksi.data.map((k) => ({
      kunci: `k-${k.id}`,
      tanggal: k.tanggal,
      judul: `Koreksi ${rupiah(k.saldoSebelum)} → ${rupiah(k.saldoSesudah)}`,
      nominal: k.selisih,
      alasan: k.alasan,
      oleh: k.dibuatOleh.nama,
      batal: false,
      bisaBatal: null,
    })),
  ].sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  if (baris.length === 0) return <Kosong>Belum ada penarikan atau koreksi</Kosong>;
  return (
    <>
      <ul className="divide-y text-sm">
        {baris.map((b) => (
          <li key={b.kunci} className="flex items-start gap-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className={cn("block font-medium", b.batal && "line-through")}>{b.judul}</span>
              <span className="block text-xs text-muted-foreground">
                {formatTanggal(b.tanggal)} · {b.oleh} · {b.alasan}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 tabular-nums",
                b.batal && "text-muted-foreground line-through",
              )}
            >
              {b.nominal > 0 ? "+" : ""}
              {rupiah(b.nominal)}
            </span>
            {b.bisaBatal ? (
              <Button
                size="icon"
                variant="ghost"
                title="Batalkan penarikan"
                aria-label="Batalkan penarikan"
                onClick={() => {
                  const t = b.bisaBatal;
                  if (t) setBatal({ id: t.id, nominal: t.nominal });
                }}
              >
                <Undo2 />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <DialogFormulir
        judul="Batalkan penarikan?"
        keterangan={`${rupiah(batal?.nominal ?? 0)} kembali ke tabungan nasabah. Hanya di hari yang sama.`}
        buka={batal !== null}
        ubahBuka={(b) => !b && setBatal(null)}
        kirim={() => batal && kirimBatal.mutate(batal.id)}
        memuat={kirimBatal.isPending}
        galat={kirimBatal.error?.message}
        labelKirim="Batalkan"
        bahaya
        bisaKirim={alasan.trim() !== ""}
      >
        <Medan label="Alasan">
          <Textarea value={alasan} maxLength={100} onChange={(e) => setAlasan(e.target.value)} />
        </Medan>
      </DialogFormulir>
    </>
  );
}
