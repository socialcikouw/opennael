import { tanggal as formatTanggal, rupiah, waktu } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { History, ListOrdered } from "lucide-react";
import { useState } from "react";
import { DialogRiwayat } from "@/fitur/aktivitas";
import { BarisNilai, GalatMuat, Memuat } from "@/komponen/halaman";
import { Button } from "@/komponen/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/komponen/ui/dialog";
import { ambil, api } from "@/lib/api";
import { useKantor } from "@/lib/kantor";
import { judulPinjaman } from "../inti";
import { AturanMacet } from "./aturan-macet";
import { DialogUbahNomor } from "./dialog-ubah-nomor";
import { GarisStatus } from "./garis-status";
import { LencanaStatus } from "./lencana-status";
import { LencanaTagih } from "./lencana-tagih";

const LABEL_ASAL = { baru: "Akad baru", gulung: "Gulung", migrasi: "Salinan buku lama" } as const;

export function DialogPinjaman({
  id,
  nasabahId,
  tutup,
}: {
  id: string;
  nasabahId: string;
  tutup: () => void;
}) {
  const kantor = useKantor();
  const [aksi, setAksi] = useState<"nomor" | "riwayat" | null>(null);
  const q = useQuery({
    queryKey: ["pinjaman", id],
    queryFn: () => ambil(() => api.pembiayaan.pinjaman[":id"].$get({ param: { id } })),
  });
  const p = q.data;
  return (
    <>
      <Dialog open onOpenChange={(b) => !b && tutup()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {p ? judulPinjaman(p) : "Pinjaman"}
              {p ? <LencanaStatus status={p.status} /> : null}
              {p ? <LencanaTagih p={p} /> : null}
            </DialogTitle>
            <DialogDescription>
              {p
                ? `${LABEL_ASAL[p.asal]} · dicairkan ${p.pencair.nama} · dipegang ${p.kolektor.nama}`
                : "Memuat rincian…"}
            </DialogDescription>
          </DialogHeader>
          {q.isPending ? (
            <Memuat />
          ) : q.isError || !p ? (
            <GalatMuat galat={q.error ?? new Error("Pinjaman tidak ditemukan")} />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {p.status !== "batal" ? (
                  <Button size="sm" variant="outline" onClick={() => setAksi("nomor")}>
                    <ListOrdered />
                    Ubah nomor
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => setAksi("riwayat")}>
                  <History />
                  Riwayat suntingan
                </Button>
              </div>
              <AturanMacet p={p} />
              <div className="grid gap-x-8 sm:grid-cols-2">
                <div className="divide-y">
                  <BarisNilai label="Tanggal akad">{formatTanggal(p.tanggalAkad)}</BarisNilai>
                  {p.tanggalDisalin ? (
                    <BarisNilai label="Disalin">{formatTanggal(p.tanggalDisalin)}</BarisNilai>
                  ) : null}
                  {p.jatuhTempo ? (
                    <BarisNilai label="Jatuh tempo">{formatTanggal(p.jatuhTempo)}</BarisNilai>
                  ) : null}
                  <BarisNilai label="Pokok">{rupiah(p.pokok)}</BarisNilai>
                  <BarisNilai label="Potongan admin">{rupiah(p.potonganAdmin)}</BarisNilai>
                  <BarisNilai label="Masuk tabungan">{rupiah(p.tabunganMasuk)}</BarisNilai>
                  {p.saldoLama > 0 ? (
                    <BarisNilai label="Saldo lama ditutup">{rupiah(p.saldoLama)}</BarisNilai>
                  ) : null}
                  <BarisNilai label="Tunai ke nasabah">{rupiah(p.pencairan)}</BarisNilai>
                </div>
                <div className="divide-y">
                  <BarisNilai label="Total kembali">{rupiah(p.totalKembali)}</BarisNilai>
                  <BarisNilai label={p.jenis === "tempoan" ? "Dibayar sekali" : "Angsuran"}>
                    {rupiah(p.angsuran)}
                  </BarisNilai>
                  <BarisNilai label="Saldo">{rupiah(p.saldo)}</BarisNilai>
                  {p.jenis !== "tempoan" ? (
                    <BarisNilai label="Angsuran lunas">
                      {p.angsuranKe} dari {p.tenor}
                    </BarisNilai>
                  ) : null}
                  {p.tanggalMacet ? (
                    <BarisNilai label="Macet sejak">{formatTanggal(p.tanggalMacet)}</BarisNilai>
                  ) : null}
                  {p.tanggalSelesai ? (
                    <BarisNilai label="Selesai">{formatTanggal(p.tanggalSelesai)}</BarisNilai>
                  ) : null}
                  {p.pemutihan ? (
                    <BarisNilai label="Diputihkan">
                      {waktu(p.pemutihan.at, kantor.zonaWaktu)}
                      {p.pemutihan.keterangan ? ` · ${p.pemutihan.keterangan}` : ""}
                    </BarisNilai>
                  ) : null}
                  {p.batal ? (
                    <BarisNilai label="Dibatalkan">
                      {waktu(p.batal.at, kantor.zonaWaktu)} · {p.batal.alasan}
                    </BarisNilai>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Perjalanan status</p>
                <GarisStatus id={p.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {aksi === "nomor" && p ? (
        <DialogUbahNomor p={p} nasabahId={nasabahId} tutup={() => setAksi(null)} />
      ) : null}
      {aksi === "riwayat" && p ? (
        <DialogRiwayat
          tabel="pinjaman"
          barisId={p.id}
          judul={`Riwayat suntingan ${judulPinjaman(p).toLowerCase()}`}
          tutup={() => setAksi(null)}
        />
      ) : null}
    </>
  );
}
