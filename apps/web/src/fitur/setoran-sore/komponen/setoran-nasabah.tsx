import { LABEL_JENIS_TRANSAKSI, rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DialogBatal } from "@/komponen/dialog-batal";
import { PilihanAsli } from "@/komponen/formulir";
import { GalatMuat, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { ambil, api } from "@/lib/api";
import { ambilTransaksi, KUNCI_HARIAN, type Transaksi } from "../data";
import { DialogTransfer } from "./dialog-transfer";
import { TombolSel } from "./tombol-sel";

export function SetoranNasabah({
  tanggal,
  hariIni,
  kolektor,
}: {
  tanggal: string;
  hariIni: string;
  kolektor: { id: string; nama: string }[];
}) {
  const [kolektorId, setKolektorId] = useState("");
  const [transfer, setTransfer] = useState<Transaksi | null>(null);
  const [batal, setBatal] = useState<Transaksi | null>(null);
  const q = useQuery({
    queryKey: ["harian", "transaksi", tanggal, kolektorId],
    queryFn: () => ambilTransaksi(tanggal, kolektorId || undefined),
  });
  const hariIniSaja = tanggal === hariIni;

  const kolom = useMemo(() => {
    const k = pembantuKolom<Transaksi>();
    const uang = (id: keyof Transaksi & string, header: string) =>
      k.accessor((t) => t[id] as number, {
        id,
        header,
        meta: { kanan: true },
        cell: (c) => (c.getValue() ? rupiah(c.getValue()) : "—"),
        footer: (c) =>
          rupiah(c.table.getRowModel().rows.reduce((s, r) => s + (r.original[id] as number), 0)),
      });
    return [
      k.accessor((t) => t.nasabah.nama, {
        id: "nasabah",
        header: "Nasabah",
        cell: (c) => <span className="font-medium">{c.getValue()}</span>,
        footer: (c) => `${c.table.getRowModel().rows.length} setoran`,
      }),
      k.accessor("jenis", { header: "Jenis", cell: (c) => LABEL_JENIS_TRANSAKSI[c.getValue()] }),
      uang("setoranMurni", "Murni"),
      uang("setoranPelunasan", "Pelunasan"),
      uang("tabunganKeluar", "Tabungan keluar"),
      uang("storting", "Storting"),
      k.accessor((t) => t.transfer?.nominal ?? 0, {
        id: "transfer",
        header: "Transfer",
        meta: { kanan: true },
        cell: (c) => (c.getValue() ? rupiah(c.getValue()) : "—"),
      }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const t = c.row.original;
          if (!hariIniSaja) return null;
          return (
            <div className="flex justify-end gap-1">
              {t.batasTransfer > 0 && !t.transfer ? (
                <TombolSel label="Catat transfer" onClick={() => setTransfer(t)}>
                  <ArrowLeftRight />
                </TombolSel>
              ) : null}
              <TombolSel label="Batalkan setoran" bahaya onClick={() => setBatal(t)}>
                <Undo2 />
              </TombolSel>
            </div>
          );
        },
      }),
    ] as Kolom<Transaksi>[];
  }, [hariIniSaja]);

  return (
    <>
      <PilihanAsli
        className="w-56"
        aria-label="Saring kolektor"
        value={kolektorId}
        onChange={(e) => setKolektorId(e.target.value)}
      >
        <option value="">Semua kolektor</option>
        {kolektor.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nama}
          </option>
        ))}
      </PilihanAsli>
      {q.isPending ? (
        <Memuat />
      ) : q.isError ? (
        <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />
      ) : (
        <TabelData kolom={kolom} data={q.data} idBaris={(t) => t.id} kosong="Belum ada setoran" />
      )}
      {transfer ? <DialogTransfer t={transfer} tutup={() => setTransfer(null)} /> : null}
      {batal ? (
        <DialogBatal
          judul={`Batalkan setoran ${batal.nasabah.nama}?`}
          keterangan={`${LABEL_JENIS_TRANSAKSI[batal.jenis]} ${rupiah(batal.storting)}. Pinjaman kembali seperti sebelum setoran; gulung ikut membatalkan pinjaman penerusnya; transfer yang menempel ikut batal. Hanya sebelum kas kolektornya diterima.`}
          segarkan={KUNCI_HARIAN.concat([["nasabah"]])}
          tutup={() => setBatal(null)}
          kirim={(alasan) =>
            ambil(() =>
              api.pembiayaan.transaksi[":id"].batal.$post({
                param: { id: batal.id },
                json: { alasan },
              }),
            )
          }
        />
      ) : null}
    </>
  );
}
