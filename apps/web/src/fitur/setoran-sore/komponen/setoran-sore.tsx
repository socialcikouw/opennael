import type { HariKas } from "@opennael/contracts";
import { jam, rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { HandCoins, Pencil, RotateCcw, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DialogBatal } from "@/komponen/dialog-batal";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { GalatMuat, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import { ambil, api } from "@/lib/api";
import { useKantor } from "@/lib/kantor";
import { KUNCI_HARIAN } from "../data";
import { DialogTerimaKas } from "./dialog-terima-kas";
import { DialogUbahHariIni } from "./dialog-ubah-hari-ini";
import { RincianKas } from "./rincian-kas";
import { TombolSel } from "./tombol-sel";

export function SetoranSore({ tanggal, hariIni }: { tanggal: string; hariIni: string }) {
  const kantor = useKantor();
  const [terima, setTerima] = useState<HariKas | null>(null);
  const [batal, setBatal] = useState<HariKas | null>(null);
  const [rinci, setRinci] = useState<HariKas | null>(null);
  const [betulkan, setBetulkan] = useState<HariKas | null>(null);
  const [bukaLagi, setBukaLagi] = useState<HariKas | null>(null);
  const q = useQuery({
    queryKey: ["harian", "hari-kolektor", tanggal],
    queryFn: () => ambil(() => api.hariKolektor["hari-kolektor"].$get({ query: { tanggal } })),
  });
  const hariIniSaja = tanggal === hariIni;

  const kolom = useMemo(() => {
    const k = pembantuKolom<HariKas>();
    return [
      k.accessor((h) => h.kolektor.nama, {
        id: "kolektor",
        header: "Kolektor",
        cell: (c) => <span className="font-medium">{c.getValue()}</span>,
      }),
      k.accessor("absensi", {
        header: "Hari ini",
        cell: (c) => {
          const h = c.row.original;
          if (h.absensi === "tidak_kerja")
            return (
              <span className="text-muted-foreground">
                Tidak kerja{h.alasanTidakKerja ? ` · ${h.alasanTidakKerja}` : ""}
              </span>
            );
          if (h.serahTerima) return <Badge variant="success">Kas diterima</Badge>;
          if (h.laporanDibukaAt)
            return (
              <Badge variant="warning">Laporan {jam(h.laporanDibukaAt, kantor.zonaWaktu)}</Badge>
            );
          return <Badge variant="secondary">Di lapangan</Badge>;
        },
      }),
      k.accessor("kasLapangan", {
        header: "Kas lapangan",
        meta: { kanan: true },
        cell: (c) => rupiah(c.getValue()),
      }),
      k.accessor("uangJalan", {
        header: "Uang jalan",
        meta: { kanan: true },
        cell: (c) => rupiah(c.getValue()),
      }),
      k.accessor((h) => h.serahTerima?.tunaiSeharusnya ?? null, {
        id: "seharusnya",
        header: "Seharusnya",
        meta: { kanan: true },
        cell: (c) => {
          const n = c.getValue();
          return n === null ? "—" : rupiah(n);
        },
      }),
      k.accessor((h) => h.serahTerima?.tunaiDiterima ?? null, {
        id: "diterima",
        header: "Diterima",
        meta: { kanan: true },
        cell: (c) => {
          const n = c.getValue();
          return n === null ? "—" : rupiah(n);
        },
      }),
      k.accessor((h) => h.serahTerima?.selisihSetor ?? null, {
        id: "selisih",
        header: "Selisih",
        meta: { kanan: true },
        cell: (c) => {
          const n = c.getValue();
          if (n === null || n === 0) return "—";
          return <span className={n < 0 ? "text-red-700" : "text-emerald-700"}>{rupiah(n)}</span>;
        },
      }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const h = c.row.original;
          if (!hariIniSaja || h.absensi !== "masuk_kerja") return null;
          return (
            <div className="flex justify-end gap-1">
              {h.serahTerima ? (
                <TombolSel label="Batal terima kas" bahaya onClick={() => setBatal(h)}>
                  <Undo2 />
                </TombolSel>
              ) : (
                <>
                  <TombolSel
                    label="Betulkan kas lapangan / uang jalan"
                    onClick={() => setBetulkan(h)}
                  >
                    <Pencil />
                  </TombolSel>
                  {h.laporanDibukaAt ? (
                    <>
                      <TombolSel
                        label="Batal laporan — buka lagi hari kolektor"
                        onClick={() => setBukaLagi(h)}
                      >
                        <RotateCcw />
                      </TombolSel>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTerima(h);
                        }}
                      >
                        <HandCoins />
                        Terima kas
                      </Button>
                    </>
                  ) : null}
                </>
              )}
            </div>
          );
        },
      }),
    ] as Kolom<HariKas>[];
  }, [hariIniSaja, kantor.zonaWaktu]);

  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  return (
    <>
      <TabelData
        kolom={kolom}
        data={q.data}
        idBaris={(h) => h.id}
        pilihBaris={(h) => h.serahTerima && setRinci(h)}
        kosong="Belum ada kolektor yang absen pada tanggal ini"
      />
      <p className="text-xs text-muted-foreground">
        Ketuk baris yang kasnya sudah diterima untuk melihat rincian tunai seharusnya.
      </p>
      {terima ? <DialogTerimaKas hari={terima} tutup={() => setTerima(null)} /> : null}
      {betulkan ? <DialogUbahHariIni hari={betulkan} tutup={() => setBetulkan(null)} /> : null}
      {bukaLagi ? (
        <DialogBatal
          judul={`Batal laporan ${bukaLagi.kolektor.nama}?`}
          keterangan="Hari kolektor dibuka lagi — ia bisa mencatat setoran, akad, dan libur hari ini (mis. nasabah libur datang membayar sore), lalu membuka laporan ulang."
          segarkan={KUNCI_HARIAN}
          tutup={() => setBukaLagi(null)}
          kirim={(alasan) =>
            ambil(() =>
              api.hariKolektor["hari-kolektor"][":kolektorId"].laporan.batal.$post({
                param: { kolektorId: bukaLagi.kolektor.id },
                json: { alasan },
              }),
            )
          }
        />
      ) : null}
      {rinci ? (
        <DialogFormulir
          judul={`Rincian kas ${rinci.kolektor.nama}`}
          buka
          ubahBuka={(b) => !b && setRinci(null)}
          kirim={() => setRinci(null)}
          memuat={false}
          labelKirim="Tutup"
        >
          <RincianKas hari={rinci} />
        </DialogFormulir>
      ) : null}
      {batal?.serahTerima ? (
        <DialogBatal
          judul={`Batal terima kas ${batal.kolektor.nama}?`}
          keterangan="Kas dianggap belum diterima; kasir menghitung ulang."
          segarkan={KUNCI_HARIAN}
          tutup={() => setBatal(null)}
          kirim={(alasan) =>
            ambil(() =>
              api.hariKolektor["serah-terima-kas"][":id"].batal.$post({
                param: { id: batal.serahTerima?.id ?? "" },
                json: { alasan },
              }),
            )
          }
        />
      ) : null}
    </>
  );
}
