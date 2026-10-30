import { type Aktivitas, tabelBerjejakSchema } from "@opennael/contracts";
import { jam, LABEL_PERAN, rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Banknote,
  BookCopy,
  Eraser,
  HandCoins,
  History,
  Landmark,
  type LucideIcon,
  PencilLine,
  PiggyBank,
  Receipt,
  Scale,
  Undo2,
  Wallet,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { DialogBatal } from "@/komponen/dialog-batal";
import { GalatMuat, Memuat } from "@/komponen/halaman";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import { ambil, api } from "@/lib/api";
import { useHariIni, useKantor } from "@/lib/kantor";
import { cn } from "@/lib/utils";
import { DialogRiwayat } from "./dialog-riwayat";

const IKON: Record<string, LucideIcon> = {
  akad: HandCoins,
  salin_pinjaman: BookCopy,
  pemutihan: Eraser,
  transfer_setoran: ArrowLeftRight,
  terima_kas: Wallet,
  biaya_tak_terduga: Receipt,
  mutasi_kas: Landmark,
  bayar_gaji: Banknote,
  tarik_tabungan: PiggyBank,
  koreksi_tabungan: PencilLine,
  cocokkan_kas: Scale,
};

const ikonKejadian = (k: string) => (k.startsWith("batal_") ? Undo2 : (IKON[k] ?? History));

/**
 * Pembatalan per kejadian uang (bos, hari yang sama). Setoran nasabah
 * dibatalkan dari layar Harian.
 */
const PEMBATAL: Record<string, (id: string, alasan: string) => Promise<unknown>> = {
  akad: (id, alasan) =>
    ambil(() => api.pembiayaan.pinjaman[":id"].batal.$post({ param: { id }, json: { alasan } })),
  salin_pinjaman: (id, alasan) =>
    ambil(() => api.pembiayaan.pinjaman[":id"].batal.$post({ param: { id }, json: { alasan } })),
  pemutihan: (id, alasan) =>
    ambil(() =>
      api.pembiayaan.pinjaman[":id"].putihkan.batal.$post({ param: { id }, json: { alasan } }),
    ),
  transfer_setoran: (id, alasan) =>
    ambil(() =>
      api.hariKolektor["transfer-setoran"][":id"].batal.$post({ param: { id }, json: { alasan } }),
    ),
  terima_kas: (id, alasan) =>
    ambil(() =>
      api.hariKolektor["serah-terima-kas"][":id"].batal.$post({ param: { id }, json: { alasan } }),
    ),
  biaya_tak_terduga: (id, alasan) =>
    ambil(() =>
      api.hariKolektor["biaya-tak-terduga"][":id"].batal.$post({ param: { id }, json: { alasan } }),
    ),
  mutasi_kas: (id, alasan) =>
    ambil(() => api.kas.kas.mutasi[":id"].batal.$post({ param: { id }, json: { alasan } })),
  bayar_gaji: (id, alasan) =>
    ambil(() => api.penggajian.kas.gaji[":id"].batal.$post({ param: { id }, json: { alasan } })),
  tarik_tabungan: (id, alasan) =>
    ambil(() =>
      api.pembiayaan["penarikan-tabungan"][":id"].batal.$post({ param: { id }, json: { alasan } }),
    ),
  cocokkan_kas: (id, alasan) =>
    ambil(() => api.kas.kas.pencocokan[":id"].batal.$post({ param: { id }, json: { alasan } })),
};

/** Kejadian riwayat (bukan uang) bisa dibuka jejaknya lewat `GET /riwayat`. */
const berjejak = (a: Aktivitas) =>
  a.nominal === null && tabelBerjejakSchema.safeParse(a.rujukan.tabel).success;

/** Daftar aktivitas satu tanggal — dipakai beranda (dibatasi) dan layar aktivitas. */
export function DaftarAktivitas({
  tanggal,
  pelakuId,
  batas,
  kosong,
}: {
  tanggal: string;
  pelakuId?: string | undefined;
  batas?: number;
  kosong: ReactNode;
}) {
  const kantor = useKantor();
  const hariIni = useHariIni();
  const [dibuka, setDibuka] = useState<Aktivitas | null>(null);
  const [dibatalkan, setDibatalkan] = useState<Aktivitas | null>(null);
  const q = useQuery({
    queryKey: ["aktivitas", tanggal, pelakuId ?? null],
    queryFn: () =>
      ambil(() =>
        api.pelaporan.aktivitas.$get({ query: { tanggal, ...(pelakuId ? { pelakuId } : {}) } }),
      ),
  });
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  const daftar = batas ? q.data.slice(0, batas) : q.data;
  const sudahBatal = new Set(
    q.data.filter((a) => a.kejadian.startsWith("batal_")).map((a) => a.rujukan.id),
  );
  const bisaBatal = (a: Aktivitas) =>
    tanggal === hariIni && a.kejadian in PEMBATAL && !sudahBatal.has(a.rujukan.id);
  if (daftar.length === 0) return <>{kosong}</>;

  return (
    <>
      <ul className="divide-y">
        {daftar.map((a) => {
          const Ikon = ikonKejadian(a.kejadian);
          const batal = a.kejadian.startsWith("batal_");
          const bisaBuka = berjejak(a);
          const isi = (
            <>
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
                  batal && "bg-red-50 text-red-700",
                  a.nominal !== null && !batal && "bg-primary/10 text-primary",
                )}
              >
                <Ikon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 space-y-0.5">
                <span className={cn("block font-medium", batal && "text-red-700")}>
                  {a.ringkasan}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="tabular-nums">{jam(a.waktu, kantor.zonaWaktu)}</span>
                  <span>{a.pelaku.nama}</span>
                  <Badge variant="secondary">{LABEL_PERAN[a.peran]}</Badge>
                  {a.alasan ? <span className="italic">“{a.alasan}”</span> : null}
                </span>
              </span>
              {a.nominal !== null ? (
                <span className="shrink-0 text-right font-medium tabular-nums">
                  {rupiah(a.nominal)}
                </span>
              ) : null}
            </>
          );
          const tombolBatal = bisaBatal(a) ? (
            <Button
              size="icon"
              variant="ghost"
              title="Batalkan"
              aria-label={`Batalkan: ${a.ringkasan}`}
              className="mt-1.5 shrink-0 text-red-700 hover:text-red-800"
              onClick={() => setDibatalkan(a)}
            >
              <Undo2 />
            </Button>
          ) : null;
          return (
            <li
              key={`${a.rujukan.tabel}-${a.rujukan.id}-${a.kejadian}-${a.waktu}`}
              className="flex items-start gap-1"
            >
              {bisaBuka ? (
                <button
                  type="button"
                  className="flex flex-1 items-start gap-3 py-3 text-left text-sm hover:bg-muted/50"
                  onClick={() => setDibuka(a)}
                >
                  {isi}
                </button>
              ) : (
                <div className="flex flex-1 items-start gap-3 py-3 text-sm">{isi}</div>
              )}
              {tombolBatal}
            </li>
          );
        })}
      </ul>
      {dibuka ? (
        <DialogRiwayat
          tabel={tabelBerjejakSchema.parse(dibuka.rujukan.tabel)}
          barisId={dibuka.rujukan.id}
          judul={dibuka.ringkasan}
          tutup={() => setDibuka(null)}
        />
      ) : null}
      {dibatalkan ? (
        <DialogBatal
          judul={`Batalkan: ${dibatalkan.ringkasan}?`}
          segarkan={[["harian"], ["kas"], ["gaji"], ["nasabah"]]}
          tutup={() => setDibatalkan(null)}
          kirim={(alasan) => {
            const pembatal = PEMBATAL[dibatalkan.kejadian];
            if (!pembatal) throw new Error("Kejadian ini tidak bisa dibatalkan di sini");
            return pembatal(dibatalkan.rujukan.id, alasan);
          }}
        />
      ) : null}
    </>
  );
}
