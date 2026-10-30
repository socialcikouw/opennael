import type { Aktivitas, TabelBerjejak } from "@opennael/contracts";
import { tabelBerjejakSchema } from "@opennael/contracts";
import { tanggal as formatTanggal, jam, LABEL_PERAN, rupiah, waktu } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
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
import { PilihanAsli } from "@/komponen/formulir";
import { GalatMuat, KepalaHalaman, Kosong, Memuat, PilihTanggal } from "@/komponen/halaman";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import { Card, CardContent } from "@/komponen/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/komponen/ui/dialog";
import { ambil, api } from "@/lib/api";
import { useHariIni, useKantor } from "@/lib/kantor";
import { cn } from "@/lib/utils";

const rute = getRouteApi("/bos/aktivitas");

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
    ambil(() => api.pinjaman[":id"].batal.$post({ param: { id }, json: { alasan } })),
  salin_pinjaman: (id, alasan) =>
    ambil(() => api.pinjaman[":id"].batal.$post({ param: { id }, json: { alasan } })),
  pemutihan: (id, alasan) =>
    ambil(() => api.pinjaman[":id"].putihkan.batal.$post({ param: { id }, json: { alasan } })),
  transfer_setoran: (id, alasan) =>
    ambil(() => api["transfer-setoran"][":id"].batal.$post({ param: { id }, json: { alasan } })),
  terima_kas: (id, alasan) =>
    ambil(() => api["serah-terima-kas"][":id"].batal.$post({ param: { id }, json: { alasan } })),
  biaya_tak_terduga: (id, alasan) =>
    ambil(() => api["biaya-tak-terduga"][":id"].batal.$post({ param: { id }, json: { alasan } })),
  mutasi_kas: (id, alasan) =>
    ambil(() => api.kas.mutasi[":id"].batal.$post({ param: { id }, json: { alasan } })),
  bayar_gaji: (id, alasan) =>
    ambil(() => api.kas.gaji[":id"].batal.$post({ param: { id }, json: { alasan } })),
  tarik_tabungan: (id, alasan) =>
    ambil(() => api["penarikan-tabungan"][":id"].batal.$post({ param: { id }, json: { alasan } })),
  cocokkan_kas: (id, alasan) =>
    ambil(() => api.kas.pencocokan[":id"].batal.$post({ param: { id }, json: { alasan } })),
};

/** Kejadian riwayat (bukan uang) bisa dibuka jejaknya lewat `GET /riwayat`. */
const berjejak = (a: Aktivitas) =>
  a.nominal === null && tabelBerjejakSchema.safeParse(a.rujukan.tabel).success;

/** Nilai kolom riwayat untuk tampilan: teks apa adanya, selain itu JSON ringkas. */
const teksNilai = (v: unknown) =>
  v === null || v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v);

/** Jejak perubahan satu baris: sebelum → sesudah per kolom. */
export function DialogRiwayat({
  tabel,
  barisId,
  judul,
  tutup,
}: {
  tabel: TabelBerjejak;
  barisId: string;
  judul: string;
  tutup: () => void;
}) {
  const kantor = useKantor();
  const q = useQuery({
    queryKey: ["riwayat", tabel, barisId],
    queryFn: () => ambil(() => api.riwayat.$get({ query: { tabel, barisId } })),
  });
  return (
    <Dialog open onOpenChange={(buka) => !buka && tutup()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{judul}</DialogTitle>
          <DialogDescription>Semua perubahan pada data ini, terbaru dulu.</DialogDescription>
        </DialogHeader>
        {q.isPending ? (
          <Memuat />
        ) : q.isError ? (
          <GalatMuat galat={q.error} />
        ) : q.data.length === 0 ? (
          <Kosong>Belum pernah diubah</Kosong>
        ) : (
          <ol className="space-y-4">
            {q.data.map((j) => {
              const kunci = [
                ...new Set([...Object.keys(j.sebelum ?? {}), ...Object.keys(j.sesudah ?? {})]),
              ];
              return (
                <li key={`${j.waktu}-${j.aksi}`} className="space-y-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{j.aksi.replaceAll("_", " ")}</span>
                    <span className="text-muted-foreground">
                      {j.pelaku.nama} · {waktu(j.waktu, kantor.zonaWaktu)}
                    </span>
                  </div>
                  {j.alasan ? <p className="text-sm text-muted-foreground">{j.alasan}</p> : null}
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    {kunci.map((kk) => (
                      <div key={kk} className="contents">
                        <dt className="text-muted-foreground">{kk}</dt>
                        <dd className="break-all">
                          <span className="text-red-700 line-through">
                            {teksNilai(j.sebelum?.[kk])}
                          </span>{" "}
                          → <span className="text-emerald-700">{teksNilai(j.sesudah?.[kk])}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}

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
      ambil(() => api.aktivitas.$get({ query: { tanggal, ...(pelakuId ? { pelakuId } : {}) } })),
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

/** Layar aktivitas: siapa melakukan apa, per tanggal, bisa disaring per orang. */
export function LayarAktivitas() {
  const hariIni = useHariIni();
  const { tanggal, pelaku } = rute.useSearch();
  const navigasi = rute.useNavigate();
  const t = tanggal ?? hariIni;
  const orang = useQuery({
    queryKey: ["pengguna", "semua"],
    queryFn: () => ambil(() => api.pengguna.$get({ query: { termasukNonaktif: "ya" } })),
  });

  return (
    <>
      <KepalaHalaman
        judul="Aktivitas"
        keterangan={`Siapa melakukan apa · ${formatTanggal(t)}. Ketuk suntingan untuk melihat isi sebelum & sesudahnya.`}
        aksi={
          <>
            <PilihanAsli
              className="w-48"
              aria-label="Saring orang"
              value={pelaku ?? ""}
              onChange={(e) =>
                void navigasi({ search: (s) => ({ ...s, pelaku: e.target.value || undefined }) })
              }
            >
              <option value="">Semua orang</option>
              {orang.data?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nama} ({LABEL_PERAN[o.peran]})
                </option>
              ))}
            </PilihanAsli>
            <PilihTanggal
              nilai={t}
              paling={hariIni}
              ubah={(baru) =>
                void navigasi({
                  search: (s) => ({ ...s, tanggal: baru === hariIni ? undefined : baru }),
                })
              }
            />
          </>
        }
      />
      <Card>
        <CardContent>
          <DaftarAktivitas
            tanggal={t}
            pelakuId={pelaku}
            kosong={<Kosong>Tidak ada aktivitas pada tanggal ini</Kosong>}
          />
        </CardContent>
      </Card>
    </>
  );
}
